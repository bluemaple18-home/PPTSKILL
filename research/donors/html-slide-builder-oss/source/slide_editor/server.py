#!/usr/bin/env python3
"""server.py — 投影片視覺編輯器的本機伺服器。

  python3 -m slide_editor.server <slides_dir> [--port 8765]

**投影片 HTML 本身就是真相。** 編輯器直接寫回 slides_dir 裡的檔案，
沒有 deck_copy.py 回寫，也沒有 overrides.json 側車。

theme_*.py 從此只負責「產生一份新的 deck」。對已經編輯過的 deck 重跑
theme 會蓋掉你的編輯 —— 產生新樣式請輸出到新的 slides-<name>/ 目錄。

為什麼這樣改：舊架構是 deck_copy.py → theme_*.py → slides-*/，編輯器改的是
最右邊、寫的卻是最左邊，中間那層要重跑才看得到結果。改文字後畫面不會更新、
必須手動重跑 theme，就是這個結構造成的。現在只有一層，存檔即所見。

安全網：第一次改動某一頁時，會把原檔複製到 <deck>/.editor-backup/<slides_dir>/。
decks/ 沒有進版控，所以這是唯一的還原點。
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import re
import os
import shutil
import subprocess
import urllib.error
import urllib.request
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from . import overrides as ovr

STATIC = Path(__file__).parent / "static"

# Vanta 需要的檔案在第一次啟用某個效果時才下載，跟 build_deck.py 的 ensure_font()
# 同一個做法 —— three.js 604KB、p5.js 796KB，不適合放進版控。
# 下載到 <slides_dir>/lib/，slide 用相對路徑 lib/… 引用，編輯器與打包都吃得到。
VANTA_P5 = {"topology", "trunk"}          # 這兩個用 p5.js，其餘 12 個用 three.js
VANTA_SRC = {
    "three.min.js": "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js",
    "p5.min.js": "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.1.9/p5.min.js",
    "noise.png": "https://www.vantajs.com/gallery/noise.png",   # CLOUDS2 專用貼圖
}
VANTA_EFFECT_URL = "https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.{0}.min.js"
VANTA_EFFECTS = ("waves", "birds", "net", "globe", "dots", "fog", "clouds", "clouds2",
                 "cells", "ripple", "rings", "halo", "topology", "trunk")
REPO = Path(__file__).resolve().parent.parent      # build_deck.py 在這裡



# ---------------------------------------------------------------- LLM demo
# 07 那一頁的 live 示範要真的打一次 count_tokens。金鑰只留在伺服器端：瀏覽器
# 只會拿到 token 數字，打包後的單一檔案裡也不會有金鑰（打包時走錄製值）。
def anthropic_key() -> str | None:
    """env → <repo>/.anthropic-key → ~/.anthropic-key，第一個找到的為準。"""
    k = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if k:
        return k
    for p in (Path(__file__).resolve().parent.parent / ".anthropic-key",
              Path.home() / ".anthropic-key"):
        try:
            k = p.read_text(encoding="utf-8").strip()
            if k:
                return k
        except OSError:
            pass
    return None


def count_tokens(question: str):
    """回傳 (只有問題, 問題+說明書)。任何錯誤都往上丟，由呼叫端轉成訊息。"""
    from . import demo_manual as dm
    key = anthropic_key()
    if not key:
        raise RuntimeError("找不到金鑰：設 ANTHROPIC_API_KEY 或放一個 .anthropic-key")

    def ask(payload):
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages/count_tokens",
            data=json.dumps(payload).encode("utf-8"),
            headers={"x-api-key": key, "anthropic-version": "2023-06-01",
                     "content-type": "application/json"})
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read())["input_tokens"]

    msgs = [{"role": "user", "content": question}]
    bare = ask({"model": dm.MODEL, "messages": msgs})
    full = ask({"model": dm.MODEL, "system": dm.SYSTEM, "tools": dm.TOOLS,
                "messages": msgs})

    # 說明書的組成（system 各佔多少、tools 各佔多少）只跟說明書本身有關，跟使用者
    # 問什麼無關 —— 所以只量一次就好，之後每次示範都重用，不要多打兩次 API。
    global _BREAKDOWN
    if _BREAKDOWN is None:
        base = ask({"model": dm.MODEL, "messages": [{"role": "user", "content": "."}]})
        s = ask({"model": dm.MODEL, "system": dm.SYSTEM,
                 "messages": [{"role": "user", "content": "."}]}) - base
        tl = ask({"model": dm.MODEL, "tools": dm.TOOLS,
                  "messages": [{"role": "user", "content": "."}]}) - base
        _BREAKDOWN = {"system": s, "tools": tl,
                      "tool_names": [x["name"] for x in dm.TOOLS]}
    return bare, full, _BREAKDOWN


_BREAKDOWN = None



def _insert_name(prev, existing):
    """在 prev 之後插入一頁要叫什麼名字。

    重點是**不重新編號**。檔名前綴決定排序，而 '-'(0x2D) 排在 'a'(0x61) 之前、
    數字又照大小排，所以 "03-心態" < "03a-新頁" < "04-乘法" —— 插中間只要加一個
    字母後綴，後面每一頁的檔名都不用動。動了的話，每一頁的 .editor-backup 與存在
    sessionStorage 的還原紀錄會一起失效，兩者都是以檔名為鍵。
    """
    if prev is None:
        base = "00"                                   # 插在最前面
    else:
        m = re.match(r"(\d+[a-z]*)", prev)
        base = m.group(1) if m else "00"
    taken = set(existing)
    for sfx in "abcdefghijklmnopqrstuvwxyz":
        name = f"{base}{sfx}-新頁.html"
        if name not in taken:
            return name
    n = 1
    while f"{base}z{n}-新頁.html" in taken:
        n += 1
    return f"{base}z{n}-新頁.html"


class Ctx:
    slides_dir: Path | None = None
    root: Path                       # 檔案挑選器只能瀏覽這底下
    assets_dir: Path
    backup_dir: Path
    legacy_path: Path | None = None   # 舊的 overrides.json，遷移完就改名
    legacy: dict | None = None
    backed_up: set

    @classmethod
    def open_deck(cls, slides_dir: Path):
        """切換到另一個 slides 目錄。所有衍生路徑都要跟著換，否則會把備份寫到
        上一個 deck、或把圖片存到別人的 assets 裡。"""
        cls.slides_dir = slides_dir.resolve()
        deck = cls.slides_dir.parent
        cls.assets_dir = deck / "assets"
        cls.backup_dir = deck / ".editor-backup" / cls.slides_dir.name
        cls.backed_up = set()
        cls.legacy_path = cls.legacy = None
        legacy = deck / "overrides.json"
        if legacy.exists():
            data = ovr.load(legacy)
            if any(e.get("patches") or e.get("inserts")
                   for e in data.get("slides", {}).values()):
                cls.legacy_path, cls.legacy = legacy, data

    @classmethod
    def inside_root(cls, path: Path) -> bool:
        try:
            path.resolve().relative_to(cls.root)
            return True
        except ValueError:
            return False

    @classmethod
    def slides(cls):
        if not cls.slides_dir:
            return []
        return sorted(p.name for p in cls.slides_dir.glob("*.html"))

    @classmethod
    def stamp(cls):
        """給前端輪詢用。只看 slide 檔 —— 現在只有這一個真相來源。

        自己存檔也會讓 mtime 前進，所以 /api/save 會把新的 stamp 回給前端，
        前端直接採用，輪詢就不會把自己的存檔誤判成外部改動而重新載入。
        （舊版沒有這層，存檔後的自動重載會把剛打好的字換回舊的。）
        """
        newest = 0.0
        if not cls.slides_dir:
            return 0.0
        for p in cls.slides_dir.glob("*.html"):
            newest = max(newest, p.stat().st_mtime)
        return round(newest, 3)

    @classmethod
    def edited(cls):
        """哪幾頁動過 —— 左欄的小圓點。

        兩個來源取聯集：`data-ed` 只有幾何調整才會留下，純改文字不會留下任何
        標記；而 .editor-backup/ 裡有備份就代表這一頁被寫入過（不分本次或以前）。
        只看 data-ed 的話，改過文字的頁面不會亮點，會讓人以為沒存到。
        """
        out = set()
        if not cls.slides_dir:
            return []
        if cls.backup_dir.is_dir():
            out |= {f.name for f in cls.backup_dir.glob("*.html")}
        for p in cls.slides_dir.glob("*.html"):
            try:
                if "data-ed=" in p.read_text(encoding="utf-8"):
                    out.add(p.name)
            except OSError:
                pass
        return sorted(out)

    @classmethod
    def backup_once(cls, name: str, path: Path):
        """每頁在本次執行中第一次被寫入前，留一份原檔。"""
        if name in cls.backed_up or not path.exists():
            return
        cls.backup_dir.mkdir(parents=True, exist_ok=True)
        dest = cls.backup_dir / name
        if not dest.exists():
            shutil.copy2(path, dest)
        cls.backed_up.add(name)

    @classmethod
    def legacy_entry(cls, name: str):
        """這一頁還有沒有沒遷移的舊 overrides。"""
        if not cls.legacy:
            return None
        e = cls.legacy.get("slides", {}).get(name)
        if not e or (not e.get("patches") and not e.get("inserts")):
            return None
        return e

    @classmethod
    def drop_legacy(cls, name: str):
        """某頁遷移完就把它從舊檔移除；全部清空後把舊檔改名封存。"""
        if not cls.legacy:
            return
        cls.legacy.get("slides", {}).pop(name, None)
        remaining = any(
            e.get("patches") or e.get("inserts")
            for e in cls.legacy.get("slides", {}).values())
        if remaining:
            ovr.save(cls.legacy_path, cls.legacy)
            return
        cls.legacy = None
        if cls.legacy_path and cls.legacy_path.exists():
            cls.legacy_path.rename(cls.legacy_path.with_suffix(".json.migrated"))
            print(f"  overrides.json 已全部併入 slide HTML，封存為 "
                  f"{cls.legacy_path.name}.migrated")


def fetch_to(url: str, dest: Path) -> None:
    """用 curl 抓檔（跟 build_deck.py 一致，不引入新依賴）。"""
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.parent / (dest.name + ".part")
    r = subprocess.run(["curl", "-sSL", "--retry", "2", "-o", str(tmp), url],
                       capture_output=True, text=True, timeout=120)
    if r.returncode != 0 or not tmp.exists() or tmp.stat().st_size == 0:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"下載失敗 {url}：{(r.stderr or '').strip()[:200]}")
    tmp.replace(dest)


def atomic_write(path: Path, text: str) -> None:
    """同目錄暫存檔 + rename。中途失敗不會留下半個檔案。"""
    tmp = path.parent / (path.name + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    # ------------------------------------------------------------------ util
    def _send(self, code, body: bytes, ctype="application/json; charset=utf-8"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, code=200):
        self._send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"))

    def _body(self):
        n = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(n) or b"{}")

    def _slide_path(self, name: str):
        """只允許 slides_dir 底下的 .html，擋掉 ../ 之類的路徑穿越。"""
        if not Ctx.slides_dir:
            return None
        if not name.endswith(".html") or "/" in name or "\\" in name:
            return None
        f = (Ctx.slides_dir / name).resolve()
        if f.parent != Ctx.slides_dir or not f.is_file():
            return None
        return f

    def _send_slide_asset(self, rel: str):
        """供應 slides_dir 底下的任意檔案，擋掉往外跳的路徑。"""
        if not Ctx.slides_dir or not rel:
            return self._json({"error": "not found"}, 404)
        try:
            f = (Ctx.slides_dir / rel).resolve()
            f.relative_to(Ctx.slides_dir)          # 不在 slides_dir 底下就丟 ValueError
        except (ValueError, OSError):
            return self._json({"error": "not found"}, 404)
        if not f.is_file():
            return self._json({"error": "not found"}, 404)
        ctype = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
        return self._send(200, f.read_bytes(), ctype)

    # ------------------------------------------------------------------- GET
    def do_GET(self):
        path = unquote(urlparse(self.path).path)

        if path == "/":
            return self._send(200, (STATIC / "editor.html").read_bytes(),
                              "text/html; charset=utf-8")

        if path == "/api/state":
            return self._json({
                "slides": Ctx.slides(),
                "edited": Ctx.edited(),
                "stamp": Ctx.stamp(),
                "slidesDir": str(Ctx.slides_dir) if Ctx.slides_dir else None,
                "deck": Ctx.slides_dir.name if Ctx.slides_dir else None,
                "deckPath": str(Ctx.slides_dir.parent) if Ctx.slides_dir else None,
                "root": str(Ctx.root),
            })

        if path == "/api/browse":
            q = parse_qs(urlparse(self.path).query)
            raw = unquote(q.get("path", [str(Ctx.root)])[0])
            here = Path(raw).resolve()
            if not Ctx.inside_root(here) or not here.is_dir():
                here = Ctx.root
            entries = []
            for d in sorted(here.iterdir()):
                if not d.is_dir() or d.name.startswith("."):
                    continue
                # out/ 是 build_deck.py 的產出（打包好的單一檔案），不是可編輯的
                # slides 目錄。不濾掉的話它會被當成「1 頁的 deck」而被點開。
                if d.name == "out":
                    continue
                n_html = len(list(d.glob("*.html")))
                entries.append({"name": d.name, "path": str(d),
                                "slides": n_html, "isDeck": n_html > 0})
            parent = str(here.parent) if Ctx.inside_root(here.parent) and here != Ctx.root else None
            return self._json({"path": str(here), "parent": parent, "entries": entries})

        if path == "/api/stamp":
            return self._json({"stamp": Ctx.stamp()})

        if path.startswith("/slide/"):
            rel = path[len("/slide/"):]
            f = self._slide_path(rel)
            if not f:
                # slide 旁邊的檔案（lib/three.min.js、貼圖、shader…）。投影片是從
                # /slide/xxx.html 供應的，所以裡面的相對路徑會落在 /slide/ 底下，
                # 這裡就得把 slides_dir 當靜態根目錄供應，否則 <script src="lib/…">
                # 在編輯器裡一定 404 —— 打包後能跑、編輯時卻空白。
                return self._send_slide_asset(rel)
            html = f.read_text(encoding="utf-8")
            # 舊 deck：把 overrides.json 套進來，讓前端把它就地內聯後存回檔案。
            # 只會發生一次；存檔後這一頁的舊資料就被移除。
            entry = Ctx.legacy_entry(f.name)
            if entry:
                html = ovr.apply_to_html(html, entry, asset_prefix="../assets/")
            self.send_response(200)
            body = html.encode("utf-8")
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Slide-Mtime", str(round(f.stat().st_mtime, 3)))
            self.end_headers()
            self.wfile.write(body)
            return

        if path.startswith("/assets/"):
            name = path[len("/assets/"):]
            if "/" in name or "\\" in name:
                return self._json({"error": "not found"}, 404)
            f = Ctx.assets_dir / name
            if not f.is_file():
                return self._json({"error": "not found"}, 404)
            ctype = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
            return self._send(200, f.read_bytes(), ctype)

        return self._json({"error": "not found"}, 404)

    # ------------------------------------------------------------------ POST
    def do_POST(self):
        path = unquote(urlparse(self.path).path)
        try:
            if path == "/api/save":
                b = self._body()
                name = b.get("slide", "")
                f = self._slide_path(name)
                if not f:
                    return self._json({"ok": False, "error": f"找不到 {name}"}, 404)
                html = b.get("html", "")
                if not html.strip().lower().startswith("<!doctype"):
                    return self._json({"ok": False,
                                       "error": "存檔內容不是完整的 HTML 文件，已拒絕"}, 400)
                # 衝突檢查：前端存檔時附上它載入這一頁時看到的 mtime。對不上
                # 就代表檔案在這期間被別人動過（另一個分頁、編輯器外的修改、
                # 重跑 theme），這時候寫下去會把對方的修改整個蓋掉。
                # base 是必填。沒帶的話代表那個分頁跑的是舊版 editor.html —— 而
                # 「開很久沒重新載入的分頁」正是最會拿過期內容覆蓋檔案的那一種，
                # 給它豁免等於把這道防線開在最需要的地方。
                base = b.get("base")
                now = round(f.stat().st_mtime, 3)
                if base is None or abs(now - float(base)) > 0.002:
                    return self._json({"ok": False, "conflict": True, "mtime": now,
                                       "error": "這一頁已被外部修改，或這個分頁是舊版；"
                                                "請重新載入頁面再編輯"}, 409)
                Ctx.backup_once(name, f)
                atomic_write(f, html)
                Ctx.drop_legacy(name)
                # 回傳新的 stamp 與這一頁的 mtime，前端拿去當下一次存檔的基準
                return self._json({"ok": True, "stamp": Ctx.stamp(),
                                   "mtime": round(f.stat().st_mtime, 3)})

            if path == "/api/open":
                b = self._body()
                d = Path(b.get("path", "")).resolve()
                if not Ctx.inside_root(d) or not d.is_dir():
                    return self._json({"ok": False, "error": "不在允許的目錄範圍內"}, 400)
                if not list(d.glob("*.html")):
                    return self._json({"ok": False, "error": f"{d.name} 裡沒有 .html"}, 400)
                Ctx.open_deck(d)
                return self._json({"ok": True, "slides": Ctx.slides(),
                                   "edited": Ctx.edited(), "stamp": Ctx.stamp(),
                                   "deck": Ctx.slides_dir.name,
                                   "deckPath": str(Ctx.slides_dir.parent)})

            if path == "/api/delete":
                # 刪頁一律是「搬到 .trash/」，不是真的刪掉。decks/ 不進版控，
                # 而 .editor-backup/ 存的是「第一次編輯之前」的版本 —— 拿它復原
                # 等於把這一頁的所有編輯一起丟掉。所以這裡搬的是當下的檔案。
                b = self._body()
                name = b.get("slide", "")
                f = self._slide_path(name)
                if not f or not f.exists():
                    return self._json({"ok": False, "error": "找不到這一頁"}, 404)
                if len(Ctx.slides()) <= 1:
                    return self._json({"ok": False, "error": "這是最後一頁，不能刪"}, 400)
                trash = Ctx.slides_dir.parent / ".trash" / Ctx.slides_dir.name
                trash.mkdir(parents=True, exist_ok=True)
                dest = trash / f"{int(time.time()*1000)}-{name}"
                shutil.move(str(f), str(dest))
                return self._json({"ok": True, "slides": Ctx.slides(),
                                   "edited": Ctx.edited(), "stamp": Ctx.stamp(),
                                   "trash": dest.name})

            if path == "/api/restore":
                b = self._body()
                tn = b.get("trash", "")
                trash = Ctx.slides_dir.parent / ".trash" / Ctx.slides_dir.name
                src = (trash / tn).resolve()
                # 只准從這個 deck 的 .trash 復原，路徑不能往外跑
                if trash.resolve() not in src.parents or not src.is_file():
                    return self._json({"ok": False, "error": "找不到可復原的檔案"}, 404)
                name = tn.split("-", 1)[1] if "-" in tn else tn
                dest = Ctx.slides_dir / name
                if dest.exists():
                    return self._json({"ok": False, "error": f"{name} 已經存在"}, 409)
                shutil.move(str(src), str(dest))
                return self._json({"ok": True, "slides": Ctx.slides(),
                                   "edited": Ctx.edited(), "stamp": Ctx.stamp(),
                                   "slide": name})

            if path == "/api/count_tokens":
                b = self._body()
                q = (b.get("question") or "").strip()[:400]
                if not q:
                    return self._json({"ok": False, "error": "請先輸入一句話"}, 400)
                try:
                    bare, full, br = count_tokens(q)
                except urllib.error.HTTPError as e:
                    # 只回狀態碼與 API 的訊息，絕對不要把金鑰或請求內容帶出去
                    return self._json({"ok": False,
                                       "error": f"API 回應 {e.code}"}, 502)
                except Exception as e:                       # noqa: BLE001
                    return self._json({"ok": False, "error": str(e)[:120]}, 502)
                from . import demo_manual as dm
                return self._json({"ok": True, "bare": bare, "manual": full - bare,
                                   "full": full, "model": dm.MODEL,
                                   "sys_tokens": br["system"],
                                   "tool_tokens": br["tools"],
                                   "tool_names": br["tool_names"],
                                   "usd_per_mtok": dm.INPUT_USD_PER_MTOK,
                                   "cache_ratio": dm.CACHE_READ_RATIO})

            if path == "/api/insert":
                # 新頁是「複製指定的那一頁」。主題 CSS 內嵌在每一個檔案裡，憑空生
                # 一頁空白的等於沒有主題可用 —— 複製一份再改才是能用的做法。
                b = self._body()
                after = b.get("after")
                slides = Ctx.slides()
                if not slides:
                    return self._json({"ok": False, "error": "還沒開啟任何 deck"}, 400)
                src_name = after if after in slides else slides[0]
                src = self._slide_path(src_name)
                if not src:
                    return self._json({"ok": False, "error": "找不到來源頁"}, 404)
                name = _insert_name(after if after in slides else None, slides)
                dest = Ctx.slides_dir / name
                if dest.exists():
                    return self._json({"ok": False, "error": f"{name} 已存在"}, 409)
                shutil.copy2(src, dest)
                return self._json({"ok": True, "slides": Ctx.slides(),
                                   "edited": Ctx.edited(), "stamp": Ctx.stamp(),
                                   "slide": name, "from": src_name})

            if path == "/api/renumber":
                # 頁碼寫死在每一頁的 footer，插入或刪除之後就對不上。只改 footer 的
                # 那段文字，檔名一律不動（理由同 _insert_name）。
                slides = Ctx.slides()
                total = len(slides)
                changed = []
                for i, n in enumerate(slides, 1):
                    f = self._slide_path(n)
                    if not f:
                        continue
                    s = f.read_text(encoding="utf-8")
                    m = re.search(r'(<span class="footer-page">)([^<]*)(</span>)', s)
                    if not m or m.group(2).strip() == f"{i:02d} / {total:02d}":
                        continue
                    Ctx.backup_once(n, f)              # 沿用既有的安全網
                    f.write_text(s[:m.start(2)] + f"{i:02d} / {total:02d}" + s[m.end(2):],
                                 encoding="utf-8")
                    changed.append(n)
                return self._json({"ok": True, "changed": len(changed), "total": total,
                                   "stamp": Ctx.stamp(), "slides": slides,
                                   "edited": Ctx.edited()})

            if path == "/api/rename":
                # 改名與換順序都走這裡。**備份一定要跟著搬** —— .editor-backup/ 是
                # 以檔名為鍵的，不搬的話那一頁的唯一還原點就對不上了，而且會在下一次
                # 存檔時被當成「沒備份過」而重新備份成已經編輯過的版本。
                b = self._body()
                old, new = b.get("from", ""), b.get("to", "")
                if (not new.endswith(".html") or "/" in new or "\\" in new
                        or new.startswith(".") or len(new) > 120):
                    return self._json({"ok": False, "error": "檔名不合法"}, 400)
                src = self._slide_path(old)
                if not src:
                    return self._json({"ok": False, "error": "找不到這一頁"}, 404)
                dst = Ctx.slides_dir / new
                if dst.exists():
                    return self._json({"ok": False, "error": f"{new} 已存在"}, 409)
                shutil.move(str(src), str(dst))
                bsrc = Ctx.backup_dir / old
                if bsrc.exists():
                    shutil.move(str(bsrc), str(Ctx.backup_dir / new))
                Ctx.backed_up.discard(old)
                return self._json({"ok": True, "slides": Ctx.slides(),
                                   "edited": Ctx.edited(), "stamp": Ctx.stamp(),
                                   "slide": new, "from": old})

            if path == "/api/move":
                # 換順序：只改**被搬動的那一頁**的前綴，讓它落進目標空隙。跟插入同一
                # 招，所以其他每一頁的檔名都不動，備份與還原紀錄也都不會斷。
                b = self._body()
                name, after = b.get("slide", ""), b.get("after")
                slides = Ctx.slides()
                if name not in slides:
                    return self._json({"ok": False, "error": "找不到這一頁"}, 404)
                rest = [s for s in slides if s != name]
                if after is not None and after not in rest:
                    return self._json({"ok": False, "error": "目標位置不存在"}, 400)
                title = re.sub(r"^\d+[a-z]*-?", "", name) or "新頁.html"
                new = _insert_name(after, slides).replace("新頁.html", title)
                if new == name:
                    return self._json({"ok": True, "slides": slides, "moved": False,
                                       "edited": Ctx.edited(), "stamp": Ctx.stamp(),
                                       "slide": name, "from": name})
                src, dst = Ctx.slides_dir / name, Ctx.slides_dir / new
                if dst.exists():
                    return self._json({"ok": False, "error": f"{new} 已存在"}, 409)
                shutil.move(str(src), str(dst))
                bsrc = Ctx.backup_dir / name
                if bsrc.exists():
                    shutil.move(str(bsrc), str(Ctx.backup_dir / new))
                Ctx.backed_up.discard(name)
                return self._json({"ok": True, "slides": Ctx.slides(), "moved": True,
                                   "edited": Ctx.edited(), "stamp": Ctx.stamp(),
                                   "slide": new, "from": name})

            if path == "/api/export":
                if not Ctx.slides_dir:
                    return self._json({"ok": False, "error": "還沒開啟任何 deck"}, 400)
                b = self._body()
                font = b.get("font", "serif")
                nav = b.get("nav", "scroll")
                if font not in ("wenkai", "serif", "none") or nav not in ("scroll", "buttons"):
                    return self._json({"ok": False, "error": "參數不合法"}, 400)
                out = Ctx.slides_dir.parent / "out" / f"{Ctx.slides_dir.name}.html"
                out.parent.mkdir(parents=True, exist_ok=True)
                # build_deck.py 會做字體子集化，大 deck 要跑幾秒，所以給寬一點的 timeout
                r = subprocess.run(
                    [sys.executable, str(REPO / "build_deck.py"), str(Ctx.slides_dir),
                     "-o", str(out), "--font", font, "--nav", nav,
                     "--title", Ctx.slides_dir.parent.name],
                    capture_output=True, text=True, timeout=300)
                if r.returncode != 0:
                    # build_deck 把錯誤寫在 stderr，訊息原樣帶回前端，不要吞掉
                    return self._json({"ok": False,
                                       "error": (r.stderr or r.stdout or "").strip()[-500:]}, 500)
                return self._json({"ok": True, "output": str(out),
                                   "kb": out.stat().st_size // 1024,
                                   "log": (r.stdout or "").strip()})

            if path == "/api/vanta":
                # 確保這個效果需要的檔案都在 <slides_dir>/lib/，回報要引用哪些
                b = self._body()
                eff = b.get("effect", "")
                if eff not in VANTA_EFFECTS:
                    return self._json({"ok": False, "error": f"沒有這個效果：{eff}"}, 400)
                if not Ctx.slides_dir:
                    return self._json({"ok": False, "error": "還沒開啟任何 deck"}, 400)
                lib = Ctx.slides_dir / "lib"
                base = "p5.min.js" if eff in VANTA_P5 else "three.min.js"
                need = [base, f"vanta.{eff}.min.js"]
                if eff == "clouds2":
                    need.append("noise.png")
                got = []
                try:
                    for f in need:
                        dest = lib / f
                        if dest.exists() and dest.stat().st_size > 0:
                            continue
                        url = VANTA_SRC.get(f) or VANTA_EFFECT_URL.format(eff)
                        fetch_to(url, dest)
                        got.append(f)
                except Exception as e:  # noqa: BLE001
                    return self._json({"ok": False, "error": str(e)}, 502)
                return self._json({"ok": True, "base": base,
                                   "effectFile": f"vanta.{eff}.min.js",
                                   "downloaded": got,
                                   "needsTexture": eff == "clouds2"})

            if path == "/api/upload":
                b = self._body()
                Ctx.assets_dir.mkdir(parents=True, exist_ok=True)
                name = re.sub(r"[^A-Za-z0-9._-]", "_", b.get("name", "asset"))
                name = f"{int(time.time())}_{name}"
                import base64
                raw = base64.b64decode(b["data"].split(",", 1)[-1])
                (Ctx.assets_dir / name).write_bytes(raw)
                return self._json({"ok": True, "src": name,
                                   "url": "/assets/" + name})

            return self._json({"error": "not found"}, 404)
        except Exception as e:  # noqa: BLE001 - dev server, surface it
            return self._json({"ok": False, "error": f"{type(e).__name__}: {e}"}, 500)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slides_dir", nargs="?", default=None,
                    help="省略的話用介面裡的檔案挑選器開啟")
    ap.add_argument("--root", default=None,
                    help="檔案挑選器可瀏覽的範圍；預設是 <slides_dir>/../..")
    ap.add_argument("--port", type=int, default=8765)
    a = ap.parse_args()

    slides = Path(a.slides_dir).resolve() if a.slides_dir else None
    if slides and not slides.is_dir():
        raise SystemExit(f"找不到 {slides}")

    if a.root:
        Ctx.root = Path(a.root).resolve()
    elif slides:
        Ctx.root = slides.parent.parent          # 例如 decks/
    else:
        Ctx.root = Path.cwd().resolve()
    if not Ctx.root.is_dir():
        raise SystemExit(f"找不到 --root {Ctx.root}")

    Ctx.backed_up = set()
    if slides:
        Ctx.open_deck(slides)
        print(f"slides    {Ctx.slides_dir}  ({len(Ctx.slides())} 頁)  ← 直接寫入")
        print(f"assets    {Ctx.assets_dir}")
        print(f"備份      {Ctx.backup_dir}")
        if Ctx.legacy:
            print("舊 overrides.json 會在各頁開啟時自動併入 HTML")
    else:
        print("沒有指定 slides 目錄 —— 用介面裡的「開啟」挑一個")
    print(f"可瀏覽範圍  {Ctx.root}")
    print(f"\n  http://localhost:{a.port}\n")
    ThreadingHTTPServer(("127.0.0.1", a.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
