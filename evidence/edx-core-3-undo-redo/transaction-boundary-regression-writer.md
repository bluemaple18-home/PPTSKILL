# Core3 交易邊界 regression repair receipt

工作：Core3 transaction boundary → 修復 Mainline 23 FAIL 與 UI handler 原子性 → `WRITER_SCOPED_GREEN / MAINLINE_REVIEW_PENDING`。

起點為 `fd626e8875f9727fde8852da4e4e46eadf1208ae`，branch `codex/edx-core-3-undo-redo`，實體 repo/worktree 為 PPTSKILL-canonical。依本 task 的 Mainline／Owner 明示授權，shared workspace 唯一 Writer；未另派 Writer、未修改其他 worktree。產品歷史基線 `4a405cf` 的 NO-GO 不由本 receipt 改判。

## 範圍與依據

- 實體卡：`tasks/edx-core-3-transaction-boundary-replan.md`；原 zoom-out、round-05 與第一輪 Writer receipt 均保留。
- 本輪 CodeGraph explore query：`mountComponentInteraction runMutation mutationEvent publicLayout cropDialog executeOperationInternal download`。回傳 browser-geometry-qa 無關位置，未可靠定位 embedded portable closure；依既知索引限制以 rg／原始碼追呼叫。
- Mainline 81 檔原始全量 `transaction-boundary-mainline-nonbrowser.tap.gz` 與 JSON 保持位元不變，原值 1019/1042、23 FAIL。先由原 TAP 提取 11 檔、逐項失敗，保存 `transaction-boundary-regression-failures.json`，再原樣跑出 260/283、23 FAIL。
- 修改僅兩個 runtime、4 個直接相關 test files 與本輪 evidence。沒有新 writer、history、scene graph 或 transaction manager；沿既有 owner、operation、snapshot/rollback 與 mounted seams 修復。

## 23 項逐類判定

| 類別 | 項數 | 判定與修復 |
| --- | ---: | --- |
| Crop UI confirm/evidence/20MiB confirm/cover preview-commit | 4 | 真 regression。dialog 的私有提交改接 internal executor，維持 public facade 排他；preview/draft 不建立全 spec snapshot。 |
| S3 API-only VM、S18 API-only VM | 6 | 真 regression。layout=null 不進 Object.entries；DOM checkpoint 明確保存 deck 是否存在，兩次皆無 deck 是有效同態，失去原有 deck 仍拒絕。 |
| S7 cancel-click stale/invalid/no-op、snap stale release | 4 | 真 regression。gesture finishing 仍持 guard；取消／無提交在既有 finish 邊界清 proxy、selection，錯誤先驗證 rollback 再清理取消 UI，恢復尾隨 click 防護與正常零位移選取。 |
| S8 selection、S15 open/draft、S7 same-image click/refresh | 3 | 真 regression。入口分為 bounded guard 與真正 write snapshot；純 opening/draft/click/selection/layout refresh 不 clone 全 spec，保留 payload getter／serialize 硬斷言。 |
| S18 download reentry before/after | 2 | 真 regression。恢復既有 false＋status，拒絕發生在 syncText／export 前，不以 throw 取代已接受契約。Core3 對 download 的新斷言同步核對此契約，其餘 API 仍要求 throw，payload 不得讀取。 |
| stable identity regex | 1 | 靜態測試接點。保留 internal validateOperationRequest 的斷言，另斷言 public executeOperation 必經 runMutation；不刪 identity 行為覆蓋。 |
| S10 clearSelection 計數、S9 drag/resize cancel+clear 計數 | 3 | 接點失效。public facade monkeypatch 不再觀察 private method。S10 改計實際 selected marker 移除；S9 改計 vendor.stopDrag 與 selected marker 移除，仍各一次，保留 revision、canonical、pending／late release 與 selection 原斷言。 |

合計：19 項真正 regression；4 項靜態／觀測接點。未藉放寬預期數量或刪除 throws 修綠。

## UI catch 與終態投影

- Mainline 指出的 UI typography 反例先 RED：字級投影後 input.value setter 拋錯，handler catch 後 revision 留下 +1。`executeOperationInternal` 現沿既有 `mutate` checkpoint 自行回退，再把原 error 交給 handler。即使 handler 顯示 status 並 return，canonical、revision、history、DOM、selection 均無半提交。
- 純 UI guard 與真正寫入仍共用同一 owner；只有私有呼叫可用 `mutate`，public callback 沒有借權入口。private `render` 參數只控制終態 controls 呈現，不釋放 owner 或 finishing。
- 混合 click／keyboard handler 的真寫入分支於 rollback 範圍內完成最後 controls；不再由 bounded wrapper 在提交後多做一次會 throw 的刷新。圖片 fit 只在有效目標且值改變時使用外層 snapshot，同 fit 點擊仍零 whole-payload 讀取。
- 收尾另有實測 RED：IME compositionend 提交後「文字已更新」status setter 拋錯，canonical 仍提交。改用既有 operation afterCommit callback，把 status 放入同一 rollback；focusout／compositionend 不在提交後額外刷新 controls。此反例驗證同一原始 error 身份、canonical／revision／history／selection 與 pending DOM 保留。
- 原 reorder pending text、invalid component patch 保存 syncText、private paste-style、正常 Core2 group drag、preview checkpoint、double projection fallback 與不可驗證 rollback fail-closed 全部維持測試。

## 實測順序與確切 counts

所有檔名以下均位於本 receipt 同目錄；`.gz` 是原輸出 byte-preserving gzip，`gunzip -c` 可讀，JSON 記錄數量／測試路徑。

| evidence basename（transaction-boundary-regression-） | 結果 |
| --- | --- |
| focused-red | 11 檔，260/283，23 FAIL，重現 Mainline |
| focused-01 | 279/283，4 FAIL（剩上述測試接點）；中間迭代，非最終驗收 |
| focused-02 | 283/283，0 FAIL |
| ui-handler-red | 0/1，1 FAIL，UI executor catch 的 revision 殘留 |
| core-01 | 97/97，0 FAIL，原 96 加 UI handler regression |
| focused-03 | 283/283，0 FAIL，per-operation rollback 後重跑 |
| full-01 | 相同 81 檔，1043/1043，0 FAIL |
| ui-terminal-red | 0/1，1 FAIL，IME 終態 status 在提交後拋錯 |
| core-02 | **98/98，0 FAIL**，原 96 加兩個 UI regression |
| full-02 | **相同 81 檔，1044/1044，0 FAIL、0 skipped、exit 0**，最後 source 狀態 |

Core 組合：`node --test --test-reporter=tap --test-concurrency=1 tests/edx-core-2-group-lock.test.mjs tests/edx-core-3-undo-redo.test.mjs tests/edx-core-3-transaction-boundary.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/edx-wp1-s4-interaction.test.mjs`。

完整測試路徑在 `transaction-boundary-regression-full-02.json`，與 Mainline 的 81 檔完全相同，仍排除其指定的四個 PGQ。可由 repo root 使用 `node evidence/edx-core-3-undo-redo/transaction-boundary-regression-run.mjs full rerun-01` 重現；此工具拒絕覆寫已有 evidence。focused 模式重跑原 11 檔。

## 邊界與交回

- `transaction-boundary-regression-validation.json` 記錄最後六個 code/test 的 SHA256、原 evidence hash 與 diff check。`transaction-boundary-regression-protected.sha256` 與第一輪 protected-before 完全相同，四檔仍 untracked。
- 歷史 FAIL 不改判、不改寫；原 96/96 evidence 也原樣保留。本輪新增兩條正確行為 RED → GREEN，最終 1044 不同於原 1042 的原因僅是這兩條新 test。
- 限制：這是 Node／VM／synthetic mounted 測試，沒有真 browser／PGQ／ZIP lifecycle／ZIP byte-match 證據，沒有重新啟動兩名 reviewer。Mainline 接固定 commit 的獨立 review 與 ZIP，產品 GO 由 Mainline 裁決。
- 沒有修改其他 runtime、AI Core、ZIP、Mainline 控制卡；沒有 merge、push、deploy。回退單位為本次明確路徑 commit。
