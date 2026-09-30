# Reviewer A — Repair1 獨立唯讀複審

- Scope：`runtime/deck-editor.js`、`tests/edx-core-4-local-draft.test.mjs`，對比 HEAD `59a2a65d37df077864ddbf4d3613cf8a91577189`；讀 Mainline card 最新 Repair1 段，未讀其他 reviewer 本輪結果。
- **CODE NO-GO**：四個指定原反例已按 Repair1 目標修正，但新增待恢復 guard 使「不恢復、繼續編輯」沒有明示取代／恢復自動保存的路徑；另有草稿消失後 guard 不解除的故障路徑。此 verdict 只管 code，不涵蓋 browser host。

## 四個原 finding 的重播

1. **待恢復舊稿不覆寫：PASS。** `runtime/deck-editor.js:49` 設 `pendingRestore`，`:80` 在新提交時停止排程；同來源先存 `old`、重開讀到 `old`、未恢復而編輯 `fresh`，舊 storage bytes 保留，新 canonical 為 `fresh`。新 mounted 測試 `tests/edx-core-4-local-draft.test.mjs:190` 也通過。
2. **quota 探針失敗仍可讀：PASS。** `runtime/deck-editor.js:38`–`:51` 把可寫與可讀分開；獨立注入 probe `setItem` quota，狀態 `unavailable` 仍讀到 `old`；新 mounted 測試 `tests/edx-core-4-local-draft.test.mjs:213` 驗明示恢復及後續保存降級。
3. **寫入後讀回失敗結果不明：PASS。** `runtime/deck-editor.js:65`–`:76` 在 `setItem` 成功、`getItem` 失敗後報 `unknown` 並封鎖後續覆寫；獨立注入得到 `state=unknown`、實際 storage 已是 `new`，沒有假稱舊稿保留。新測試 `tests/edx-core-4-local-draft.test.mjs:240` 通過。
4. **恢復後段 fault 保留按鈕：PASS。** `runtime/deck-editor.js:856`–`:858` 的交易完成後，`:867` 才隱藏按鈕；新 mounted 測試 `tests/edx-core-4-local-draft.test.mjs:257` 注入 controls 後段 throw，驗 canonical/revision 回退、按鈕可見且下一次 click 可恢復。

## 新 finding

1. **[P1] 不恢復舊稿時，新編輯無法重新自動保存 — `runtime/deck-editor.js:78`–`:87`、`:867`；`tests/edx-core-4-local-draft.test.mjs:190`。** 使用者重開同來源後決定從原稿重新編輯，guard 對每次成功 canonical 提交報 `failed`，但唯一解除 `pendingRestore` 的 `markRestored()` 只在成功恢復後由 click 呼叫；UI 沒有 Mainline card 所要求的明示「選擇取代」入口。新測試只驗證舊稿保留，沒有驗證 fresh 編輯如何恢復卡片第 1 條的自動保存能力。這不是暫時錯誤：同一掛載中無可用操作解除 guard，必須另存 HTML／重開。建議給使用者明示取代舊稿的受控動作，保留舊稿直到該動作，然後驗證新 revision 的保存與重開恢復。
2. **[P2] 待恢復稿消失後 guard 仍永久阻止保存 — `runtime/deck-editor.js:45`、`:49`、`:80`、`:829`。** 掛載時成功 `read()` 設 `pendingRestore=true`；若另一個 tab／清站台資料移除 key，使用者按恢復時 `read()` 回 `null` 並隱藏按鈕，卻未清除 `pendingRestore`。獨立注入 `storage.delete(key)` 後，後續新編輯成功但 `commit()` 仍報 `failed`、storage 保持空；畫面不再有恢復入口。建議在可確認 key 不存在時解除待恢復狀態並重新建立保存路徑，與讀取異常保持區別，補故障回歸。

## 其他核對與 fresh 驗證

- CodeGraph 先查 source decision，未命中相關 editor source，後以 `rg`／當前 source／HEAD diff 核對。草稿仍只透過既有 `mutate` 最外層提交排程；無新 DB、第二 writer 或 pointer hot path 全 spec 序列化。成功恢復後再編輯的純 helper 重播得到 `saved` 與新 storage title；normal path 未因 guard 全面失效。
- Fresh `node --test tests/edx-core-4-local-draft.test.mjs tests/edx-core-3-transaction-boundary.test.mjs tests/edx-core-3-undo-redo.test.mjs`：**79 pass / 0 fail**。`git diff --check 59a2a65 -- runtime/deck-editor.js tests/edx-core-4-local-draft.test.mjs`：exit 0。
- mounted DOM/storage double 的 PASS 不證明 `file:`、profile、真 browser storage 或離線匯出 host 能力。本輪未啟 Chrome／PGQ，未修改產品、control 或 manifest。
