# Host controller R2 — 獨立盲 Review A

日期：2026-09-28。**CODE：NO_GO；host-execution readiness：NO_GO。** 有兩個可重現的 controller 控制流問題；pending manifest 本身正常，不是 finding。請勿因既有 21/21 離線測試通過而將這份凍結候選切成 FINAL。

本次只審新產品驗收 controller activation/rollback/teardown、manifest 身分／预算及 canonical process-group／observer helper 接點。未讀 B verdict，未重審 scanner，未啟 host/browser/PGQ，未改 delivery。canonical 33/33 是 Mainline 提供的前提，本 reviewer 沒有重跑或宣稱獨立驗證該 suite。**HOST／產品驗收：NOT_RUN。**

## Findings

### [P1] 未確認產品群組退出，仍觸發共用 root 的 browser cleanup

- 位置：`host-controller-r2.py:286`；相關 `:137`、`:152`、`:157–162`、`:186–192`。
- 觸發：product descendants 在 TERM/KILL 後仍未證實收斂，或 Popen 成功但無法建立 observer/anchor。`run_task` 記 `cleanupRaceRisk=True` 並拋錯，但外層 finally 無條件呼叫 `helpers.finish_supervisor`。
- 風險：產品是 controller 另開的 `start_new_session` 群組；TMPDIR/TMP/TEMP 卻在 browser owned root 下。helper 的 Browser.close／supervisor terminate 會使 canonical browser `command_run` 依自己的 browser 群組結果執行 root cleanup。產品群組不在該 supervisor 的 ownership anchor 裡；即使最後 receipt 是 NOT_PASS，仍可能先刪掉尚有產品程序使用的 tmp，並清除 isolation marker。`cleanupRaceRisk` 目前只是結果旗標，沒有阻擋這項副作用。原 canonical `command_run:1352–1370` 的安全前提是自己管理的群組已收斂，不能延伸保證這個外加群組。
- 重現：自有 probe 呼叫真 `run_acceptance`→`run_products`→`run_task` 控制流，以 mocks 注入 group 永不收斂。結果 `finishSupervisorCalled=true`、`cleanupRaceRiskAtFinish=true`、`productGroupConvergedAtFinish=false`、`productWaitCalls=0`，卻已進入 helper 收尾入口。probe 沒有真的啟程序或刪產品資料；root 清理危險由此呼叫鏈與固定 canonical source 證實，不聲稱實測資料遺失。
- 建議：在會引發 root 刪除的收尾前，將產品群組收斂作為實際 gate。無法證實時，沿既有 isolation／cleanup seam 保存 unknown 狀態並交 Mainline exact-owned recovery；不能只設旗標後照常 Browser.close/terminate。也須核對 supervisor 自行退出／TTL 的 cleanup，單純略過一行 helper 呼叫不構成完整修復。
- 測試缺口：現有 nonconvergence 測試只跑 `run_products` 並檢查旗標，沒有把它接到 `run_acceptance.finally`。需一個相同窄域的 composed-path 回歸。

### [P1] 退出邊界收到的中斷未成為 failure，仍可啟動下一項 PGQ

- 位置：`host-controller-r2.py:125–130`、`:138–140`、`:163–166`。
- 觸發：SIGINT/SIGTERM 在 child-exit observation 返回 true 時，或接近 finally 時抵達。loop body 的 `first_signal` 檢查被跳過；finally 雖看見 signal 並記 Terminated，卻未設定 failure。群組收斂、原 child exit 0 後，函式正常返回。
- 風險：產品中斷不會阻止下一個 task，與「停止後續」契約不符；第一個 signal 也沒有獨立保存成 StopCause。canonical handler 已消費該 signal，因此不能期待外層自動再次收到它。finalize_status 沒有以 Terminated 阻止 PASS。
- 重現：自有 probe 在 `child_exited_without_reaping` 返回 true 的同一 callback 設 `signals.first_signal=SIGTERM`，exit 固定為 0、群組收斂。`run_products` 正常返回且 `productLaunches=2`、`pgqStarted=true`，第一項沒有 StopCause。全程 Popen、群組 API、signal 均為 mock。
- 建議：任何已觀察 signal 都應保留為本 task 的 sticky interruption，即使原 child 已 exit 0；完成必要收尾後仍拋出停止原因，不啟第二項。檢查應覆蓋啟動前、exit observation 後與 finally 結束，而非僅 live-child loop body；保留原 exit 和 signal 兩者證據。
- 測試缺口：現有 timeout/runtime/nonzero case 沒覆蓋 exit 0 與 signal 同時發生。

## 固定身分

| 檔案 | SHA256 |
| --- | --- |
| `host-controller-r2.py` | `0c2c6ad7fb102cf54fb2cad3dbfba8af71c9373c7349ce5c1fbb2f3735d47ee0` |
| `host-controller-r2-test.py` | `dfd249ecdfbd762416ca53cbd0471c437d6e9921f4eb2b2adf1a061e666288ed` |
| `host-controller-r2-manifest.json` | `de1b49422dacb19f94b68e92d3fc3cb09deceb00eebce0298c6a5edb0c1480f9` |

manifest 狀態 `PREPARED_PENDING_MAINLINE_FINAL`；固定 integrated HEAD `28cad2d3beaaf32de2f62d0c08396aaba789ea01`。live read-only identity 測試使用 temporary FINAL manifest，不改凍結 manifest；實際驗證 integration receipt、canonical working bytes/commit bytes、policy、75 source/4 protected/ZIP、harness hashes。自有 probes 前後上述三檔 hash 相同。

## Activation／rollback／teardown 窄域矩陣

| 階段 | 檢查／失敗行為與邊界 |
| --- | --- |
| import / manifest | helper 固定 hash；import 無 launch。pending、integration status/root/HEAD/hash 不符時在 OUT/Popen 前拒絕。pending 正常保留，不由 reviewer 解鎖。 |
| identity / capacity / marker | 開始和結束核對 canonical、product、harness；policy defaults 明確固定 64MiB／10,000files／3600s；capacity 走既有 seam；既有 isolation marker 阻擋。before/after 實際容量只在 host 才能驗，本次 mock 不作容量證明。 |
| browser activation / readiness | 只啟 observer→canonical tmp_session；25s readiness；bind_owned 核對 root/manifest/marker/TTL；未 ready 則不跑產品，進 helper 收尾；未知 owned root 不可假裝清理成功。readiness timeout mock 通過。 |
| product identity / budgets | 雙 viewport 由固定 acceptance harness 呼叫，controller 驗 1280×720、1600×900、targetClosed/error arrays；後續只一次串行四個 PGQ。task timeout 900/1800s；temp env 限 owned/tmp，拒 symlink；browser root runtime budget 覆蓋此 tmp 的邏輯計數，不代表 OUT evidence 也有 root quota。 |
| native API | ProcessGroupAnchor 是 canonical NamedTuple，`_asdict` 相容；ChildExitObserver non-reaping、anchor、SignalController、wait_for_process_group 皆沿用 canonical；正常路徑確認收斂後才 wait/reap。觀測失敗不猜 foreign PID，也不以直接 parent exit 代替群組退出。未收斂接外層 cleanup 有 F1；signal/exit 競態有 F2。 |
| task failure / rollback | runtime FAILED/BUDGET/UNKNOWN、nonzero、timeout 不應進第二項，保留 exit／StopCause；第一次 task receipt 不合格也不進 PGQ。正常 stop 收斂走 TERM/KILL。沒有 source rollback write；產品 input 保護依固定 before/after hash。 |
| browser/observer finally | Browser.close 出錯仍 wait/terminate；final diagnostic 檢查 scanner 身分、root/limits/counts、至少兩 runtime 與一 cleanup、journal ends 完整一致；unknown/incomplete 拒 PASS。此次不修改／重審 observer/scanner 演算法。 |
| 完成與清理 | root/marker absence、canonical recovery_process_observation、supervisor exit、product groups、before/after、capacity/diagnostic 全部納入 PASS。ps 不可讀或不完整則 fail closed。這些終態條件不能補救 F1 已發生的 premature cleanup 副作用。 |
| abrupt termination / 清理本身失敗 | controller 外層未加 SIGTERM handler；SIGKILL/中斷 finally/寫 receipt 失敗不保證留下完整 receipt。未知狀態須交 Mainline，不自動重啟／R3；本次未實測 OS 強制終止。 |

Spec 軸：常數、單輪 task 列表、身份及 observer 終態條件符合預期，但停止／收尾有上述缺口。Standards 軸：有採 canonical API 與 bounded waits，現有 mocks 未覆蓋兩個跨階段控制流，故不能放行。

## 測試證據與未實測範圍

在 workspace 根目錄執行：

```sh
/Users/matt/ai-core/.venv/bin/python -B PPTSKILL-canonical/evidence/edx-core-3-undo-redo/host-controller-r2-test.py
/Users/matt/ai-core/.venv/bin/python -B PPTSKILL-canonical/evidence/edx-core-3-undo-redo/host-controller-r2-review-a-probes.py
```

- `host-controller-r2-review-a-tests.log`：既有 **21/21 PASS**。
- `host-controller-r2-review-a-probes.json`：兩個反例均重現；probe exit 0 表示反例 assertion 成立，不表示 controller GO。
- `host-controller-r2-review-a-probes.py`：可重現的小型 mocks；不跑產品命令，不發真 signal，不用 ps/socket/network。temporary fixtures 自動清除。
- CodeGraph 先查 PPTSKILL，未命中新 controller，改限定檔案讀取；canonical 查詢取得 native API 關係／source，補讀只限未涵蓋的接點。未擴成 scanner 或全 lifecycle review。
- 未實測 Chrome readiness、雙 viewport/四 PGQ、真 Darwin descendant 收斂、runtime filesystem race、capacity、真 Browser.close/root/marker/PID cleanup。不得由 mock PASS 外推 host PASS。

交付後停寫。兩個 findings 交 Mainline 裁決，不自行修 delivery、不解鎖 manifest、不開新 scanner repair/R3。
