# Core3 Repair 3 固定候選複審（續）

Reviewed product SHA: `4a405cfcb397a2223dcd010cf048a1e5e058418f`
Status: `NO-GO / OWNER_REPLAN_REQUIRED`

兩名盲審均獨立判 NO-GO。Reviewer A：P0 0、P1 1、P2 1；Reviewer B：P0 0、P1 2、P2 0。去重後為 **P0 0／P1 2／P2 1**。主線以 `node evidence/edx-core-3-undo-redo/review-round-05-repro.mjs` 對相同 SHA 唯讀重播，exit 0、JSON 結果見 `review-round-05-repro.json`：

1. **P1 — reorder 成功通知同步重入 Undo。** `runtime/deck-editor.js` 的 `move()` 先由 `syncText()` 建立可撤銷歷史，再交換 canonical/DOM 順序，接著在清除 history 前呼叫 `status('已調整順序')`。在 status setter 中呼叫 `api.undo()`，得到 `replayed=true`、canonical 順序 `[portable,portable-two]`、DOM 順序 `[portable-two,portable]`、revision 3、history 0。操作雖返回，兩個 authority 已分裂。
2. **P2 — 連續投影回退故障留下 preview DOM。** Gesture 提交前 `restore()` 在寫入 `left` 後拋錯；`finally` 的第二次 `restore()` 也在同點拋錯。canonical geometry 仍為 `(800,280)`，revision/history 皆 0，但 DOM style 留在 `top:290px`，起始為 `top:280px`。此情況要兩次 after-effect fault；單次 fault 的原測試通過。
3. **P1 — 外層 rollback 抹掉已回報成功的內層 operation。** Reviewer B 在 reorder 的 `insertBefore` after-effect 中呼叫 `api.executeOperation(edit-text)`，內層回報成功後外層拋錯；主線重播得 `nestedReturned=true`，但最終 title 恢復為 `prior`、revision/history 各 1。另在 gesture 收尾的 Undo disabled setter 中，趁 `finishing=false` 呼叫同一內層 operation 並拋錯；主線重播同樣得 `gestureNestedReturned=true`，最終 title、geometry、revision/history 全部回到操作前。Reviewer B 亦測得此窗口可啟新 gesture。根因是提交／回退期間缺少覆蓋所有 operation 的同步重入邊界；只擋 Undo 不足。

以上均為 fresh mounted fault probe，不是 browser 實測，也不是引用舊 SHA 的 verdict。先前 7/7 Repair3、54/54 Core2+Core3、1026/1026 非 browser、ZIP lifecycle／75 個 source byte-match 僅證明其涵蓋範圍，不能覆蓋 P1。產品 verdict 不待 browser 即為 NO-GO。

本卡授權的一輪 bounded Repair3 已用；未做產品 Repair4、未 merge／push／deploy，host browser／PGQ 仍 pending。
