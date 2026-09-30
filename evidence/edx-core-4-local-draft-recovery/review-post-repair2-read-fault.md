# Core4 Repair 2 後 P1 與撤回裁決

Date: 2026-09-30
Verdict: CODE NO-GO / CORE4 NO-GO / 3 OF 6 / REPAIR 3 STOP

獨立複審指出 `runtime/deck-editor.js` 的 `createLocalDraft.read()` 在 `getItem(key)` 暫時拋錯時設 `blocked=true`，但後續成功讀到同一份合法草稿及 `markRestored()` 不解除此封鎖。`commit()` 先檢查 `blocked`，所以恢復後的新 canonical revision 不會自動保存，而通知仍可說「本機草稿已保存」。

Mainline 用當前工作樹的真 `createLocalDraft` 函式與最小 in-memory storage、受控一次讀取故障重播：先存合法舊稿，初次 `read()` 得舊稿；再令 `getItem(key)` 拋錯，`read()` 回 null、state=`failed`；解除故障後 `read()` 再得舊稿，呼叫 `markRestored()`；將 revision 改為 2、canonical 改為 `after-retry-edit` 並呼叫 `commit()`。結果精確為：

```json
{"state":"saved","jobs":0,"stored":"old"}
```

此結果證實後續保存工作沒有被排程，storage 仍是舊稿。現有 `tests/edx-core-4-local-draft.test.mjs` 的 Repair2 讀取故障案例只驗證故障當下不覆寫，沒有驗證故障解除後的恢復與再編輯。前次 focused 18/18、雙 viewport 24/24、四 PGQ 16/16 及 lifecycle cleanup 的收據保留為其已測範圍的歷史證據；`verification-repair2-final.json` 的 GO 裁決已由此收據取代，不得用作 4/6 結案依據。

有界修復方向：暫時 read fault 僅在後續精確讀到同來源合法草稿時可解除；草稿格式／來源無效或 `setItem` 後讀回結果不明須保持 fail-closed。完整回歸須覆蓋「有效舊稿→一次讀取故障→重試恢復成功→新編輯→pending/saved→storage 為新 canonical」。這是下一輪重新裁決的輸入，並非 Repair3 開工授權。依既定 Repair2 後停損，現階段不修改產品／ZIP、不啟 host／PGQ、不開 Core5；無 Core4 commit、push、merge、deploy。
