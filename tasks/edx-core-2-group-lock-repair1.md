# Core2 群組／鎖定 Repair 1

Status: CLOSED / REPAIR1_GO
Branch: `codex/edx-core-2-group-lock`
Start HEAD: `81fd40926f2a303184e3175971b5df3d3a906943`
Reviewed runtime: `2bb1aafcc12694fa64a972e3bb76c9b3618d1cdd`
Parent: `tasks/edx-core-2-group-lock.md`
Reviewer: Ramanujan；原 verdict 見 `evidence/edx-core-2-group-lock/review-initial/REVIEW.md`。

## 任務與邊界

只修兩項已證實 finding。GL-R1（P1）：原生 Moveable 群組 SE resize handle 被 child default line 蓋住；先驗證既有 vendor 的 group-only `hideChildMoveableDefaultLines:true` 是否能讓中心 hit-test 命中 handle，並保留原生 group resize 事件。GL-R2（P2）：`commitGroup` 已完成 `layout.refresh()` 的副作用後拋錯時，canonical／revision 已 rollback，但互動投影的 target／handles 未恢復；用 after-effect fault injection 重現並恢復投影，保留原始例外，不加第二套狀態。

唯一 Worker 可改 `runtime/component-interaction.js`、`runtime/deck-editor.js`、`tests/edx-core-2-group-lock.test.mjs`，以及需要核對 handle 命中與原生事件時的 `tools/edx-core-2-group-lock-browser-cases.mjs`。其他 delivery、schema、group contract、ZIP、control/evidence、protected 四檔與 AI Core 都不可改。若最小修法須越界，停止並回報證據；勿自行擴大。Worker 不啟 browser、不 build ZIP、不 commit／merge／push／deploy；主線是唯一驗收與整合者。

## 驗收

1. 保留 GL-R1 host04 原始 FAIL；修補後由主線正式 host browser 重跑 1280×720／1600×900，handle 中心可命中 SE，取得真 `resizeGroupStart/update/end`，canonical 與 DOM 成員比例符合預期；後續 lock/unlock/ungroup/export/reopen 仍通過。
2. 保留 GL-R2 原始 failing probe；新增最小 regression：`refresh` 先執行再 throw 時，原始 operation error、spec、revision、selection、target／handles 都恢復；避免因 rollback 二次例外掩蓋原始失敗。測試應證明實際投影，而非只比對 canonical。
3. Worker 留 RED→GREEN、focused 與受影響 scoped 的具名測試計數、`git diff --check`、變更檔案與尚未處理風險。主線接著重跑必要非 browser／ZIP lifecycle／source hashes、正式雙 viewport 與受影響 PGQ，再送原 Reviewer targeted re-review。

## 模型與停止條件

厚度：strict/core-bounded，但本次 Repair 只處理兩個固定 seam。規則首選 GPT-5.5 high；native subagent 此 host 無該型號，也無 Terra/Luna。此輪用 runtime-native clean `fork_context=false`、**繼承 Astra／medium**，不更動主對話模型，也不宣稱達成原定便宜模型成本。單一 shared Worker 為唯一產品 writer，Mainline 同期僅寫 control/evidence。Repair generation=1；若同一 P1 經修復仍無法在受管 browser 命中，停止並回主線裁決；不得自動開 Repair 2。

既有 Crop F2 P2 不屬此卡；群組 8px snap 未列入契約。未完成 browser、PGQ 與原線 re-review 前，Core2 仍為 1/6 進度中的第2張，不標 GO。

## host05 驗收退件（同一 Repair 1）

Candidate `2d053034fecd445839d971e67d3dd454f4fa0fa0` 在 1280×720 已通過 GL-R1 真 SE 命中、trusted group resize 三事件、canonical／DOM 比例；host05 原始 `NOT_PASS` 與清理證據見 `evidence/edx-core-2-group-lock/host-acceptance-05/`。後段第 88 行 minimum 整組拒絕斷言失敗：`gesture('resize', -700, -200)` 的 mouseReleased 到 (187,296)，但 Moveable 只把前兩個中途 update 送進 controller，最後一個有效 preview 被提交。這是本卡原已列明的「minimum 整組不提交」驗收缺口，仍屬同一 Repair 1；先只檢查 group resize 的 end 事件是否有可信 pointer 座標，若有，應用 release 座標更新最後候選並讓既有 validator 拒絕，不建立第二套 pointer engine。補 bounded regression；單元件舊路徑與正常 group resize 不變。若 vendor end 無可用座標或不符合此歸因，停止並回報，不重跑 browser 猜測。

結果：同一 Worker 在 `88f401c7798976babfd28df991a6ba5b6b784e4e` 收斂三條上述路徑；Mainline full 995/995、雙 viewport browser 各 27 checks、PGQ 單輪16/16及 lifecycle／cleanup 全 PASS。原 Reviewer targeted CODE GO 與 whole-card GO，詳 `evidence/edx-core-2-group-lock/review-final/REVIEW.md`。沒有 Repair 2。
