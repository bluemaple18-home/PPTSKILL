# Observer R2 — 獨立盲 Reviewer B

日期：2026-09-28。範圍：canonical `c23e46555b73a29f16319c657622acb1acc51e7a` → candidate `4edd0747a25b13920b3ab1ead99895a99dbe8964` 的 scanner/tests/docs 三檔，以及本輪 controller、observer、test、candidate manifest。只讀指定任務卡與封板契約，未讀 Reviewer A verdict、其他 review 結論或主線測試結論。

**裁決：scanner delta CODE GO（限離線可驗部分）；整組 host execution readiness = NO-GO，存在下列 P1 留證缺口。** 不改封板、不授權修復 generation、不擴 R3。manifest 的 `FROZEN_REVIEW_PENDING` 是正確凍結狀態，不是 finding；即使解決 finding，host 前仍須 Mainline 明確更新狀態及完成原 capacity gate。

## Finding B-01

**[P1 / observability] identity I/O 的原始 errno 在 host instrumentation 中遺失。**

- 位置：`evidence/edx-core-3-undo-redo/host-smoke-r2-observer.py:27`、`:50`；相關 candidate `scripts/tmp_artifact_lifecycle.py:1098`、`:1109`、`:1225`。
- 觸發：root 或 descendant identity guard 的 `os.stat` / `os.fstat` 發生 EIO、EACCES 或 EPERM。`check_identity()` 將原始 OSError 放在 `LifecycleError.__cause__`；observer 只追 `visit` / `scan_resource_artifacts`，且只讀外層 exception 的 `errno`，不保存 cause。
- 自製反例：在 `fstat` 分別注入 errno 5、13、1，經真正 `sample_resource_budget()` 呼叫。三次 observer 都回 FAILED，但所有 event 的 errno 均為 null、`diagnosticErrors=[]`；supervisor 三次都只得到同一句 `NO_GO: resource observation unknown (directory identity unavailable)`。原始 cause 仍存在於直接 scanner exception，但 sample seam 把它轉成字串，不會產生原始 exception traceback供 stderr 補回。
- 影響：不是錯誤放行或第三次 retry；是唯一一輪 host 失敗時無法區分原始 I/O 原因。controller 仍會 NOT_PASS，但 journal、最終 diagnostic、supervisor 訊息無法還原 errno。這直接抵觸本輪要求 instrumentation 不掩蓋 errno，以及任務卡「失敗即保存原始原因」；不能用通用 FAILED 取代失敗證據。
- 最小建議：僅在本輪 observer exception 序列化時保存有界 cause chain 的 type/message/errno，或唯讀旁聽既有 `check_identity` exception；保留外層 failure、partial counts 與原始控制流。不需改 scanner 判定、ceiling、重試策略或引入 runtime。
- 驗證：`observer-r2-review-b-probes.py` 的 `test_identity_io_cause_is_not_in_observer_events`、`test_identity_errno_lost_at_runtime_sampling_seam`；實測結果見 `observer-r2-review-b-results-independent.json`。目前 probes 成功代表缺陷已重現，不是此缺陷已修復。
- 信心：高。建議 Mainline 在現有 R2 額度內裁決，勿自動啟 R3。

未發現 P0。未在 scanner delta 找到其他可重現阻塞問題。

## 封板契約核對

| 項目 | 獨立證據 / 結論 |
| --- | --- |
| whole-scan，跨 parent rename 不漏算 | 自製 `z/pending` 7 bytes 移回已掃過的 `a/renamed`，`a/seed` 3 bytes；第二次重新掃 a，結果 `(10,2)`，保留第一次 partial `(3,1)` 與 z/pending ENOENT |
| 第二次其他 parent ENOENT，不得第三次 | attempt 1 在 z/pending，attempt 2 在 a/seed 注入；恰兩次事件、attempt=2、FAILED、counts=null |
| directory stat/open race | candidate 直接測試通過；第二次才回完整結果 |
| identity / root replacement | candidate root/parent missing/replacement、directory stat/open replacement、fstat unknown 測試通過，均 fail closed |
| sticky bytes/files/special | candidate 直接測試通過；已觀察超額不由 retry 清零洗掉；metadata socket、FIFO、symlink 均拒絕 |
| deadline / cumulative entries | candidate 直接測試通過；兩 attempts 共用時限，entry 1025 超界被拒絕 |
| cleanup / non-browser | candidate ENOENT 維持一次 attempt、失敗；allowlist 無擴張 |
| observer 不改 return / exception | 既有 tests 加自製 EIO/EACCES/EPERM + journal ENOSPC：原始 exception cause identity 保留，partial `(3,1)`、FAILED、diagnosticErrors 可見；不轉成功 |
| observer errno 完整性 | 一般 visit I/O 可留 errno；identity guard I/O 有 B-01 缺口 |
| API / scope | tuple、LifecycleError、launcher/policy/supervisor 公開介面未變；三檔 delta，無 R1 補丁疊加 |

Spec axis：scanner 符合可離線驗證的封板矩陣；host 留證有 B-01 未滿足。Standards axis：未見新增第二套 runtime、放寬 ceilings 或改 cleanup retry；不以 standards 通過抵銷 spec 缺口。

## Activation / teardown 副作用與 failure state

以下沿 `run_host_smoke` → observer → `tmp_session` → `command_run` / `run_child` → cleanup 讀取，並區分 mock 證據與僅靜態判讀；未執行 host。

| 副作用 / 入口 | 失敗狀態與收尾 | 驗證方式 |
| --- | --- | --- |
| controller output directory 建立 | state/sandbox 先拒絕；mkdir exclusive，既有目錄拒絕再跑；mkdir 自身失敗在 receipt 建立前，沒有 browser | 靜態 |
| identity / capacity 前置 | 不啟 supervisor；finally 嘗試 after/diagnostic，NOT_PASS，不補跑 | 靜態；identity 既有離線 test 通過 |
| stdout/stderr/journal 建立、Popen observer | 失敗保留已建 evidence；未取得 supervisor 不發 signal；不把缺 root 證據判成功 | 靜態 |
| repo lock / host admission lock | admission failure 不建立 root；finally 釋放 admission/repo lock，非零結果 | mock admission failure |
| isolation marker preparing、plan root、manifest 建立 | marker 已取得而後續失敗：標 unknown，不宣稱 cleanup；部分 root/manifest 可能保留供後续判斷 | mock marker/plan/create_root failure；靜態逐寫入檢查 |
| IPC probe / marker active | IPC probe failure 走已知 operation cleanup；active 更新 failure 走 unknown 保留，不盲刪 | IPC mock；active 更新靜態 |
| signal handler / managed process group | handler 記錄並轉送 SIGINT/TERM；attach 重播、detach 清除；group unknown 不視為收斂；TERM/KILL 路徑由原 lifecycle 管理 | 靜態，未發任何 signal |
| session/log/profile/cache/tmp、exec Chrome | 都位於新 owned root；exec/preparation failure 沿 supervisor 收斂與 cleanup；run_child 異常保留 unknown isolation | run_child mock；tmp_session 靜態 |
| readiness ownership / CDP endpoint | bind 或 readiness 失敗仍 finish supervisor；未綁定 owned root 時 root cleanup 不得宣稱已證實 | 靜態 |
| Target.create/attach/listeners/navigate/evaluate | own target 已知則 JS finally closeTarget；CDP error 記 firstCause，controller finally Browser.close | 既有 fake WebSocket tests，無網路 |
| Browser.close log/open/CDP failure | 即使 log 已存在或 CDP run 丟錯，仍 wait 同一 supervisor；不得宣稱 close 成功 | 自製 close-log、CDP failure mock |
| supervisor wait/terminate/second wait | wait 25s timeout 才 terminate，同一 supervisor 再等 30s；terminate/second wait failure 記 cleanupError，禁止 PASS；不 kill 未知群組、不自動再試 | 自製 wait/terminate/second-wait/no-endpoint mock |
| lifecycle evidence copy / cleanup count / root removal | staging rollback；cleanup observation error 仍嘗試 root removal，然後回 failure；rmtree 失敗保留殘留與 unknown marker | cleanup error mock；copy/rmtree 靜態，非實測 host cleanup |
| marker clear / repo lock release | clear false 嘗試 unknown；release false 使原本 exit 0 轉 2；不把殘留判成功 | 自製 mock |
| trace 安裝/還原、journal/diagnostic 寫入 | trace 恢復原 tracer；journal write failure 不能改 scanner；diagnostic 寫入失敗有 stderr / 非零結果；identity cause 留證缺口見 B-01 | 既有及自製 tests；wrapper final write 靜態 |
| receipt 寫入與最後驗證 | after identity、root/marker absence、close/supervisor exit、scans 任一未證實皆 NOT_PASS；最後 receipt 寫入失敗會中止，不能聲稱 receipt 完整 | 靜態 |

unknown isolation 或 cleanupError 是停止、保留 evidence 的狀態，不是授權本 reviewer 復原。沒有要求改既有 signal/cleanup 架構，也未把 inherited fail-closed 行為列為 R2 regression。

## 實測與可重現性

從 PPTSKILL repo root，以指定 interpreter 執行：

```sh
/Users/matt/ai-core/.venv/bin/python -B evidence/edx-core-3-undo-redo/host-smoke-r2-test.py
/Users/matt/ai-core/.venv/bin/python -B evidence/edx-core-3-undo-redo/observer-r2-review-b-probes.py
/Users/matt/ai-core/.venv/bin/python -B evidence/edx-core-3-undo-redo/observer-r2-review-b-probes.py --independent-only
```

- 原 host 離線 tests：13/13 通過，`observer-r2-review-b-host-tests.log`。
- 首輪 B probes 5/5 通過；candidate ObserverR2Tests 12 通過、1 環境錯誤，`observer-r2-review-b-probes.log`。唯一錯誤為真實 Unix socket `bind` 的 sandbox `EPERM`，尚未進 scanner；沒有 skip、沒有提權、沒有 host 重跑。metadata socket 拒絕另有通過證據，不能替代真實 socket 本輪缺口。
- 補完整 sampling seam 與 activation failure mock 後，B probes 7/7 通過，`observer-r2-review-b-independent.log`。補跑只跑 B probes，沒有重試上述 sandbox blocker。
- 相異 test methods 合計：32 通過、1 環境阻擋；不把首次與補跑重複 methods 相加。
- candidate `git diff --check c23e465 HEAD` 通過；追蹤檔無修改。現有未追蹤 `CLAUDE.md` 未讀、未改。
- 三檔 core + 三檔 host scripts + candidate manifest 的 SHA256 前後相等，見兩份 B results JSON。scanner SHA256：`0e411a0c970ae17f9fac805b5d3010ebc0742a5b6b774eb15b8c06137ffe8edf`。原 controller identity test 同時驗證 policy、launcher、sensor、75 source、4 protected、archive。
- 所有新增持久檔案限本 receipt 與 `observer-r2-review-b-*`；臨時 fixture 已刪除。未改 delivery、未啟 Chrome、未跑 host/PGQ、未 merge/commit/push。

## Host execution readiness

**NO-GO：B-01 的 original errno 留證缺口待 Mainline 裁決。** scanner CODE GO 不等於整組 host 可執行；也不等於 canonical adoption 或 Core3 acceptance。

`FROZEN_REVIEW_PENDING` 保持正確。若 Mainline 解決並重新核驗本輪 instrumentation，仍須 Mainline 更新為 `REVIEWED_FOR_SINGLE_HOST_SMOKE`、確認原 capacity gate 與凍結 SHA，才可依既有授權執行唯一一次 host smoke。本 reviewer 不更新狀態、不新增 host 次數、不授權 R3。真實 socket fixture 的 sandbox 限制及未實測 host teardown 仍如實列為驗證界限。
