#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""new_deck.py — 安全地開一份新 deck，以及回答「這個資料夾可以寫嗎」。

    python3 slide_gen/new_deck.py <名稱> [--from <範例目錄>] [--root decks]
    python3 slide_gen/new_deck.py --check <slides_dir>

這就是 CLAUDE.md TODO 1 的「fork to theme」防護，只是換了形狀。

原本的危險是 `python3 theme_mocha.py` 就躺在 deck 資料夾裡，重跑一次就把整份
編輯過的 deck 蓋掉。那把槍已經卸了 —— 主題檔搬進 slide_gen/themes/ 而且拒絕執行。
但危險本身沒有消失，只是換了作者：接下來寫投影片的是 LLM，而它挑寫入路徑是靠
提示詞，比只會寫死一個路徑的腳本更容易挑錯。

所以這裡不是「再加一道要記得跑的檢查」，而是**把安全的那條路變成最好走的那條**：
要開新 deck 就用這支，它會拒絕蓋掉已經有東西的目錄；要寫進既有的 deck，先用
`--check` 問它安不安全。SKILL.md 只要說「先跑這個」，不必描述一整套規則。

`.editor-backup/` 從來不是這件事的保護 —— 它存的是「第一次編輯之前」的頁面，
跟主題重跑產生的內容逐位元組相同，還原它等於什麼都沒救到。
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEFAULT_TEMPLATE = REPO / "examples" / "starter"


def edited_pages(slides_dir: Path) -> list[str]:
    """這個 slides 目錄裡，哪幾頁被編輯過。

    兩個來源取聯集，和 slide_editor/server.py:108 的 Ctx.edited() 同一套判準：
      * 檔案裡有 `data-ed=` —— 幾何調整會留下這個標記
      * `.editor-backup/<目錄名>/` 裡有同名備份 —— 代表這一頁被寫入過

    只看 data-ed 會漏掉「只改過文字」的頁面（純文字編輯不留任何標記），那正是
    最該保護的情況。兩邊是刻意重複的：server 那份服務左欄的小圓點，這份服務寫入
    安全，耦合起來會讓 slide_gen 反過來依賴 slide_editor。改判準時兩邊都要改。
    """
    if not slides_dir.is_dir():
        return []
    found = set()
    backup = slides_dir.parent / ".editor-backup" / slides_dir.name
    if backup.is_dir():
        found |= {p.name for p in backup.glob("*.html")}
    for p in slides_dir.glob("*.html"):
        try:
            if "data-ed=" in p.read_text(encoding="utf-8"):
                found.add(p.name)
        except OSError:
            pass
    return sorted(found)


def check(slides_dir: Path) -> int:
    pages = edited_pages(slides_dir)
    if not pages:
        # 不存在和存在但沒編輯過，兩者都可以寫，但講成同一句會誤導 ——
        # 「0 頁」聽起來像有這個目錄而且是空的
        if not slides_dir.is_dir():
            print(f"可以寫入：{slides_dir}（目前不存在）")
        else:
            n = len(list(slides_dir.glob("*.html")))
            print(f"可以寫入：{slides_dir}（{n} 頁，沒有編輯痕跡）")
        return 0
    print(f"拒絕：{slides_dir} 有 {len(pages)} 頁被編輯過。", file=sys.stderr)
    print("  " + "、".join(pages[:6]) + ("…" if len(pages) > 6 else ""), file=sys.stderr)
    print("\n覆寫會毀掉這些編輯，而且救不回來 —— .editor-backup/ 存的是「第一次編輯"
          "之前」\n的版本，跟重新產生的內容一樣，還原它等於沒救到。\n"
          "\n要另一個版本，請產生到新的目錄：\n"
          f"  python3 slide_gen/new_deck.py <新名稱>\n", file=sys.stderr)
    return 1


def create(name: str, template: Path, root: Path) -> int:
    if "/" in name or name.startswith("."):
        print(f"拒絕：deck 名稱不能包含 / 或以 . 開頭：{name!r}", file=sys.stderr)
        return 2
    if not template.is_dir():
        print(f"拒絕：找不到範例目錄 {template}", file=sys.stderr)
        return 2
    pages = sorted(template.glob("*.html"))
    if not pages:
        print(f"拒絕：{template} 裡沒有任何 .html", file=sys.stderr)
        return 2

    deck = root / name
    slides = deck / "slides"
    # 存在就一律不碰，連空目錄也一樣。分辨「空的」和「有東西的」只會多一條
    # 需要判斷的路徑，而這支工具的價值就在於它永遠不會蓋掉東西。
    if deck.exists():
        print(f"拒絕：{deck} 已經存在。", file=sys.stderr)
        if slides.is_dir():
            n = len(edited_pages(slides))
            if n:
                print(f"  而且裡面有 {n} 頁被編輯過。", file=sys.stderr)
        print("  換一個名稱，或自己確認之後手動處理。", file=sys.stderr)
        return 1

    slides.mkdir(parents=True)
    for p in pages:
        shutil.copy2(p, slides / p.name)
    (deck / "deck.json").write_text(
        json.dumps({"live": "slides", "theme": template.name}, ensure_ascii=False,
                   indent=2) + "\n", encoding="utf-8")

    print(f"建立 {deck}")
    print(f"  slides/      {len(pages)} 頁（複製自 {template.relative_to(REPO)}）")
    print(f"  deck.json    live=slides")
    print(f"\n開始編輯：\n  python3 -m slide_editor.server {slides}")
    print(f"檢查：\n  python3 slide_gen/slide_lint.py {slides}")
    return 0


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__.strip().split("\n\n")[1])
        return 0 if argv else 2
    if argv[0] == "--check":
        if len(argv) < 2:
            print("用法：new_deck.py --check <slides_dir>", file=sys.stderr)
            return 2
        return check(Path(argv[1]).resolve())

    name = argv[0]
    template, root = DEFAULT_TEMPLATE, REPO / "decks"
    rest = argv[1:]
    while rest:
        flag = rest.pop(0)
        if flag == "--from" and rest:
            template = Path(rest.pop(0)).resolve()
        elif flag == "--root" and rest:
            root = Path(rest.pop(0)).resolve()
        else:
            print(f"不認得的參數：{flag}", file=sys.stderr)
            return 2
    return create(name, template, root)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
