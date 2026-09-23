# S18 獨立唯讀審查

日期：2026-09-24。狀態：審查交回，STOP。未讀其他 Reviewer 或主線的新 verdict。

- **CODE_REVIEW：PARTIAL**。固定產品 candidate 的 delete-element rollback／reentry 抽查未發現阻塞問題，13 項 focused tests 通過；本輪沒有足夠獨立證據給整體產品 GO。
- **DIAGNOSTIC_PLAN_REVIEW：NO_GO**。F1 的診斷 log 寫入失敗會跳過 controller 後續收尾；F2 亦違反 wrapper 保留原退出語意的要求。建議先做 bounded 修正及 synthetic 驗證，再由主線決定是否執行第二輪。
- **MAINLINE_ACCEPTANCE：PARTIAL / HOST_BROWSER_PENDING**。第一輪失敗仍有效；未執行第二輪，不由主線 fresh 非瀏覽器 tests 推導 host GO。

## 固定輸入與唯讀邊界

`<repo-root>` = `/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical`；`<ai-core-root>` = `/Users/matt/ai-core`。

- base：`e3b90a8969f6d25416e746feefecba718d8d8931`
- candidate：`84ea9381cb438491449b6d871fbaeedea5e55b98`；其 parent 與 base 相同。
- HEAD：`c025f9147018deefefa8685c6b18fec7210b316c`；candidate→HEAD 只有 `tasks/edx-core-six-card-closure-plan.md`。
- AI Core HEAD：`81c80ffa349c58b0bb5006f7430ca1624b337774`。
- 更正 preflight 已讀為 PASS，chain worker_count=1、review_count=1；未建立新 Worker／Reviewer／子 agent。先前被叫停的 turn 沒有執行工具。
- 已讀指定 handoff、兩張 task 卡、review-input-hashes、source-hashes。CodeGraph 已對兩 repo 實際 query；未完整命中目標，因此退回指定檔案及必要 callers/tests 的 bounded rg/read，沒有建索引。

實測診斷檔 SHA-256 均與 review-input-hashes MATCH：

| 路徑（相對 repo） | SHA-256 |
| --- | --- |
| evidence/edx-wp2-s18/host-controller.py | bef9bb8e70f236776394cf265b7811dc6003b2a2d09d36451900869586c38958 |
| evidence/edx-wp2-s18/host-controller-diagnostic.py | 0d23c9934698b8ad0e97f7a44b9d43aa1d714e48f539a32dff4e941e8d615d88 |
| evidence/edx-wp2-s18/resource-observer.py | 4903066302c4627e6c4525417f37f59383683073c652610c3b1052b9b04c779c |
| evidence/edx-wp2-s18/resource-observer-selftest.json | 9e24b9304bd247340080e993675162764727e228df35a46e7ada337b9394ccac |

AI Core 唯讀4檔、source8、protected4 全部 MATCH；source8 另逐一與 candidate Git blob byte-match。ZIP 實測 2,301,572 bytes、SHA-256 `5ccedbc43af3f23f9582ed989c635479be10065752d231fefa4bf2104ff3ec74`，checksum 檔一致；ZIP 內 component-deletion.js/deck-editor.js 與 source byte-match。

完整實測值：[input-verification.json](/private/tmp/pptskill-s18-blind-probe-20260924/input-verification.json)。收尾 [final-integrity.json](/private/tmp/pptskill-s18-blind-probe-20260924/final-integrity.json) 確認以上檔案全未變、Git status 與起始相同、host-acceptance-02 不存在。既有 BACKLOG dirty 與 untracked 輸入未處理。沒有修改 repo/evidence、AI Core、ZIP 或 protected4；沒有啟 browser、呼叫 host controller、執行 tmp_session 主入口、commit/push/merge 或全套產品 tests。

## Findings

### F1 — [P1] finally 的 log open 失敗會跳過 supervisor 收尾

- category：reliability / teardown；confidence：高（控制流程與 synthetic 重現一致）。
- path:line：`evidence/edx-wp2-s18/host-controller-diagnostic.py:68`；原 `host-controller.py:66` 同樣存在，非本輪 wrapper 新引入。
- trigger/repro：已有 endpoint 且 supervisor 仍活著，`browser-close.log` 的 open 因 ENOSPC／EACCES 等失敗。open 位於內層 try 之外，而 supervisor.wait／terminate 在其後，沒有另一層 finally 保護。
- evidence：本輪自有 [finally-probe.py](/private/tmp/pptskill-s18-blind-probe-20260924/finally-probe.py) 僅重現相同順序，未載入或呼叫 controller；Mock supervisor 配合 ENOSPC，得到 waitCalls=0、terminateCalls=0、receiptAfterBlock={}。[結果](/private/tmp/pptskill-s18-blind-probe-20260924/finally-results.json)。
- risk：controller 無法完成原定 Browser.close、25秒 wait／terminate、root/marker 核對及 receipt。受管 supervisor 可能繼續到自己的 stop/TTL；不能保證本次 controller 的有界收尾，也不能宣稱 immediate cleanup。**沒有證據證明永久程序洩漏，亦不指稱第一輪就是這個原因。**
- suggested_fix：將可失敗的 Browser.close log 開啟也納入錯誤處理，以獨立 finally 保證 supervisor wait／必要 terminate 一定被嘗試；寫診斷失敗不得阻止既有 cleanup 核對。保留既有 timeout、owned process-group 與 fail-closed 條件。
- validation_gap：補 log open/write 失敗及 close 命令失敗的隔離測試，確認收尾仍走完、仍為 NOT_PASS，且不接觸非 owned 資源。本輪只測 mock 流程，未啟真程序。

### F2 — [P2] observer 的 finally 寫檔例外取代原 SystemExit

- category：correctness / diagnostic exit semantics；confidence：高。
- path:line：`evidence/edx-wp2-s18/resource-observer.py:68`、`:72–73`。
- trigger/repro：被包裹程式已完成並退出，最後讀 scanner hash／開 diagnostic／JSON 寫入失敗。
- evidence：對原 observer.main 執行 synthetic probe，以 runpy stub 取代 tmp_session 執行，stub 標記已完成後分別 SystemExit(0/2/143)。正常 sink 保留三個退出碼；注入 diagnostic open ENOSPC 時三者均改成未捕捉 OSError（一般程序 exit1），原 SystemExit 只留在 __context__；trace 均已恢復。[observer-results-v3.json 的 wrapper_finally](/private/tmp/pptskill-s18-blind-probe-20260924/observer-results-v3.json)。
- risk：把成功、resource-stop、signal 的原退出語意混成 observer 失敗，並丟失本輪目標 diagnostic 檔。仍 fail-closed，**不是誤報 PASS，也沒有證明這個外層 finally 會撤銷已完成的 helper teardown**。
- suggested_fix：保留原執行 outcome，將診斷輸出失敗另外記錄；已有非零退出不可被 sink failure 蓋掉。原退出0但診斷失敗則明確使「診斷驗收」不通過，controller 必須另核 diagnostic 完整性，避免只看原退出0就 PASS。
- validation_gap：既有 selftest 沒驗 wrapper main/finally 或 sink failure；需補 0/2/signal × 正常／失敗 sink，並涵 final hash 讀取失敗。本輪未注入 final hash 讀失敗，其同樣可拋出是靜態證據。

### F3 — [P2，非獨立阻塞] 跨掃描以 id(error) 永久去重會漏記不同錯誤

- category：diagnostic completeness；confidence：高（漏記），中（實際 host 影響）。
- path:line：`evidence/edx-wp2-s18/resource-observer.py:29–30`。
- trigger/repro：observer 不保留 error object，卻永久保存其 id；舊例外釋放後，新 OSError 可重用相同地址。
- evidence：同一 observer synthetic 執行12次 scanner failure，各自不同 filename `repeat-0`…`repeat-11`，scanCalls=12，僅記2次（repeat-0、repeat-9）；12次均維持原 NO_GO。[同份結果的 repeated_errors](/private/tmp/pptskill-s18-blind-probe-20260924/observer-results-v3.json)。
- risk：後續掃描的不同 errno/path 可被錯當成同一例外传播而漏記。真流程第一個 resource failure 會停損，不會照本 probe 跑12輪；但 cleanup 的 count_artifacts 會再走同一 browser scanner，因此不能把 captured list 視為完整錯誤清單。未證明第一輪或實際兩次掃描已漏記。
- suggested_fix：去重生命週期限於同一次 scanner invocation，避免用已釋放物件地址作跨次 identity；不要無界保存 traceback/frame。
- validation_gap：補兩次獨立掃描錯誤與單次遞迴传播的區分；本輪12次重现是機制證據，非 host 次數模型。

未發現 P0；沒有另外提出 P3。

## 例外、停損與 teardown 的實際判讀

`tmp_artifact_lifecycle.py:1126–1133` 將 root open、visit/scandir/stat/child open/close 的 OSError 包成 LifecycleError，仍保留 `__cause__`；`:1140–1145` 把它轉成字串，故原 controller log 失去 errno/path。handoff 把 child os.open 指為1099，實際呼叫在1100，1099是目錄判斷。

正常 resource failure 經 `run_child:1182–1212`：取樣後先保留 signal／child 已退出優先序，再記 resource-stop、SIGTERM；群組不收斂時 SIGKILL，最後 detach/wait，resource-stop 回2。`command_run:1267–1293` 在 operation_complete 後執行 exact-owned cleanup、按 root 清理結果決定 marker，再 release lock。無法確認 operation complete 的例外走 preserve_unknown_isolation，不應假稱 cleanup PASS。

本輪用真 scanner + 真 run_child，僅 process/group 與 OS fault 作程序內 mock：EIO 仍輸出相同 NO_GO，觀測到 errno/path，send順序15→9、detach一次、return2。沒有 spawn 或實際送 signal。這證明受測正常 OSError 路徑維持 fail-closed；不等同真 host 群組收斂已驗收，也不保證 observer 自身任意例外均不干擾 lifecycle。

sys.path 插入的是已固定 AI Core scripts，runpy 目標是解析後的 tmp_session.py，`sys.argv` 轉交原參數，`sys.dont_write_bytecode=True`；本輪未發現新增 shadow module 的具體問題。trace/filter 不改 scanner 邏輯，line/opcode 已停用，但 global Python call tracing 仍有成本。

512個檔案小 fixture、7次各組測量：未 trace median 1.042ms，trace 1.607ms（約1.54倍）。數量/bytes一致、正常掃描無 OSError 誤報。這只是小型成本探針，**不能推出 host 12秒 readiness 或5秒 scanner 的裕量**。原 scanner 的完成時間也納入 deadline，因此負載接近邊界時額外成本可改成 NO_GO；不應放寬門檻或把 diagnostic run 等同無觀測器 baseline。

## Product rollback／reentry 抽查

- `component-deletion.js` 的 exact payload、confirm=true、membership/geometry、composition refs 與 surviving IDs 檢查；Node 先更新 candidate 再 commit。
- `deck-editor.js:535–550` 在 DOM 變更前驗 canonical、connected/unique DOM 與內容，remove before/after throw 會用保存的 parent/nextSibling/insertBefore 還原；`:551` 才 commit canonical/revision。guard 在 validator、applyPatch、serializeHtml，且以 finally 釋放。
- 本輪實際執行：`node --test --test-concurrency=1 --test-name-pattern='remove-before|remove-after|同步重入|reentry' tests/edx-wp2-s18-delete-element.test.mjs`。
- 結果：13/13、fail/skip/cancel/todo均0；涵 removal前後 throw、重入 operation、applyLocalPatch、prepareExport/exportHtml/getSizeReport/download。原 assertions 檢查 canonical、DOM、revision、selection/gesture及半完成 export；[完整 log](/private/tmp/pptskill-s18-blind-probe-20260924/delete-focused.log)。candidate scoped diff --check 通過。
- 這是既有 mounted double，沒有真 browser layout／pointer／dialog 證據。本輪不把 tests 未涵蓋的任意 DOM monkeypatch 或 callback 故障猜成產品 blocker。全產品 CODE_REVIEW 保守維持 PARTIAL。

## 既有 evidence、未驗證與後續最小方案

已直接核對第一輪 controller-receipt、launcher stdout/stderr、PGQ log、lifecycle session.json/stderr：readiness=0、deleteElement=0、pgq=1、supervisor=2；PGQ10項、7 pass/3 fail；resource observation I/O failure；無成功 Browser.close。root/marker absent 是既有 receipt 的紀錄，不由此推導完整 cleanup PASS。PGQ 的 producer 中断／JSON 不完整可見，但原 errno/path 與精確系統呼叫仍 unknown；不能判斷磁碟滿、瞬間刪檔或產品 regression。

既有 resource-observer-selftest.json 的成功只支持其合成正常／scandir失敗案例。handoff 所載 scoped449/full945/targeted21+21 是既有主線紀錄；最新使用者告知 fresh71/449/945 完成，本輪未重讀或重跑，不當成獨立測試。未讀別人新 verdict。

後續限於：先處理 F1/F2 並補隔離 failure-path probes；F3 在同一小範圍修正或明示觀測不完整。之後由主線另行准入新 evidence 目錄，維持原容量／readiness／timeout／owned teardown，跑既定 targeted双viewport與PGQ單輪16，確認 observer診斷有效及原退出狀態、Browser.close、root/marker、source/protected/ZIP全契約。同 blocker 再現即停；保留第一輪FAIL，不以重跑抹除。本輪不提出改 AI Core 或再擴掃。

本輪產物只有本報告及 `/private/tmp/pptskill-s18-blind-probe-20260924/` 自有 probes/logs。有效 observer 結論採 v3；v1曾有結果物件引用使正常 events 欄在稍後被改變，v2重用自身 diagnostic檔名使部分 wrapper case 卡在禁止覆寫 assert。已只修正自有 probe 快照／檔名，v3另加六個 wrapper outcome assertions 後通過；早期自有 logs 保留，不用它們宣稱產品故障。自有512檔 fixture已移除。

重播 observer probe 前須改其自有輸出目錄／diagnostic檔名前綴，勿覆寫既有紀錄。**STOP：沒有修碼、再次派工或執行 host 驗收。**
