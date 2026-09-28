# Observer R2 — 獨立盲 Reviewer A

日期：2026-09-28。工作：R2 code／host 收尾審查 → 已完成唯讀審查與離線 probes。

## Verdict

- **CODE GO**：指定 scanner/tests/docs 與 controller/observer/test 未發現需要阻塞的 correctness finding。
- **Host-execution readiness：CONDITIONAL GO，交 Mainline 解鎖單次 smoke；目前不可直接執行。** `FROZEN_REVIEW_PENDING` 是正常防誤啟狀態，不是 finding。Mainline 須完成另一份獨立 review 的裁決、確認固定檔案 identity、正式環境 capacity admission、無既有 isolation marker，再依既有授權將 manifest 切到 `REVIEWED_FOR_SINGLE_HOST_SMOKE`。本 reviewer 未修改 manifest，也未替 Mainline 完成上述控制面裁決。
- **HOST PASS：NOT_RUN／未證實。** 未啟 Chrome、host smoke 或 PGQ；CODE GO 不代表 host applicability、canonical adoption 或產品驗收。
- 真 AF_UNIX socket 驗證在本 sandbox 被 `EPERM` 阻擋。此結果不能寫成全部 tests PASS；Mainline 應核對其同候選正式環境 socket evidence。本 review 沒有獨立證實該項 host 行為。

## 範圍與來源

任務卡：`tasks/edx-core-3-observer-r2.md`；契約：`observer-r2-preflight-contract-20260928.md`。未讀取其他 Reviewer verdict。

`<candidate>` = workspace `.work/ai-core-observer-r2-20260928`；base `c23e465`，HEAD `4edd0747a25b13920b3ab1ead99895a99dbe8964`。commit delta 僅 3 檔；candidate 原有 untracked `CLAUDE.md` 保持原狀。CodeGraph 實際 query 回覆無索引後，改用限定檔案 `rg`、source 與 diff，未掃全 repo。

`<evidence>` = `PPTSKILL-canonical/evidence/edx-core-3-undo-redo`。額外讀取原 `tmp_session.py`、`SignalController`、`run_child`、`command_run`、`cleanup`，追蹤完整 launch/handler/finally；沒有僅憑 scanner fixed diff 判斷 host 安全。依 `code-review-gate` 比對 Spec 與 Standards；既有雙 Reviewer 分工不另開 dispatch。

固定 SHA256 詳見 `observer-r2-review-a-validation.json`。scanner：`0e411a0c970ae17f9fac805b5d3010ebc0742a5b6b774eb15b8c06137ffe8edf`。probes 前後 7 個 delivery/manifest 檔 hash 一致；candidate 三個 tracked delivery 檔與 HEAD 一致。PPTSKILL hashes 在本次 probes 開始時建立，並非宣稱具有更早的外部封存時間證明。

## Spec / Standards 判定

| 契約 | 審查與離線證據 |
| --- | --- |
| browser runtime 限定 | scanner:1090 僅 `browser_layout and limits` 開 retry；general 與 `limits=None` 單次 traversal。unknown I/O、非 ENOENT 的 FileNotFoundError 維持拒絕。 |
| root / parent identity | scanner:1098、1135、1177、1191 檢查 device/inode、directory type、pathname 與 fd；root 初始失敗不進 attempt；目前開啟 parents 在 retry 前仍須有效。替換/消失、stat→open 替換與正常 visit 後替換均拒絕。 |
| sticky ceilings | scanner:1149 起每筆已觀察 bytes/files 立即比較；budget exception 不經 OSError retry 路徑。byte/file 超額均只跑一次 attempt。 |
| attempts / entries / deadline | scanner:1198 最多兩次；僅首次已驗證 descendant ENOENT 重取。started/deadline/entries 都在 loop 外；只重設 totals。實測第二次 ENOENT 拒絕、1025/1024 entries 拒絕、跨 5 秒拒絕。 |
| 完整重掃、非 partial PASS | rename 同 parent/跨 parent、stat 前消失、directory open 前消失均有 fixture；第二份 totals 完整。另補 descendant enumeration ENOENT 成功重取與 root enumeration ENOENT 拒絕。 |
| special/no-follow 不變 | symlink/FIFO/socket metadata 拒絕；browser allowlist 與 cleanup 計數保留。真 socket bind 受 sandbox 阻擋，未視為 scanner failure。 |
| cleanup/general 不放寬 | 既有 timeout/completion/large/default/no-limits 回歸通過；cleanup count failure 仍傳回原 LifecycleError，即使 exact-owned fixture 已被刪除。foreign sentinel 保留。 |
| diagnostics | observer 的 call/exception/return 保存首次事件、attempt、phase、entries、partial/final counts；只有 tuple return 視為 COMPLETE。trace failure 留 diagnosticErrors，不改 scanner outcome；先前 trace 在 finally 還原。 |

Spec：在本次可執行的離線範圍符合封板；host acceptance 尚未做。Standards：tuple/error/public launcher contract 不變；無擴 ceiling、allowlist 或第二 runtime；docs 清楚承認非原子 snapshot。`git diff --check c23e465 4edd0747` 通過。

## 獨立 host 副作用 failure-state matrix

以下區分 source trace、mock 重現與尚待真 host 的事實；本表不宣稱完整 host 故障注入已執行。

| 入口 / handler / finally | 副作用及失敗狀態 | 收斂、證據與限制 |
| --- | --- | --- |
| controller:270 前置 gate | pending 或 sandbox 不合格 | 在 OUT mkdir/Popen 前拒絕；獨立 mock 驗證 pending 沒有 mkdir、沒有 launch。 |
| controller:103、280 起 | 建立本輪 OUT、identity/hash/capacity/marker preflight | preflight 失敗不啟 supervisor；receipt NOT_PASS。OUT 已存在則在主 try 外拒絕，不覆寫既有輪次。磁碟無法寫 receipt 時無完整 receipt，不能算 PASS。 |
| lifecycle:1307–1343 | repo/admission locks、isolation marker、planned root、manifest/profile/cache/tmp | 中途失敗保留 unknown isolation；operation_complete 未成立時不得假設 root 已清除。admission lock 在 inner finally 釋放；正常外層收尾釋放 repo lock。異常清理 I/O 中斷仍須視為未證實。 |
| tmp_session:26 / run_child:1234 | Popen child group、輸出 browser-starting、重導 log、exec Chrome | announcement 早於完整 readiness；controller 必須綁定 manifest/marker/root inode，讀取完整 DevToolsActivePort 才記 ready。spawn/exec/ownership/readiness 失敗不續跑 CDP；可能沒有 endpoint/owned binding，不能以未知 root 當已清理。 |
| SignalController:134–195 | SIGINT/SIGTERM 暫存與 exact anchored group forwarding | 離線 mock 證實 attach 前不送、attach replay、first signal 保留、killpg error 保存、detach 後不送；沒有對真程序送 signal。run_child 保留 signal 優先權，不以後到 scanner reason 覆蓋。 |
| run_child:1259–1305 | sampling/TTL/resource stop、TERM→KILL、group observation/reap | budget/unknown observation 觸發 stop；group 無法確認收斂則不宣稱安全清除，command_run 保留 unknown marker。這些原 lifecycle 控制流程本次未改；實際 Darwin group/Chrome 收斂未驗。 |
| controller SMOKE_JS:29–89 | owned target、CDP listeners、data URL navigation | listeners 在 navigate 前；錯誤保存 firstCause；JS finally 關 own target。fake WebSocket 成功/頁面錯誤都驗證關閉 target；Node timeout/崩潰時改由外層 Browser.close 收尾，不能算正常 target close。 |
| controller:229 finish_supervisor | Browser.close 子程序及 log、wait 25s→terminate→wait 30s | close timeout、log create 失敗仍進 wait/terminate。独立 mock 也驗證 terminate 失敗／第二 wait timeout 保存 cleanupError，沒有 supervisorExit 成功值。沒有盲目 kill 未驗證 process。 |
| controller:330 起 finally | 核對 owned root/marker absence、before/after hash、capacity、diagnostic | close/supervisor/root/marker 任一缺證據均 NOT_PASS。firstCause 不被後續 cleanup error 蓋掉；observer UNKNOWN/FAILED、unfinished、diagnosticErrors 或缺 cleanup scan 都拒絕。 |
| lifecycle:818 cleanup | 匯出 evidence、嚴格 count、刪 exact-owned root、OWNED_ROOTS.pop | count ENOENT 不 retry；獨立小真 fixture 證實原錯誤保留、已綁定 root 刪除、foreign 檔保留。rmtree/copy/marker 清理失敗不能等同成功，需保留 lifecycle/controller stderr 與未知狀態。 |
| observer:99 main/finally | journal、trace、argv/path 暫時替換、最終 diagnostic | finally 恢復 trace/argv/path；journal write error 記 diagnosticErrors；最終 export 失敗且原 exit 成功時改 exit 74。原失敗優先保留；無診斷不得宣稱 host PASS。 |
| controller 外層 abrupt termination | controller 本身沒有 SIGTERM handler；SIGKILL/強制終止不執行 Python finally；收尾中再次 KeyboardInterrupt 也可能打斷 receipt | 不能承諾這類事件有 Browser.close/receipt。正常活著的 supervisor 尚有自己的 TTL/signal 控制，但無法由此推論已收斂；host 中斷應停線並核對 survivor/root/marker，而非重跑或手動猜 root 刪除。此為運行限制，非本 delta 引入的新 retry 放寬。 |

## 驗證與重現

在 workspace 根目錄，使用指定 Python：

```sh
/Users/matt/ai-core/.venv/bin/python -B PPTSKILL-canonical/evidence/edx-core-3-undo-redo/host-smoke-r2-test.py
/Users/matt/ai-core/.venv/bin/python -B PPTSKILL-canonical/evidence/edx-core-3-undo-redo/observer-r2-review-a-probes.py
```

- `observer-r2-review-a-host-tests.log`：13/13 通過，包含 frozen identity、75 source/4 protected/ZIP 檢查、observer 與 fake WebSocket；沒有網路/Chrome。
- `observer-r2-review-a-scanner-tests.log`：36 項，35 通過、0 assertion failures、1 environment error、0 skip。error 為 `test_real_socket_is_rejected_without_retry` 的 AF_UNIX bind `PermissionError: [Errno 1] Operation not permitted`（tests:2437）。未在 sandbox 轉成 skip/PASS，也未提權啟 host。
- 自有 runner 保留原 R2 suite；只對選定自带 tempfile 的 legacy scanner 方法略過會 git init/add/commit 的不相干 setUp。沒有 commit/push。最初 ad-hoc 載入缺 scripts import path；修正只在 Reviewer runner，未改候選。
- 新增 handler/cleanup probes 後重跑一次仍遇同一 socket EPERM；不再重試此 blocker。最終 runner 在此環境預期 exit 1，原因如上，不隱藏成全綠。
- probes 寫小型 temporary fixtures 並清除；只保存 `observer-r2-review-a*`。delivery、canonical、candidate manifest 未修改。

沒有需要開 repair 的 finding。剩餘限制是尚未執行的真 host/IPC/process-group/容量/cleanup acceptance，以及封板已明示的非原子 snapshot／阻塞 syscall 延遲；單次 smoke 失敗仍按封板停線，不自動 R3。
