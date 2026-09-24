# Core3 同步交易邊界：唯讀重規劃

Status: `RESEARCH_ONLY_COMPLETE / PRODUCT_NO_GO`
Product SHA: `4a405cfcb397a2223dcd010cf048a1e5e058418f`

## 實際同步呼叫鏈

| 入口 | 目前路徑 | 會呼叫外部可重入的接點 |
| --- | --- | --- |
| Slide reorder | click `move-down` → `move()` → `layout.clearSelection()` → `syncText()` → `commitTextElement()` → `executeOperation(edit-text)` → DOM `insertBefore` → canonical swap → `renumber()` → `status()` → revision/history clear | `insertBefore`、文字／folio setter、`status`、history 控制投影 |
| Gesture | Moveable `dragEnd` → `interaction.finish()` → `beforeFinish()` → `notify()` → `restore()` → `executeOperation(move/resize)` → `executeOperationCore()` → history record／controls → after-commit `restore()`／controls | 控制列 `disabled/title` setter、status setter、component style setter、Moveable 投影 |
| Replay／直接操作 | `window.PPTSKILLEditor.undo/redo`、Ctrl/Meta+Z → `replayHistory()`；`window.PPTSKILLEditor.executeOperation()` → `executeOperation()`；`applyLocalPatch()` → `applyPatch()` | 以上入口可由同步 setter／DOM method 直接重入 |

原本已有 rollback snapshot，但未有跨上述入口的 **同步交易 owner**。`move()` 在 `syncText()` 後才做非撤銷式 reorder，故同步 nested call 可先回報成功，隨後被外層 rollback 抹掉。Gesture 的 `finishing` 暫時解除以刷新控制列，讓 nested operation 進入同一 rollback 範圍；只擋 Undo 不夠。`review-round-05-repro.mjs` 對兩種 nested-success-erased 與 canonical/DOM 順序分裂提供固定反例。雙次 style projector failure 另證明單靠重試同一 projector 不足以恢復 DOM。

## 最小足夠的產品方案，待 Owner 另行授權

1. 在既有 `deck-editor` mutation authority 建立**單一同步交易屏障**，涵蓋 reorder 的 `syncText` 到成功或回退，以及 gesture 的通知、投影、operation、history／控制列收尾與回退。公開 `executeOperation`、`replayHistory`、`applyPatch` 和直接呼叫的 slide mutator 在屏障內拒絕 nested mutation，且拒絕須發生在任何 payload getter／DOM 副作用之前。
2. 保留必要的內部操作：reorder 的文字同步與既有 `paste-style → set-typography` 遞迴不能被誤擋。僅用 closure-private internal path／opaque permit 呼叫同一既有 operation executor，不另建 writer；不得讓 public API 取得 permit。`gesturing` 繼續代表真 pending gesture，交易屏障獨立處理收尾重入，避免再阻 Core2 group drag。
3. Gesture 在 preview 前保存目標 DOM style／identity checkpoint；失敗時先以 canonical projector 復原，再對 after-effect／雙次投影故障以 checkpoint 做 bounded fallback 與逐節點驗證。若仍無法恢復，必須明確報 `rollback failed` 並令互動不可繼續，不能同時宣稱 canonical/DOM 已一致。Reorder 的 DOM 同層順序也須在 rollback 後驗證。
4. 把新反例先做 RED：reorder status／`insertBefore` 中 Undo 和 nested edit-text，gesture 控制列／status／style setter 中 Undo、nested edit-text、新 gesture，單次與雙次 projector fault，Core2 group drag 正常提交。GREEN 後才跑 affected scoped、完整 non-browser、ZIP byte-match、兩名盲審；code GO 且 AI Core observer 有適用處置後，才做新產品 SHA 的正式 browser／PGQ。

為何不能只加一個 setter guard：`5b588f7` 與 `4a405cf` 先後在其他同步接點量到同類 P1。為何不另建 history／scene graph：既有 DeckSpec、operation executor、history snapshot 已具備必要 authority，缺的是**同一交易期間的入口排他與 rollback 驗證**。這是 architectural fork，不是已驗證的 patch；本研究沒有修改 runtime／ZIP，也沒有替 Repair 4 預先授權。
