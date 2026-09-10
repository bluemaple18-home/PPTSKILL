#!/usr/bin/env python3
"""overrides.py — 幾何調整層（位置／縮放／旋轉／插入圖片影片）。

設計前提：`slides-*/` 是 theme_*.py 產生的，隨時會被覆蓋。所以編輯器
**永遠不寫進產生出來的 slide**，只寫這個獨立的 overrides.json：

    theme_*.py  ->  slides-*/          （產生物，唯讀）
    overrides.json                      （編輯器唯一會動的幾何來源）
    build_deck.py --overrides           （打包時才合成）

兩種條目：
  patches — 對 theme 已經畫出來的元素做位移／縮放／旋轉／改尺寸
  inserts — theme 裡根本不存在的新元素（圖片、影片、文字框）

patch 帶著 `base`（第一次選取時量到的 computed transform）。套用時輸出
`transform: <base> translate(...) rotate(...) scale(...)`，避免蓋掉 theme
自己的 translateY(-50%) 這類定位而讓元素亂跳。
"""
from __future__ import annotations

import json
from pathlib import Path

SCHEMA_VERSION = 1


def load(path: Path) -> dict:
    if not path.exists():
        return {"version": SCHEMA_VERSION, "slides": {}}
    d = json.loads(path.read_text(encoding="utf-8"))
    d.setdefault("version", SCHEMA_VERSION)
    d.setdefault("slides", {})
    return d


def save(path: Path, data: dict) -> None:
    data["version"] = SCHEMA_VERSION
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def slide_entry(data: dict, slide: str) -> dict:
    return data["slides"].setdefault(slide, {"patches": [], "inserts": []})


def upsert_patch(data: dict, slide: str, patch: dict) -> None:
    """同一個 selector 只留一筆。"""
    e = slide_entry(data, slide)
    e["patches"] = [p for p in e["patches"] if p.get("sel") != patch["sel"]]
    if _is_identity(patch):
        return  # 調回原位就把這筆刪掉，不要留下無意義的 override
    e["patches"].append(patch)


def upsert_insert(data: dict, slide: str, ins: dict) -> None:
    e = slide_entry(data, slide)
    e["inserts"] = [i for i in e["inserts"] if i.get("id") != ins["id"]]
    e["inserts"].append(ins)


def delete_insert(data: dict, slide: str, ins_id: str) -> None:
    e = slide_entry(data, slide)
    e["inserts"] = [i for i in e["inserts"] if i.get("id") != ins_id]


def _is_identity(p: dict) -> bool:
    return (abs(p.get("dx", 0)) < 0.01 and abs(p.get("dy", 0)) < 0.01
            and abs(p.get("rot", 0)) < 0.01 and abs(p.get("scale", 1) - 1) < 0.001
            and not p.get("w") and not p.get("h"))


# ------------------------------------------------------------------ rendering

def patch_css(entry: dict) -> str:
    """把 patches 轉成一段 CSS。放在 </head> 前，蓋過 theme 的規則。"""
    out = []
    for p in entry.get("patches", []):
        decls = []
        base = (p.get("base") or "").strip()
        if base.lower() in ("none", ""):
            base = ""
        tf = f"{base} translate({p.get('dx',0)}px,{p.get('dy',0)}px)" \
             f" rotate({p.get('rot',0)}deg) scale({p.get('scale',1)})".strip()
        decls.append(f"transform:{tf} !important")
        decls.append("transform-origin:center center !important")
        if p.get("w"):
            decls.append(f"width:{p['w']}px !important")
        if p.get("h"):
            decls.append(f"height:{p['h']}px !important")
        out.append(f"{p['sel']}{{{';'.join(decls)};}}")
    return "\n".join(out)


def insert_html(entry: dict, asset_prefix: str = "../assets/") -> str:
    """把 inserts 轉成一段 HTML。放在 </body> 前。"""
    out = []
    for i in entry.get("inserts", []):
        style = (f"position:absolute;left:{i.get('x',0)}px;top:{i.get('y',0)}px;"
                 f"width:{i.get('w',200)}px;height:{i.get('h',150)}px;"
                 f"transform:rotate({i.get('rot',0)}deg);"
                 f"transform-origin:center center;"
                 f"z-index:{i.get('z',40)};overflow:hidden;")
        src = i.get("src", "")
        if src and not src.startswith(("http", "data:", "/", "../")):
            src = asset_prefix + src
        kind = i.get("type", "image")
        if kind == "image":
            inner = (f'<img src="{src}" alt="" '
                     f'style="width:100%;height:100%;object-fit:'
                     f'{i.get("fit","contain")};display:block;">')
        elif kind == "video":
            attrs = "autoplay muted loop playsinline" if i.get("autoplay", True) else "controls"
            inner = (f'<video src="{src}" {attrs} '
                     f'style="width:100%;height:100%;object-fit:'
                     f'{i.get("fit","cover")};display:block;"></video>')
        else:  # text box
            style += (f"color:{i.get('color','#2c2826')};"
                      f"font-size:{i.get('size',18)}px;line-height:1.7;"
                      f"letter-spacing:0.06em;")
            inner = i.get("text", "")
        out.append(f'<div class="ovr-ins" data-ins="{i["id"]}" style="{style}">{inner}</div>')
    return "\n".join(out)


def apply_to_html(html: str, entry: dict, asset_prefix: str = "../assets/") -> str:
    """把一頁的 overrides 合成進 HTML 字串。打包與預覽共用同一份邏輯。"""
    css = patch_css(entry)
    if css:
        block = f"<style data-ovr=\"1\">\n{css}\n</style>"
        html = html.replace("</head>", block + "\n</head>", 1) if "</head>" in html \
            else block + html
    ins = insert_html(entry, asset_prefix)
    if ins:
        html = html.replace("</body>", ins + "\n</body>", 1) if "</body>" in html \
            else html + ins
    return html
