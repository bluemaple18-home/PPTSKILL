# PPTSKILL

讓 PM、RD、業務與行銷都能透過自己的 AI，快速產出可離線開啟、可自由轉傳的單檔 HTML 簡報。

## 核心原則

- HTML 是唯一工作檔與交付格式，不產生 PPT／PPTX。
- 每次製作前必須先完成精簡但不可跳過的 Grill Me。
- 架構確認後，以相同標題與內容呈現四款真實 HTML/CSS 封面供使用者選擇。
- 成品內建播放、Presenter、編輯、排序、複製、刪除與另存新 HTML。
- 個人風格記憶為選配；沒有 ai-core 或既有 profile 也能使用。
- Codex、Claude 與 Gemini 只作薄入口，共用相同 portable workflow。

## 目前狀態

v0.1 開發中：

- PS-001：三頁功能樣本與瀏覽器驗收完成。
- PS-002：capability probe 與 validator 完成。
- PS-003：四款 HTML/CSS Theme 已重做，等待新版瀏覽器截圖與人類選款。
- 後續：Grill Me、outline、完整 deck、個人 profile、跨 AI wrappers、E2E release。

`evidence/ps-003/*.png` 是第一版退件畫面，只保留為開發紀錄；請以 `fixtures/theme-previews/*.html` 為目前設計來源。

## 本機使用

```bash
pnpm run build:themes
pnpm test
```

直接以瀏覽器開啟：

- `fixtures/deck.html`：三頁功能測試樣本。
- `fixtures/theme-previews/*.html`：四款封面預覽。

## 主要文件

- `working-spec.md`：核准中的產品與行為規格。
- `implementation-plan.md`：垂直切片實作計畫。
- `design/visual-route-contract.md`：四款 Theme 的視覺路由契約。
- `research/synthesis.md`：歷史簡報方法的研究整理。

