# Reviewer A — Core4 本機草稿盲審

- 基準：`59a2a65d37df077864ddbf4d3613cf8a91577189`；僅審 `runtime/deck-editor.js` 與 `tests/edx-core-4-local-draft.test.mjs`。未讀其他 reviewer 本輪結果。
- 結論：**NO-GO**。Spec axis 有舊草稿保留的阻塞缺口；standards axis 的 focused 與相鄰回歸雖通過，不能抵銷資料覆寫風險，也不能當作 browser host 能力證據。

## Findings

1. **[P1] 有效舊草稿會在未選擇恢復時被靜默覆寫 — `runtime/deck-editor.js:605`、`:606`、`:782`、`:61`**。重新開啟相同來源時 `read()` 取得舊稿，然而 fresh editor 的任何成功 canonical 編輯都經最外層 `mutate` 排程保存，直接 `setItem` 同一 key；沒有在尚待恢復時保護有效舊稿。唯讀短重現：同一 storage/source/deck 先保存 `old`，重開 `read()` 為 `old`，不按恢復而提交 `fresh`，排程後 `read()` 變為 `fresh`。恢復按鈕仍可能出現，但原稿已失。卡片要求「不得靜默清除或覆寫舊草稿」，此處不符。建議在有效待恢復草稿存在時阻止覆寫，或以明確動作決定保留／取代，並加入 mounted 回歸。
2. **[P2] `setItem` 後讀回失敗仍可破壞舊草稿 — `runtime/deck-editor.js:61`–`:64`；測試缺口 `tests/edx-core-4-local-draft.test.mjs:51`**。讀回驗證發生在同一 key 已寫入之後；若 `setItem` 成功但後續 `getItem` 回傳過期值／失敗，狀態報 `failed`，舊值卻已被新值取代。唯讀短重現用 storage double 讓正式 key 的讀回回傳 `stale`，實際 Map 接收寫入：結果 `{state:'failed',oldPreserved:false,storedTitle:'new'}`。現有「讀回失敗」測試只讓 `setItem` 丟 quota，未覆蓋此路徑。建議先寫暫存 key 並驗證，再採可檢查的提交策略；至少不得宣稱舊稿保留，並補真正的讀回異常測試。
3. **[P2] 恢復交易後段失敗可使重試入口消失 — `runtime/deck-editor.js:840`、`:782`、`:734`–`:735`**。`restoreButton.hidden=true` 在 `mutate` 工作內設定，但 rollback checkpoint 的 controls 只收 undo/redo；若後續 `refreshHistoryControls(true)` 等後段效果丟錯，canonical 可回退，恢復按鈕仍隱藏。錯誤文案會稱「原稿未改動」，但使用者已無法在這次掛載重試。建議將按鈕狀態納入交易回退，或在整體成功後才隱藏，並用後段 fault 注入驗證。

## 已核對與驗證界線

- CodeGraph 先查 source decision，未命中相關 editor source，後改 `rg`／HEAD diff。`mutate` 最外層成功才呼叫草稿 `commit`；nested 失敗與 gesture preview 的不寫入路徑在程式碼上成立。讀取驗證包含 deck ID、初始 `#deck-spec` 指紋、結構與 canonical clean；壞資料會封鎖本次 writer。恢復由明示 click 進入，已有 revision／未提交直接文字／忙碌操作會拒絕。未見新增 DB 或獨立 writer。
- Fresh：`node --test tests/edx-core-4-local-draft.test.mjs tests/edx-core-3-transaction-boundary.test.mjs tests/edx-core-3-undo-redo.test.mjs` → **75 pass / 0 fail**。`git diff --check 59a2a65 -- runtime/deck-editor.js tests/edx-core-4-local-draft.test.mjs` → exit 0。
- `tests/edx-core-4-local-draft.test.mjs` 使用 memory storage 與 mounted DOM double；匯出 DeckSpec、revision/history 的 mock 路徑通過。尚無本 reviewer 的真 browser `file:`／storage/profile、兩 viewport、離線重開或 host 清理證據；**不得以 mock PASS 宣稱 host 能力或 Core4 GO**。正式 browser script 由另一 Worker 獨立新增，本輪未審。
