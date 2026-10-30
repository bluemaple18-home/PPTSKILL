# P0-R7 Direct Editor + Portable Export Receipt

- 日期：2026-09-10
- 狀態：`COMPLETE / AUTOMATED + BROWSER + REOPEN + GEOMETRY GATES PASS`
- 基準：`CP-VQ3 PASS`；沿用既有 DeckSpec、CompositionSpec 與 full-deck renderer seam。
- 不包含：自由 x/y 拖拉、Presenter Mode、第二套 renderer、遠端 AI 或外部服務。

## Implemented

- 單檔 HTML 右下角提供低干擾編輯入口；播放狀態只顯示收合按鈕。
- title、subtitle、key point 與 text／citation component 可直接文字編輯。
- text、image、table、chart、public citation 可透過 allowlist component editor 更新。
- 目前頁面的 image component 可由本機檔案替換，限 PNG／JPEG／WEBP／GIF／SVG data URI。
- 支援上移、下移、複製、刪除；維持唯一 slide ID、至少一頁與最多 15 頁。
- `window.PPTSKILLEditor.applyLocalPatch(...)` 只接受目前 slide 的單一 `content.title`、`content.subtitle`、`content.keyPoints.N` 或 `content.components.ID` region。
- 另存 HTML 前重新建立 allowlist DeckSpec、移除暫態編輯狀態，並保留 editor runtime 與 `script#deck-spec`。
- 舊功能樣本中的 Presenter Mode 已移除。

## Evidence

- `pnpm test`：71 / 71 pass。
- Browser acceptance：`evidence/p0-r7/browser-editor-acceptance.json`，狀態 `pass`。
  - 直接修改 title 後，另存並重開仍為「瀏覽器直接編輯成功」。
  - 本機 AI 單區 subtitle patch 另存並重開後仍存在。
  - 圖片由 PNG data URI 替換為 WEBP data URI，另存並重開後仍存在。
  - duplicate 使 10 頁變 11 頁，delete 回到 10 頁；reorder 操作可完成。
  - console、page error、network failure、HTTP error 皆空。
  - sanitizer leak=`false`；Presenter Mode present=`false`。
- Portable reopen artifact：`evidence/p0-r7/portable-edited-deck.html`。
- Dual-viewport geometry：`evidence/p0-r7/portable-edited-geometry.json`，1600×900 與 1280×720 皆 `issues=[]`，reduced-motion 完整可讀且 layout stable。
- Negative sanitizer fixtures 覆蓋 profile、local path、source document／notes 與 prompt；匯出 DeckSpec 不含禁止欄位。
- `git diff --check`：pass。

## Acceptance

- edit / save / reopen preserves changes：PASS。
- recipient AI can parse DeckSpec from only `deck.html`：PASS。
- negative sanitizer fixtures prove forbidden working context does not leak：PASS。
- direct editor operations and image replacement：PASS。
- no free drag / no Presenter Mode / no second renderer：PASS。

`P0-R7: COMPLETE`。
