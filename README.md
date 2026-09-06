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

v0.1 正在進行 2026-09-06 MVP rebaseline：

- PS-001：三頁功能樣本與瀏覽器驗收完成；保留 runtime / 直接編輯能力，Presenter 從 MVP 移除。
- PS-002：capability probe 與 validator 完成；後續延伸 DeckSpec、sanitizer、collision / overflow / size guard。
- PS-003：真實 HTML/CSS Theme preview 機制保留；現有四 Theme 降為 reference / fallback，候選改為 Company Style + 3 dynamic AI routes。
- **目前工程 frontier：先做 `BACKLOG.md` 的 `P0-R0 MVP architecture rebaseline`，不要直接續做舊 PS-004。**

`evidence/ps-003/*.png` 是第一版退件畫面，只保留為開發紀錄；`fixtures/theme-previews/*.html` 與現有 Theme code 仍可作 reference evidence，但不再代表最終固定四選一產品契約。

## 本機使用

```bash
pnpm run build:themes
pnpm test
```

直接以瀏覽器開啟：

- `fixtures/deck.html`：三頁功能測試樣本。
- `fixtures/theme-previews/*.html`：既有四款封面 reference preview。

## 主要文件

- `BACKLOG.md`：**目前唯一 execution queue / current frontier**；先看這份再派工。
- `working-spec.md`：產品與行為規格 authority；P0-R0 要把 2026-09-06 owner decisions 正式 reconcile 回去。
- `implementation-plan.md`：原 v0.1 垂直切片計畫，保留歷史證據；與新 backlog 衝突處先以 P0-R0 重基準，不直接執行舊後續切片。
- `design/visual-route-contract.md`：既有四 Theme 視覺研究，現為 reference / fallback，待 P0-R3 轉成 dynamic visual-route materials。
- `research/synthesis.md`：歷史簡報方法的研究整理。

