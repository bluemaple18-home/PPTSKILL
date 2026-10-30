---
name: slide-deck
description: 用 html-slide-builder 做一份 1280×720 的 HTML 投影片 deck。每頁是一個獨立、樣式內嵌的 HTML 檔，編輯器直接讀寫它們，打包後是一個字體內嵌、可離線開啟的單一檔案。當使用者要做投影片、簡報、slide deck，或要在既有 deck 加頁、改頁時使用。
---

# 做一份 deck

投影片就是 HTML 檔案。沒有中間格式、沒有產生器 —— 你寫出來的 `.html` **就是**
最終成品，編輯器之後直接改它。

工具會擋掉大部分做錯的方式，所以**照流程跑，不要靠記規則**。

## 流程

```bash
# 1. 開一份新 deck（會拒絕蓋掉已存在的目錄）
python3 slide_gen/new_deck.py <名稱>
#    → 產生 decks/<名稱>/slides/ 與 deck.json

# 1'. 如果是要寫進「既有」的 deck，先問它安不安全
python3 slide_gen/new_deck.py --check decks/<名稱>/slides
#    → exit 1 就是那份 deck 有人編輯過。停下來問使用者，不要覆寫

# 2. 寫／改 slides/*.html

# 3. 檢查。有 error 一定要修完再交
python3 slide_gen/slide_lint.py decks/<名稱>/slides --strict

# 4. 打包（要分享時才做）
python3 build_deck.py decks/<名稱>/slides \
        -o decks/<名稱>/out/deck.html --font wenkai|serif --nav scroll
```

**第 3 步不是建議。** 這個專案最貴的幾個 bug 都是「在做出它的那台機器上看不出來」
——字體寫死在本機完全正常，換一台就掉字。linter 是唯一擋得住的東西。

## 怎麼寫一頁

**先讀 `examples/starter/02-content.html`，照它的結構寫。** 那份範例就是規格，
比任何條列規則可靠。每一頁是完整獨立的 HTML：自己的 `<style>`、自己的 `<body>`，
不共用外部 CSS 檔。

主題的 `<style>` 區塊**原樣複製**到每一頁，不要每頁重寫一次 —— 重寫必然漂移，
一頁的間距差 2px、一頁的顏色差一階。要改主題就每頁一起改。

硬性要求，linter 都會抓：

| 規則 | 為什麼 |
|---|---|
| `html,body{width:1280px;height:720px;overflow:hidden}` | 尺寸固定 |
| 字體只能用 `var(--display-font)` / `var(--body-font)` / `var(--label-font)` | `build_deck.py` 打包時改寫的是這三個**變數**，不碰元素上的 `font-family`。寫死字體名稱在本機看起來對，換一台機器掉光 CJK |
| 用到的 class 一定要有對應 CSS 規則 | 掰一個名字不會報錯，只會沒有樣式 |
| 除了 `fonts.googleapis.com`，不能有外部網址 | 打包後要能離線開 |
| 不要 `alert()` / `confirm()` / `prompt()` | 會鎖死用來測試編輯器的自動化 |
| 三個字體角色整份 deck 要一致 | 打包只嵌入一套子集字體 |

`--strict` 會把 warn 也算成失敗。warn 目前只有「用了沒定義的 class」。

## 會跑腳本的頁面

任何腳本產生的節點都要放在 `<div data-live>` 裡面。存檔是序列化整份 live DOM，
所以容器外的節點會被寫回原始檔，而且每存一次就多一批（實測一次存檔 706→923
bytes）。`<script>` 標籤本身放哪裡都行，它是靜態節點。

## 圖表

**不要手寫 SVG，也不要引入圖表函式庫。** 用 `chart.py`：

```bash
# 先問這個問題該用哪種圖 —— 只會回實際畫得出來的形式
python3 -c "import chart; print(chart.suggest('哪個版位成效最好'))"

# 再產生
python3 -c "import chart; print(chart.render('lollipop', [('A',3),('B',5)], highlight='B'))"
```

`suggest()` 回空清單代表這份決策表回答不了，去讀
`references/chart-vocabulary.yaml` 自己挑，**不要自己發明第十種形式** ——
`chart.FORMS` 以外的東西畫不出來。

標題、副標、出處是投影片上獨立的文字元素，不要放進 SVG，那樣就不能在編輯器裡編輯。

## 文案

寫中文投影片文案前先讀 `references/slide-copy-zh-tw.md`。用**繁體中文（zh-TW）**。

## 交件前

1. `slide_lint.py --strict` 全綠
2. **實際看過**。linter 抓不到醜。圖表曾經通過所有尺寸與結構斷言，同時標籤重疊、
   撞到分類名、掉出右邊界 —— 三個缺陷，驗證器一個都看不到。開
   `python3 -m slide_editor.server decks/<名稱>/slides` 看過每一頁

## 不要做的事

- 不要直接改 `examples/starter/` —— 那是版控裡的範本，複製一份再改
- 不要碰 `.editor-backup/`、`.archive/`
- 不要在沒跑 `--check` 的情況下寫進既有的 deck
- 不要在元素上寫死 `font-family`，一次都不要
