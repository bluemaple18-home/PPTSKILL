# html-slide-builder

本機的 HTML 投影片視覺編輯器。投影片就是 1280×720 的 HTML 頁面，編輯器直接
就地改它們，改完即所見；打包成一個字體內嵌、可離線開啟的單一 HTML 檔。

```
html-slide-builder/
├── slide_editor/          ← 編輯器（server.py + static/editor.html）
├── slide_gen/             ← 產生與檢查（themes/ 保存用 CSS、slide_lint.py）
├── build_deck.py          ← 打包工具（子集化字體 + 內嵌 + 導覽）
├── chart.py               ← 內嵌 SVG 圖表，9 種形式，不依賴圖表函式庫
├── fonts/
│   ├── LXGWWenKaiTC-Regular.ttf     霞鶩文楷（楷體，會自動下載）
│   └── NotoSerifTC-CJKcommon.otf    思源宋體（明體，已裁到常用 CJK 21,696 字）
├── examples/sakura-wabi/  ← 三頁範例，複製一份當模板改
├── references/            ← 文案規則、圖表決策表
├── decks/                 ← 你的 deck（gitignore，不進版控）
└── out/  debug/           ← 產出與雜項（皆 gitignore）
```

編輯器用法見 [EDITOR.md](EDITOR.md)。

## 用法

```bash
python3 build_deck.py examples/sakura-wabi/ -o out/deck.html \
    --font wenkai --nav scroll --title "侘寂 · 京都手記" \
    --bg "#efe9de" --ink "#2c2826"
```

| 參數 | 選項 | 說明 |
|------|------|------|
| `--font` | `wenkai` / `serif` / `none` | 楷體（人文、茶道、文化）／明體（商務、技術、正式）／不內嵌 |
| `--nav` | `scroll` / `buttons` | 滾一下翻一頁／上一頁下一頁按鈕 |
| `--bg` `--ink` | hex | 外框底色與前景色，配合該 deck 的風格 |

兩種模式都支援：方向鍵、空白鍵、PageUp/Down、Home/End、右側進度點點擊跳頁、`F` 全螢幕、觸控滑動。

## 做投影片的流程

1. 從 `ppt-agent-skill/references/styles/index.md` 選一個 style（共 26 種）
2. 讀該 style 的 JSON token（`background` / `text` / `accent` / `typography` / `decoration_dna`）
   —— `decoration_dna.forbidden` 是硬約束，比 `signature_move` 更值得遵守
3. 依 `references/design-runtime/design-specs.md` 的骨架寫每一頁 1280×720 的獨立 HTML：
   - `header.slide-header > span.overline + h1.page-title`，`position:absolute; top:20px`
   - `footer.slide-footer`，`position:absolute; bottom:12px`
   - 全 deck 結構統一，視覺可依風格變化
   - 填充率：封面 40-55%／內容 60-75%／結束 35-50%
4. `build_deck.py` 打包

## 三個踩過的坑

**字形地區**　`sakura_wabi` 的 style.json 宣告 `'Source Han Serif SC', 'Noto Serif JP'`——
簡體優先、再日文。內容是繁體中文時，同一碼位的 直 / 骨 / 步 / 每 會拿到日文字形。
`build_deck.py` 一律改寫成內嵌的 TC 字體。

**字體依賴**　原 skill 走 `@import` Google Fonts，離線／內網／中國大陸可能拉不到，
一失敗就掉到系統 fallback，字重與排版全變。子集化後只帶這份 deck 用到的字
（通常 40-60KB），base64 內嵌，HTML 完全自足。

**滾動翻頁**　原生 CSS `scroll-snap` 實測不行：滾動量不足會被吸回原頁，
一次慣性滑動又會連跳數頁（`scroll-snap-stop: always` 沒擋住）。
改用 transform 軌道 + 手勢鎖（靜止 140ms 且至少 620ms 才解鎖），才能一次手勢剛好一頁。
另外 iframe 必須 `pointer-events:none`，否則滾輪事件被 iframe 吃掉。

## 授權

- `ppt-agent-skill` — MIT（Copyright sunbigfly；Akxan fork）
- LXGW WenKai TC — SIL OFL 1.1
- Noto Serif TC — SIL OFL 1.1

三者皆可商用、可內嵌。

## 已知限制

- 所有 slide 的 iframe 同時存在，約 25 頁以上建議改成延遲注入 `srcdoc`
- `--nav scroll` 會攔截滾輪事件，頁面無法正常捲動（投影片是離散狀態，取捨如此）
- `NotoSerifTC-CJKcommon.otf` 只含常用 CJK 區段；遇到罕用字會缺字，
  改用完整版 Noto Serif TC 即可
- `ppt-agent-skill/` 是快照不是 git repo（掛載目錄不允許刪除，git 無法運作），
  要更新請自行重新 clone
