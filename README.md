# PPTSKILL

讓 PM、RD、業務與行銷都能透過自己的 AI，快速產出可離線開啟、可自由轉傳、可直接編輯、也可再交給另一個 AI 修改的單檔 HTML 簡報。

## 核心原則

- 使用者使用自己的 Codex、Claude Code、Gemini CLI 帳號與 quota；PPTSKILL 不提供中央 AI 平台或公司共用模型帳號。
- 最終交付是單一 portable `deck.html`，不產生 PPT／PPTX；HTML 內嵌經 sanitizer 處理的 versioned DeckSpec，讓另一個相容 AI 可接手修改。
- 每次製作前先完成精簡但不可跳過的 Grill Me；架構確認採每頁「大標＋小標＋3～5 個重點」，MVP 最多 15 頁。
- 架構確認後，以相同真實內容呈現四款 HTML/CSS 封面：1 個 Company Style + 3 個依本次內容動態產生的 AI Visual Routes。
- Style 選定後整份保持一致，但每頁 composition 可以不同；使用者可要求「換一個排版」而不改內容。
- 成品保留直接 HTML 編輯、排序、複製、刪除、圖片替換與另存新 HTML；MVP 不做 Canva / PowerPoint 式自由拖拉畫布，也不做 Presenter Mode。
- 圖文、圖圖、文文非預期重疊、overflow、off-canvas 都是 hard fail；優先 deterministic browser geometry QA。
- Full generation 必須 bounded：禁止一個 giant call 生成完整 15 頁，禁止四種風格重複生成四份內容，禁止單頁修改重生整份 deck。
- 個人 presentation profile 為 local optional config；明確確認才記住，ZIP 更新不得覆蓋。
- PPTSKILL 對員工以 ZIP 發佈；Codex、Claude Code、Gemini CLI 只作薄入口，共用同一份 core。

## 目前狀態

v0.1 已完成核心契約到 geometry QA，但目前 style candidate / full-deck renderer 的**視覺品質已被 owner 退回修復**：

- PS-001：三頁功能樣本與瀏覽器驗收完成；保留 runtime / 直接編輯能力，Presenter 從 MVP 移除。
- PS-002：capability probe 與 validator 保留。
- P0-R1 / R2 / R4 / R6：DeckSpec、Grill Me／outline、bounded generation、browser geometry hard gate 均維持完成。
- P0-R3：functional contract 已完成，但 owner visual acceptance 重新打開。
- P0-R5：semantic renderer 架構保留，但 visual vocabulary 必須修復，不重寫 DeckSpec / CompositionSpec。
- **目前工程 frontier：`P1-R8-A` 已完成；`P1-R8-B` 實作與 lifecycle gates 已通過，等待兩名獨立 blind reviewer verdict。`P1-R9` 等待 Owner company PPTX；`P1-R10` 排在 R8-B review 之後。**

## Portable HTML editor

完整 deck 右下角提供低干擾的「編輯文字」入口。進入編輯後可直接修改標題／副標／支援的文字區域，並可編輯 allowlist 元件、替換目前頁面的內嵌圖片、調整順序、複製、刪除與另存新 HTML。`window.PPTSKILLEditor.applyLocalPatch(...)` 只接受目前投影片的單一 `content.*` region，供本機 AI 做 bounded patch；沒有自由 x/y 拖拉，也沒有 Presenter Mode。

另存時會重新建立 allowlist DeckSpec，移除編輯狀態並保留單檔離線 runtime。收件者只需要新 HTML，即可重新開啟編輯器或從 `script#deck-spec` 讀回 DeckSpec。

## Local profile

個人偏好預設不存在也可正常使用。只有明確執行 `pnpm profile save --input <profile.json> --remember` 才會寫入 user home 下的 `.pptskill/profile.json`；不加 `--remember` 不會建立檔案。可用 `pnpm profile show` 檢視，允許欄位限於語言、Style 傾向、density、sample-first、motion、字體人格與色彩傾向。profile 不會進入輸出的 `deck.html`。

## ZIP distribution

可發送的候選包位於 `dist/PPTSKILL-0.1.0.zip`。解壓後直接執行 `node install.mjs`，再執行 `node smoke.mjs`；不需要 clone repo、branch、Git 或 GitHub token。更新使用新版 ZIP 內的 `node update.mjs`，移除 runtime 使用 `node uninstall.mjs`。uninstall 預設保留 profile；只有明確加上 `--purge-profile` 才刪除個人偏好。

ZIP 只有一份 `core/`；Codex、Claude Code、Gemini adapter 只保存 capability probe 與 shared-core 相對路徑。installer 不會自動修改 `.codex`、`.claude`、`.gemini`，不登入、不下載，也不寫 token。

`evidence/ps-003/*.png` 與目前 `fixtures/style-candidate-previews/*.html` 可作開發 / 退件 evidence，不代表最終視覺品質已被 owner 接受。

## 本機使用

```bash
pnpm run build:themes
pnpm run build:styles
pnpm run build:deck
pnpm run qa:geometry
pnpm test
```

直接以瀏覽器開啟：

- `fixtures/deck.html`：三頁功能測試樣本。
- `fixtures/theme-previews/*.html`：既有四款封面 reference preview。
- `fixtures/style-candidate-previews/*.html`：Company Style fixture + 3 dynamic AI Visual Routes 的目前開發 preview；**尚未通過 owner visual acceptance**。
- `fixtures/full-deck.html`：目前 semantic renderer fixture；架構 evidence 可用，視覺品質仍待 P0-VQ3 repair。

## 主要文件

- `BACKLOG.md`：**目前唯一 execution queue / current frontier**；先看這份再派工。
- `working-spec.md`：產品與行為規格 authority；已納入 2026-09-06 owner decisions。
- `implementation-plan.md`：原 v0.1 垂直切片計畫，保留歷史證據；不得跳過目前 visual-quality repair lane。
- `design/visual-route-contract.md`：既有四 Theme 視覺研究，現為 reference / fallback；P0-VQ1 會把 AI Core frontend-design 材料正式收斂成 portable PPTSKILL design-material layer。
- `research/synthesis.md`：歷史簡報方法的研究整理。
