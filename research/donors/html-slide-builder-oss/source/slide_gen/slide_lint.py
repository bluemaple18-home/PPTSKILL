#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""slide_lint.py — 檢查一份 deck 有沒有踩到那些「本機看起來正常」的坑。

    python3 slide_gen/slide_lint.py <slides_dir | *.html> [...] [--strict]

存在的理由：接下來寫 slide 的會是 LLM（Cowork 或 Claude Code），而這個專案
最貴的幾個 bug 都有同一個性質 —— **在做出它的那台機器上看不出來**。字體寫死
在本機是對的，換一台機器才掉字；class 名字掰錯只是沒有樣式，不會報錯。文件
只能「建議」，只有檢查能「擋」。

輸出 `檔案:行號  問題`。有 error 就 exit 1，所以 LLM 可以自己跑、自己讀、自己
修。warn 預設不影響 exit code（見下），加 --strict 才一起算。

它**不會**告訴你這頁醜不醜。CLAUDE.md 的工作守則寫得很清楚：圖表通過了所有
尺寸與結構斷言，同時標籤重疊、撞到分類名、掉出右邊界 —— 三個缺陷，驗證器一
個都看不到。這支工具負責機械性的沉默錯誤，讓你「看」的時候是在看設計。

── error 與 warn 的分界 ────────────────────────────────────────────
error 是「匯出或換一台機器會壞」：字體寫死、尺寸不對、外部網址、對話框、
字體角色不一致。warn 是「靜態上看起來可疑，但通常只是死碼」：目前只有沒有
對應規則的 class。分開的理由很實際 —— 現有 deck 本來就有幾個純語意的
marker class（`.cmp-no` 跟 `.cmp-yes` 配對，但 CSS 只定義了後者），把它算成
error 會讓一份完全正常的 deck 顯示失敗，然後 LLM 會跑去「修」沒壞的東西。

── 試過但拿掉的檢查（別再加回來，都在真實 deck 上炸開）──────────────
1. **主題 CSS 漂移**，兩種做法都不行：
     共用前綴長度比例   sakura-wabi 0.22 / vanta-demo 0.20 / mocha 1.00
     規則層級逐條比對   三份 deck 全部有 drift（.washi-grain 每頁不同、
                        .coda 因 list2 版型分支而不同）
   「每頁 CSS 有差異」在這個專案是正常且刻意的。只留下真正該一致的那一項：
   三個字體角色，見 check_font_roles。

2. **`<script>` 必須在 [data-live] 內**：對 vanta 那 14 頁全部誤報。真正的
   規則是「script **產生的節點**會被序列化寫回檔案」，不是 script 標籤本身放
   哪裡 —— 標籤是靜態節點，原樣寫回無害。vanta 的正確寫法就是 layer 掛
   data-live、而 `<script src>` 放在外面。要靜態判斷一段 JS 會生出什麼節點
   等於做 JS 靜態分析，超出範圍。這條靠 serializeDoc 的 data-live 還原與
   vantaApply 的 body.children diff 擋，不靠 lint。

3. **`data-live` 缺 `data-live-id`**：編輯器開檔時會自動補
   （editor.html:621），檢查工具自己會填的東西只是噪音。
"""
from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

# 只有這兩個 host 允許出現在 slide 裡。字體 @import 是現況：build_deck.py 匯出
# 時會改寫 --*-font 變數並內嵌 subset，所以它不影響單檔離線的承諾。其他任何
# 外部網址都會 —— 匯出後那台機器不一定有網路。
ALLOWED_HOSTS = ("fonts.googleapis.com", "fonts.gstatic.com")

# font-family 只允許 var(--…)，或純粹的通用關鍵字。理由見 check_font_family。
GENERIC_FAMILIES = {
    "inherit", "initial", "unset", "revert", "revert-layer",
    "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
    "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded",
    "math", "emoji", "fangsong", "none",
}

FONT_ROLES = ("--display-font", "--body-font", "--label-font")

# 編輯器自己寫進 slide 的 class，樣式由編輯器在執行期給，檔案裡沒有規則是正常的。
# editor.html:1096 與 1598 的 `el.className='ovr-ins'`，1364 的 'vanta-layer'。
EDITOR_CLASSES = {"ovr-ins", "vanta-layer"}

# 帶這些屬性的元素，其 class 不列入「沒有對應 CSS」的檢查：
# style= 是自己把樣式寫死在元素上，本來就不需要規則；data-ed / data-live 是
# 編輯器管理的元素。
SELF_MANAGED_ATTRS = ("style", "data-ed", "data-live")


class Problem:
    __slots__ = ("path", "line", "msg", "level")

    def __init__(self, path: Path, line: int, msg: str, level: str = "error"):
        self.path, self.line, self.msg, self.level = path, line, msg, level

    def __str__(self):
        tag = "" if self.level == "error" else "warn: "
        return f"{self.path}:{self.line}  {tag}{self.msg}"


def line_of(text: str, offset: int) -> int:
    """字元位移換行號。CSS 的檢查是對 <style> 內容做正規表示式，拿不到
    HTMLParser 的 getpos()，只好自己數。"""
    return text.count("\n", 0, offset) + 1


def styles_of(text: str) -> list[tuple[str, int]]:
    """回傳 [(css 內容, 該內容在檔案裡的起始位移)]。"""
    return [(m.group(1), m.start(1))
            for m in re.finditer(r"<style[^>]*>(.*?)</style>", text, re.S)]


class SlideParser(HTMLParser):
    """一次走訪收集標記層要看的東西。不重建文件，只讀標籤與屬性。"""

    def __init__(self):
        super().__init__()
        self.classes: list[tuple[str, int]] = []      # (class 名, 行號)
        self.inline_styles: list[tuple[str, int]] = []
        self.urls: list[tuple[str, int]] = []

    def handle_starttag(self, tag, attrs):
        line = self.getpos()[0]
        d = dict(attrs)
        self_managed = any(a in d for a in SELF_MANAGED_ATTRS)

        for name, val in attrs:
            if val is None:
                continue
            if name == "class" and not self_managed:
                for c in val.split():
                    self.classes.append((c, line))
            elif name == "style":
                self.inline_styles.append((val, line))
            if "://" in val:
                for m in re.finditer(r"https?://[^\s\"')]+", val):
                    self.urls.append((m.group(0), line))

    handle_startendtag = handle_starttag


# ── 各項檢查 ─────────────────────────────────────────────────────────

def check_font_family(path: Path, text: str, parser: SlideParser) -> list[Problem]:
    """build_deck.py:114 匯出時改寫的是 --display-font / --body-font /
    --label-font 這三個**變數**，它不碰元素上的 font-family。所以寫死一個字
    體名稱在本機看起來完全正確、匯出也不會報錯，卻會在沒裝那個字體的機器上
    掉光 CJK 字。這是整支 linter 最重要的一條。"""
    out = []
    for css, off in styles_of(text):
        for m in re.finditer(r"font-family\s*:\s*([^;}]+)", css):
            if not _family_ok(m.group(1)):
                out.append(Problem(
                    path, line_of(text, off + m.start()),
                    f"font-family 寫死字體：{m.group(1).strip()[:60]} —— "
                    f"只能用 var(--display-font / --body-font / --label-font)"))
    for val, line in parser.inline_styles:
        for m in re.finditer(r"font-family\s*:\s*([^;]+)", val):
            if not _family_ok(m.group(1)):
                out.append(Problem(
                    path, line,
                    f"style= 裡的 font-family 寫死字體：{m.group(1).strip()[:60]}"))
    return out


def _family_ok(value: str) -> bool:
    v = value.strip().lower()
    if "var(--" in v:
        return True
    parts = [p.strip().strip("'\"") for p in v.split(",")]
    return bool(parts) and all(p in GENERIC_FAMILIES for p in parts if p)


def check_classes(path: Path, text: str, parser: SlideParser) -> list[Problem]:
    """標記裡用到、但這一頁 CSS 完全沒提到的 class。

    LLM 最常見的失手是掰一個聽起來很合理的名字（.stat-highlight），CSS 裡沒
    有對應規則，畫面就是沒有樣式，而且不會有任何錯誤訊息。

    判定刻意放寬到底：只要 `.名字` 在這一頁 CSS 文字裡出現過就算「有定義」，
    不解析選擇器結構；帶 style= / data-ed / data-live 的元素整個跳過。寧可漏
    報也不要誤報 —— 會叫的狼沒人理。因此列為 warn 而非 error。"""
    css = " ".join(c for c, _ in styles_of(text))
    defined = set(re.findall(r"\.(-?[_a-zA-Z][\w-]*)", css))
    out, seen = [], set()
    for cls, line in parser.classes:
        if cls in defined or cls in EDITOR_CLASSES or cls in seen:
            continue
        seen.add(cls)
        out.append(Problem(path, line,
                           f'class "{cls}" 沒有任何對應的 CSS 規則', "warn"))
    return out


def check_geometry(path: Path, text: str) -> list[Problem]:
    """slide 尺寸固定 1280×720。"""
    flat = re.sub(r"\s+", "", " ".join(c for c, _ in styles_of(text)))
    out = []
    if "width:1280px" not in flat:
        out.append(Problem(path, 1, "找不到 width:1280px"))
    if "height:720px" not in flat:
        out.append(Problem(path, 1, "找不到 height:720px"))
    return out


def check_external(path: Path, text: str, parser: SlideParser) -> list[Problem]:
    """匯出後必須能離線開啟。build_deck.py 刻意不動外部 http(s) 的 script
    src（那是作者的選擇），所以這裡是唯一會擋下來的地方。"""
    out, seen = [], set()
    urls = list(parser.urls)
    for css, off in styles_of(text):
        for m in re.finditer(r"https?://[^\s\"')]+", css):
            urls.append((m.group(0), line_of(text, off + m.start())))
    for url, line in urls:
        if any(h in url for h in ALLOWED_HOSTS) or url in seen:
            continue
        seen.add(url)
        out.append(Problem(path, line, f"外部網址，匯出後離線會壞：{url[:70]}"))
    return out


def check_dialogs(path: Path, text: str) -> list[Problem]:
    """alert / confirm / prompt 會擋住用來測試編輯器的自動化 —— 一跳出來，
    整個 session 就沒反應了。"""
    return [Problem(path, line_of(text, m.start()),
                    f"{m.group(1)}() 會鎖住編輯器的自動化測試")
            for m in re.finditer(r"(?<![.\w])(alert|confirm|prompt)\s*\(", text)]


def check_font_roles(paths: list[Path], texts: dict[Path, str]) -> list[Problem]:
    """deck 級檢查：三個字體角色必須整份 deck 一致。

    這是唯一活下來的一致性檢查。量測顯示每頁 CSS 有差異是正常的（版型分支、
    手寫頁面各有各的裝飾），但字體角色不一樣就是真的壞掉 —— 匯出時只嵌入一
    套 subset，某幾頁角色不同就會拿到錯的字。三份現有 deck 都通過。"""
    out = []
    for role in FONT_ROLES:
        variants: dict[str, list[Path]] = {}
        for p in paths:
            css = " ".join(c for c, _ in styles_of(texts[p]))
            m = re.search(re.escape(role) + r"\s*:\s*([^;}]+)", css)
            if m:
                variants.setdefault(" ".join(m.group(1).split()), []).append(p)
        if len(variants) <= 1:
            continue
        ranked = sorted(variants.items(), key=lambda kv: len(kv[1]), reverse=True)
        # 沒有多數就不要亂指誰錯。兩頁各執一詞時，哪一頁是對的無法從檔案本身
        # 判斷 —— 硬選一個會把使用者送去改沒壞的那一頁。
        tied = len(ranked[0][1]) == len(ranked[1][1])
        blame = ranked if tied else ranked[1:]
        for val, files in blame:
            for p in files:
                out.append(Problem(
                    p, 1,
                    f"{role} 在 deck 內有 {len(variants)} 種值"
                    + ("，沒有多數可以參照" if tied else "，本頁是少數")
                    + f"（本頁：{val[:50]}）"))
    return out


# ── 進入點 ───────────────────────────────────────────────────────────

def lint_file(path: Path, text: str) -> list[Problem]:
    parser = SlideParser()
    try:
        parser.feed(text)
        parser.close()
    except Exception as e:                     # noqa: BLE001 — 壞掉的 HTML 就是要報
        return [Problem(path, 1, f"HTML 解析失敗：{e}")]
    return (check_font_family(path, text, parser)
            + check_classes(path, text, parser)
            + check_geometry(path, text)
            + check_external(path, text, parser)
            + check_dialogs(path, text))


def collect(args: list[str]) -> list[Path]:
    out: list[Path] = []
    for a in args:
        p = Path(a)
        if p.is_dir():
            out += sorted(p.glob("*.html"))
        elif p.is_file():
            out.append(p)
        else:
            print(f"找不到：{a}", file=sys.stderr)
            raise SystemExit(2)
    return out


def main(argv: list[str]) -> int:
    strict = "--strict" in argv
    paths = collect([a for a in argv if not a.startswith("--")])
    if not paths:
        print("用法：python3 slide_gen/slide_lint.py <slides_dir | *.html> "
              "[--strict]", file=sys.stderr)
        return 2

    texts = {p: p.read_text(encoding="utf-8") for p in paths}
    problems: list[Problem] = []
    for p in paths:
        problems += lint_file(p, texts[p])
    # 字體角色是整份 deck 的性質，只有一次檢查多頁時才有意義
    if len(paths) > 1:
        problems += check_font_roles(paths, texts)

    for prob in problems:
        print(prob)

    errors = [p for p in problems if p.level == "error"]
    warns = [p for p in problems if p.level == "warn"]
    if problems:
        print(f"\n{len(paths)} 頁：{len(errors)} error、{len(warns)} warn"
              f"{'（--strict：warn 也算失敗）' if strict else ''}")
    else:
        print(f"{len(paths)} 頁，沒有問題")
    return 1 if errors or (strict and warns) else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
