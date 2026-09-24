# Core3 Undo／Redo Repair 3 — Owner 裁決提案

Status: `PROPOSED / NOT_AUTHORIZED`
Base product／ZIP candidate: `60a05ce33924dfd92c2977d743b24afc408dd207`（NO-GO，不得整合）

## 授權問題

`edx-core-3-undo-redo-repair2-approval.md` 明定「此卡不授權 Repair 3；若同類再次 NO-GO 或需改別的 runtime，停回 Owner 裁決」。兩名 Reviewer 的 NO-GO 與主線三項重播已記於 `evidence/edx-core-3-undo-redo/review-round-03.md`。本提案只固定下一次決策內容，並不自行啟動修復。

## 若 Owner 授權的一次 bounded 產品修復

目標僅關閉三項已重現 P1：

1. `component-interaction.js` gesture 提交成功後的 projection／restore after-effect throw，不得讓呼叫結果與已提交 canonical／history 互相矛盾；同時保留失敗狀態可辨識。
2. gesture 收尾與 Undo／Redo 控制列更新期間的同步重入，不得 replay 尚未安全結束的 gesture。
3. `deck-editor.js` 有效 reorder 失敗時，pending text、順序、revision、history 須按 operation 契約一起回退或一起提交。

先以既有 `review-round-03-repro.mjs` 固定三項 RED，再用最小改動修到 GREEN；不得把三項 after-effect 故障改成靜默成功，也不得刪除舊反例。範圍限既有 Core3 operation／interaction seam 與直接受影響測試，不新增 history authority、runner、schema 或跨卡功能。若必須動其他 runtime、改契約或無法在一輪 bounded 修復內關閉，立即停回 Owner。

## 驗收與依賴

先做 focused／affected scoped、非 browser full、ZIP lifecycle／來源 byte-match，再由兩名原 Reviewer 對同一固定產品 SHA 做 targeted re-review；P0/P1 歸零才進正式 host frontier。Host04 AI Core observer 仍是獨立 blocker：scanner `427162d34af5be6f3269c418f141716130909ce3fea82b5e3b4431732ebfdd6c` 的 ENOENT／`IO_ERROR_OBSERVED` 尚無適用修復證據。observer 未閉合前不盲目重跑 PGQ／Host05；不把本地 attach-only 測試或 7/10 PGQ 當 PASS。待適用 host 處置證據就緒後，再按原 Core3 acceptance 契約驗雙 viewport、四支 PGQ 串行、managed cleanup；若產品 SHA 變更，舊 browser／ZIP 結果不能當新候選驗收。

模型／成本：一名既有產品 Writer 依 bounded strict/core 路由執行一次 repair，主線負責驗收與退件；兩名盲 Reviewer 保持獨立。不得並行第二 Writer，不預先授權 Repair 4、merge／push／deploy 或 Core4。

Owner decision: `PENDING`。
