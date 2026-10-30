# Core4 Repair1 Reviewer B 唯讀複審

基準 HEAD `59a2a65d37df077864ddbf4d3613cf8a91577189`；候選僅 `runtime/deck-editor.js`、`tests/edx-core-4-local-draft.test.mjs`，並讀 Mainline card Repair1 段。CodeGraph 查詢未命中此草稿 seam，改讀當前 source／diff。未讀另一 Reviewer 本輪結果；未改 delivery/control/manifest。

## CODE verdict：NO-GO

Repair1 對四個原 finding 的指定反例已通過：待恢復舊稿不被新編輯覆寫；quota 探針失敗仍能讀取、明示恢復舊稿；`setItem` 成功後讀回異常標為 `unknown` 並停止覆寫；恢復交易內的後段 fault 回退後按鈕仍可重試。正常新稿保存與恢復後再次編輯保存也可行。未見新增 writer／DB；pointer preview 相鄰 perf 測試未見全 spec 序列化。

### 新 finding

- **[P2] 恢復已提交後，通知 fault 卻回報「原稿未改動」 — `runtime/deck-editor.js:85-88`、`:867`。** `restoreDraft()` 的 `mutate` 已完成並返回 true，`markRestored()` 再先改 `pendingRestore`／`savedRevision`，然後呼叫 `report()`／DOM 通知。若此通知 setter 拋錯，外層 catch 顯示「恢復失敗：…；原稿未改動」，但 canonical、DOM、revision 已是恢復後內容，按鈕仍顯示。用既有 mounted harness 對 `[data-local-draft][role=status]` 的 `textContent` setter 在「本機草稿已保存」時拋錯，實測 `{canonical:"舊稿",revision:1,status:"恢復失敗：draft status fault；原稿未改動。",buttonHidden:false}`。這違反失敗與資料真相一致的契約；故障後使用者可能依錯誤文案繼續操作。`tests/edx-core-4-local-draft.test.mjs:257` 的 P2-B 只在 `mutate` 內的 history control setter 注入 fault，未涵蓋 `markRestored()` 的交易後通知。應使交易後通知 fault 不能被當作恢復交易失敗，或在發布成功狀態與按鈕更新時有一致的 fault 邊界。

## Fresh 驗證

- Focused：`node --test tests/edx-core-4-local-draft.test.mjs`，13/13 PASS。
- 相鄰：Core3 transaction、Undo/Redo、export cleanup 71/71 PASS；mounted perf 19/19 PASS。
- `git diff --check -- runtime/deck-editor.js` 與新測試檔 whitespace 檢查通過。
- 上述新反例為獨立故障注入；正常恢復後修改再保存實測 canonical／storage 均為新值，狀態為「本機草稿已保存」。
- mounted harness 是最小 DOM double，以上僅判 CODE；正式 browser host／file:／離線重開能力未在本輪證明，依指示未啟 Chrome／PGQ。
