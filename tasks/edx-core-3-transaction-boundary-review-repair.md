# Core3 交易邊界：round-06 targeted repair

Status: `AUTHORIZED / IN_PROGRESS`。Owner 於 round-06 review 中斷後要求「繼續」；承接同一 Core3 scope。

- 目標：關閉 `evidence/edx-core-3-undo-redo/review-round-06.md` 兩個 P1。基線 packaged `b35336d`／code `e6f9afa`，不得抹掉兩名不同 verdict 或既有 FAIL。
- 範圍：`runtime/deck-editor.js` public layout mode entry、`runtime/component-interaction.js` 既有 operation handler 的終態 notify/controls，及直接 regression tests。模式切換可能 syncText，須完整交易；純 refresh/selection 仍 bounded guard、零 payload read。同一 handler 家族的 group/ungroup/lock/unlock、nudge、align/distribute、initialize 要列 operation→最後可throw副作用，使用同一既有 afterCommit／mutate seam，不逐顆加獨立 state。既有 actor/group/selector authority、history 不變。
- 驗收：上述兩個正確行為 RED→GREEN；核對 canonical、revision、history、DOM pending text、mode、contenteditable、selection/vendor 恢復且可再次操作；終態 notify fault 不得「未套用卻提交」。同 family 檢查有影響就補代表性故障 regression；保留 public nested rejection、double fallback、正常group/snap及hot-path成本。focused→81檔nonbrowser全量（原四PGQ排除）、diff check/protected；主線重建ZIP並由原Reviewer targeted re-review。
- 派工：同一 native Writer重用、shared sequential single writer；主線不並行寫產品。規格固定、模型維持既有可用lane，不新增多條repair。提交只含明確runtime/test/自身evidence；ZIP主線處理。
- 禁區／止損：不改AI Core、不啟browser／PGQ、不merge/push/deploy、不開Core4、不改歷史evidence。若本批同一失敗修正兩次仍無進展或需跨其他runtime／另造authority，保留最小反例回主線裁決，不能無限新增補丁。回退本輪明確commit，四個protected不動。
