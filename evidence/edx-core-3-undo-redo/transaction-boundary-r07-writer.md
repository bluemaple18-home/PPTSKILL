# Core3 round-07 cancel checkpoint bounded follow-up

工作：Core3 取消投影 → 關閉 active gesture cancel after-effect throw 的回退缺口 → `WRITER_SCOPED_GREEN / MAINLINE_REVIEW_PENDING`。

起點 `fdc202b59f21ba08ea0e6499926eec56b58264b1`，branch `codex/edx-core-3-undo-redo`，PPTSKILL-canonical 原 worktree。產品基線 code `8ad5d6f`／ZIP `2f134de`。tracked 起始乾淨；唯一 Writer 依 Owner／Mainline 本 task 授權，未另派 agent、未新增 worktree。實體卡最後段與 `review-round-07.md` 已讀。

原 mode／group 兩個 P1 已由 Reviewer／主線確認 closed，本輪只將它們列入回歸，沒有重開功能盤點。A 的新 cancel P1 不受 B 的 GO 抵銷；原 verdict、FAIL、bug-exists repro 均原樣保留。

## 查詢與正確行為 RED

CodeGraph 實際 query：`createComponentInteraction cancel capturePreview transactFinish mutate publicLayout`，maxFiles=1。結果為 generation-plan／deck／grill-outline 等無關符號；依 embedded closure 已知索引缺口，改用 rg／既有原始碼追 cancel、capturePreview、mutate 的呼叫。

新四組測試完整照原 repro 的觸發方式：snap off/on × public setMode(false)/layout click；確認 preview 已到 top=290，projector 確實先寫 left 再拋同一 error。正確預期為 canonical DOM top=280、canonical/revision/history 不變、gesture 不復活。`transaction-boundary-r07-cancel-red.log.gz` 四項均因 290≠280 失敗，沒有 fixture／injection 錯誤。

另先建立 attribute fallback 無法寫回時的正確 fail-closed 反例。舊程式在已注入 cancel fault 後仍接受下一次 public mutation，`transaction-boundary-r07-fallback-red.log.gz` 因缺少應有拒絕而 RED。

## 實作與最小性

- controller.cancel 先保存目前 gesture 的既有 checkpoint 並清掉 gesture。正常 onCancel／restore 路徑不新增 snapshot、不讀 whole payload。
- 僅 active gesture 的取消拋錯時，以既有 preview 前 checkpoint 進入 `mutate` 的 attribute rollback／verification。不是把當下 preview 當成成功的 rollback 目標，也不恢復 gesture。
- private `recoverCancel` 是既有 mutate 的錯誤路徑接線：原 error 作為 rollback 原因，驗證沿用 fresh target／revision 與 checkpoint node 連接狀態；驗證成功後停止已取消的 vendor drag，再由既有 mutate 完成終態 controls rendering。成功回退仍拋出原始 error 身份。
- rollback 完成標記只在本次呼叫 stack 內使用；checkpoint 捕捉／回退／驗證未完成時設定既有 `rollbackFailed`，保留原 error 為 cause。沒有第二套 writer、authority、history、scene graph 或 transaction manager，也沒有放開同步 owner。
- attribute 無法恢復時不宣稱 DOM 已 canonical；明確 fail-closed，後續 operation／setMode 拒絕、Undo=false、payload getter 不被讀取，late end 不提交。
- 只改兩個 runtime 與 transaction-boundary test。未變更已關閉 mode／group 的成功分支，未擴散檢查其他功能。

## 實測結果與 evidence

本目錄 prefix：`transaction-boundary-r07-`。TAP 原 bytes 以 gzip 保存，未修改行尾或斷言；`gunzip -c` 可讀。JSON 保存確切 counts、source hashes／未壓縮 log hash。

| basename | 結果 |
| --- | --- |
| cancel-red | **0/4，4 FAIL**，四組均為指定 top 殘留缺陷 |
| fallback-red | **0/1，1 FAIL**，取消失敗後仍可寫入 |
| focused-01 | **5/5，0 FAIL**，第一輪實作即關閉上述反例 |
| core-01 | **9 檔、160/160，0 FAIL、exit 0**，原 mode/group closure、Core2/Core3、double projection、fallback failure、nested rejection、snap、hot-path 0 payload |
| full-01 | **原 81 檔、1061/1061，0 FAIL、0 skipped、exit 0**，原四個 PGQ 排除，最後 source hashes 已記錄 |

四組 recovery GREEN 額外核對原 error 身份、nested public mutation 拒絕、mode／selection／canonical／revision／history、component 與 snap proxy style、gesture=false、late end 不提交；隨後 public text operation 與新 gesture 均可成功。第五項核對 fallback 失敗的原 cause、實際 fallback 嘗試及持續拒絕寫入。

Focused runner 初次沿用 r06 的不存在路徑 `edx-wp1-s9-mounted-alignment.test.mjs`，在 source hash 讀取階段 ENOENT，尚未啟動任何 test；此事明確不是產品 RED。由 rg 確認實際檔為 `edx-wp1-s9-mounted-align.test.mjs`，只修本輪新 runner，歷史不改。詳 `transaction-boundary-r07-runner-correction.json`；因此本輪 focused 包含實際 9 檔，以 core-01 JSON 清單為準。兩輪既存 TAP 名稱差分確認 **153 + 5 個 R07 新反例 + 2 個 mounted-align 測試 = 160**，無其他增減；詳細名稱見 `transaction-boundary-r07-count-delta.json`。這是比對既存 log，沒有重跑 source 未變的測試。

重現指令（repo root）：`node evidence/edx-core-3-undo-redo/transaction-boundary-r07-run.mjs focused rerun-core-01` 或 `full rerun-full-01`。runner 拒絕覆寫已有 evidence，full 直接使用原 Mainline 81 檔清單。全量從 1056 增至 1061，僅因新增上述 5 tests。

## 保護與交回

- `transaction-boundary-r07-validation.json`：起點 SHA、最後三個 code/test source hashes、歷史 review／repro／FAIL evidence hash 與 diff check。`transaction-boundary-r07-protected.sha256` 與既有 protected-before 完全相同；四檔仍 untracked。
- 歷史全部保留，含原 bug-exists 腳本（未改成正確行為測試）；舊 ZIP claim 不延伸至本次 code。
- 未啟 browser、未跑 PGQ、未改 ZIP／AI Core／第三 runtime，未 merge/push/deploy，未啟新 reviewer。沒有第二次同類修正或無進展循環。
- 限制：此為 Node／VM／synthetic mounted 證據，沒有新的真 browser/vendor pointer 證據。交回 Mainline 重建 ZIP、固定 candidate 與原 Reviewer targeted re-review；本 receipt 不直接宣告產品 GO。回退單位為本輪明確路徑 commit。
