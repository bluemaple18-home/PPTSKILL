# Core3 交易邊界：round-06 targeted repair

Status: `CODE_GO / HOST_OBSERVER_BLOCKED / WHOLE_CARD_NOT_CLOSED`

- 目標：關閉 `evidence/edx-core-3-undo-redo/review-round-06.md` 兩個 P1。基線 packaged `b35336d`／code `e6f9afa`，不得抹掉兩名不同 verdict 或既有 FAIL。
- 範圍：`runtime/deck-editor.js` public layout mode entry、`runtime/component-interaction.js` 既有 operation handler 的終態 notify/controls，及直接 regression tests。模式切換可能 syncText，須完整交易；純 refresh/selection 仍 bounded guard、零 payload read。同一 handler 家族的 group/ungroup/lock/unlock、nudge、align/distribute、initialize 要列 operation→最後可throw副作用，使用同一既有 afterCommit／mutate seam，不逐顆加獨立 state。既有 actor/group/selector authority、history 不變。
- 驗收：上述兩個正確行為 RED→GREEN；核對 canonical、revision、history、DOM pending text、mode、contenteditable、selection/vendor 恢復且可再次操作；終態 notify fault 不得「未套用卻提交」。同 family 檢查有影響就補代表性故障 regression；保留 public nested rejection、double fallback、正常group/snap及hot-path成本。focused→81檔nonbrowser全量（原四PGQ排除）、diff check/protected；主線重建ZIP並由原Reviewer targeted re-review。
- 派工：同一 native Writer重用、shared sequential single writer；主線不並行寫產品。規格固定、模型維持既有可用lane，不新增多條repair。提交只含明確runtime/test/自身evidence；ZIP主線處理。
- 禁區／止損：不改AI Core、不啟browser／PGQ、不merge/push/deploy、不開Core4、不改歷史evidence。若本批同一失敗修正兩次仍無進展或需跨其他runtime／另造authority，保留最小反例回主線裁決，不能無限新增補丁。回退本輪明確commit，四個protected不動。

交付 code：`8ad5d6fbaca45027cf73da70432787e1413b7502`。Writer targeted 12/12、affected 153/153、full 1056/1056；主線 ZIP lifecycle 與 75 sources 通過。結果待原兩名 Reviewer 針對固定封包 SHA 獨立重審；不能標整卡 GO。

## Round-07 單一取消投影 follow-up

原兩項 P1 已由兩名 Reviewer／主線反例確認關閉。新 P1 與四組fresh重播見 `evidence/edx-core-3-undo-redo/review-round-07.md`。本續修僅既有兩runtime／transaction-boundary tests：取消本身throw仍須canonical DOM或明確fail-closed，不得建立checkpoint前留下partial preview。先RED，再既有取消checkpoint/fallback修復；驗四組、double projection、rollback失敗明確拒絕、原closure與hotpath，full→ZIP→原Reviewer targeted re-review。不得復活gesture或新增authority；同一失敗兩次無進展即停。

取消投影修復code `f3d8a11`；Writer新反例5/5、focused160/160、full1061/1061。主線已重建ZIP/lifecycle及75-source驗證，待原Reviewer依新固定封包獨立裁決。

## 最新裁決（取代上文歷史pending）

固定packaged `9ce7396a481621960f6f2c89ff7fcf352c0e515a`／code `f3d8a11865a5af25f34a08a5b65dccb3fed6914f`，原兩Reviewer targeted re-review均CODE GO；兩項mode/group與後續cancel P1全閉。詳 `evidence/edx-core-3-undo-redo/review-round-08.md`、最新Mainline checkpoint。仍待AI Core observer適用修復與本candidate fresh browser/PGQ，不做Core3 closure／integration；不開Core4。
