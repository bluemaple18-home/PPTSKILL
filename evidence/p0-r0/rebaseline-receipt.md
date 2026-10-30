# P0-R0 MVP Architecture Rebaseline Receipt

- 日期：2026-09-06
- 狀態：PASS
- 變更類型：documentation／contract rebaseline only
- 下一個 frontier：P0-R1

## 已鎖定的 MVP 邊界

- 使用者使用自己的 Codex、Claude Code 或 Gemini CLI；無中央 AI 平台、帳號、後端、資料庫或發布服務。
- 員工取得 ZIP；一份 core 搭配三個薄入口，profile 位於安裝目錄外且升級不得覆寫。
- 正式交付只有可離線轉傳的單一 `deck.html`；不支援 PPT／PPTX。
- Presenter Mode 移出 MVP；直接 HTML 編輯與另存新檔保留。
- 四候選改為 Company Style＋三個 dynamic AI Visual Routes；既有四 Theme 只作 reference／fallback。
- outline 為 1～15 頁，每頁 title、subtitle、3～5 key points。
- 後續以 DeckSpec／StyleSpec／CompositionSpec、bounded generation、sanitizer 與 browser geometry hard gate 為核心。

## 舊切片與證據處置

| Slice | 仍有效 | 必須修復／不得再作 MVP authority |
|---|---|---|
| PS-001 | 單檔 HTML、播放、直接編輯、重排、複製、刪除、另存及既有 browser evidence | Presenter UI／測試；title/body-only deck-data |
| PS-002 | capability probe、fail-loud validator、repair attempt 與 last-success receipt 規則 | 補 DeckSpec、sanitizer、collision／overflow／off-canvas、asset、size、token checks |
| PS-003 | 同內容真實 HTML/CSS render→screenshot→人工選款機制 | 固定四 Theme authority；舊 PNG 只作退件／歷史證據 |

## 舊 PS-004～PS-008 mapping

- PS-004 → P0-R2
- PS-005 → P0-R4、P0-R5、P0-R6
- PS-006 → P1-R8
- PS-007 → P1-R8
- PS-008 → P0-R7、P0-R10

## Acceptance

- `working-spec.md` 已以 D-023～D-029 覆寫固定四 Theme、Presenter 與舊 artifact 假設。
- `implementation-plan.md` 已標記為 historical，並提供舊 ID 至新卡的 mapping。
- `BACKLOG.md` 與 `README.md` 的 current frontier 已指向 P0-R1。
- PS-001～PS-003 的程式碼與 evidence 未在本卡改寫或刪除。
- 本卡未實作任何新產品功能。
