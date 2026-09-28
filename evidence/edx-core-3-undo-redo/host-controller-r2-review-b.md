# 新產品驗收 controller：獨立盲審 B

日期：2026-09-28。**裁決：NO_GO，兩項 P1。** 僅審本輪 controller activation／rollback／teardown、canonical process-group API 接法及既有 observer/helper 契約；未重審 scanner，未讀 A verdict。manifest pending 是正常凍結狀態，不是 finding。此 receipt 不授權修改、host 執行或 R3。

## 固定 SHA256

| 檔案 | SHA256 |
| --- | --- |
| `host-controller-r2.py` | `0c2c6ad7fb102cf54fb2cad3dbfba8af71c9373c7349ce5c1fbb2f3735d47ee0` |
| `host-controller-r2-test.py` | `dfd249ecdfbd762416ca53cbd0471c437d6e9921f4eb2b2adf1a061e666288ed` |
| `host-controller-r2-manifest.json` | `de1b49422dacb19f94b68e92d3fc3cb09deceb00eebce0298c6a5edb0c1480f9` |

三檔在 probes 前後 byte hashes 相同。manifest 指向 canonical `28cad2d3beaaf32de2f62d0c08396aaba789ea01`；既有唯讀 identity test fresh 通過，包括 canonical committed bytes、integration receipt hashes、policy、產品 75 source／4 protected／ZIP 及 harness hashes。未把使用者所述 scanner 33/33 當成本 reviewer 重跑證據。

## Findings

### B-HC-01 — [P1] 已接收的中斷訊號可在 child 退出邊界被當作成功，繼續下一產品

- 位置：`host-controller-r2.py:125`、`:138`、`:163`。
- 觸發：`child_exited_without_reaping()` 返回 True 的邊界已收到 SIGTERM/SIGINT，或進入收尾時收到訊號；child 最終 exit 0、group 已收斂。
- 問題：`signals.first_signal` 的拒絕只在 while body。跳過 body 後，finally 雖然發 TERM 並記 `Terminated=True`，卻未把已收到訊號設為 failure。`run_task` 返回成功，`run_products` 可繼續 PGQ；最後 PASS gate 也未把 Terminated 本身視為拒絕。
- 自製反例：mock non-reaping exit observation 在返回 True 前設定 first_signal=SIGTERM，product wait=0、group convergence=True。實際執行 `run_products`，Popen mock 被呼叫兩次，historyBrowser 與 pgq 都 exit 0；historyBrowserTerminated=True，卻沒有 historyBrowserStopCause。未發任何真訊號、未啟動產品。
- 風險：中斷要求被吞掉，原先應停止的驗收可能继续啟動後續工作，甚至在其他 checks 通過時形成 PASS。
- 最小建議：在 child exit／收尾出口保存 first_signal 為不可清除的停止原因；完成 owned group 收斂後仍須向上回報中斷並禁止後續 task。沿用 canonical SignalController，無需新 process runtime。
- 驗證案例：`host-controller-r2-review-b-probes.py::FailureProbes.test_signal_at_child_exit_allows_next_product`。高信心。

### B-HC-02 — [P1] 產品群組未確認停止，仍啟動可能刪除其 TMPDIR 的 browser supervisor 收尾

- 位置：`host-controller-r2.py:157`–`:162`、`:285`–`:286`；相關 `product_environment` 將產品 TMPDIR/TMP/TEMP 指向 browser owned root 的 tmp。
- 觸發：產品 TERM/KILL 後仍未收斂，或 Popen 成功但 product group anchor 無法建立。
- 問題：`run_task` 正確留下 `GroupConverged=False`、`cleanupRaceRisk=True` 並失敗，不 reap 未確認群組；但外層 finally 不看該狀態，一律呼叫 `helpers.finish_supervisor`。helper 對 browser 做 Browser.close／等待或 terminate；既有 canonical browser lifecycle 正常收尾會刪除 owned root。產品是另一個 `start_new_session=True` 群組，不在 browser supervisor 的 process group 內，仍可能持有或繼續寫入同一 tmp。
- 自製反例：兩個 full controller mock flow，分別令 group convergence 永遠 False、anchor 建立丟錯。兩者只啟動 mock supervisor＋第一個 mock product；product 未 reap、GroupConverged=False、cleanupRaceRisk=True 時，仍呼叫 finish_supervisor，帶原 supervisor 與有效 endpoint。receipt 最後 NOT_PASS，但危險收尾呼叫已發生。
- 風險：NOT_PASS／cleanupVerified=False 只是事後結果，不能阻止清理與仍活躍 writer 競態；也不能藉 browser PID 清除證據證明獨立 product group 已停止。此處證明的是收尾調度缺少閘門，未宣稱真的執行過 host 刪除。
- 最小建議：在已確認產品群組收斂之前，禁止进入會刪除其共用 owned tmp 的收尾路徑；若 anchor／收斂未知，須沿既有 lifecycle 支援的保留／unknown 狀態處理並回報，不僅新增一個 status flag。不得猜 PID 或對未證實群組發額外 kill。具體有限修正由 Mainline 裁決，不擴 scanner 或 R3。
- 驗證案例：`host-controller-r2-review-b-probes.py::FailureProbes.test_unconverged_or_unanchored_group_reaches_browser_cleanup`，含 nonconverged、anchor-failure 兩個 subcases。高信心。

## Activation／rollback／teardown 核對

| 副作用／邊界 | 結論與 failure state |
| --- | --- |
| import／manifest／sandbox gate | import 無 launch；pending 拒絕；FINAL 與 integration／identity／policy 檢查在 supervisor 前，離線測試通過 |
| OUT、launcher logs 建立 | exclusive OUT 防止同目錄重跑；部分 evidence 可留，失敗不視為成功；不自動再次 activation |
| capacity／已有 isolation marker | capacity 使用原 canonical seam；既有 marker 阻止啟動；after capacity 與 identity 納入結果 |
| browser supervisor／readiness | 原 tmp_session browser 入口；25 秒 deadline；64 MiB／10000 files／TTL3600；ownership bind 比對 root/profile/marker/manifest；deadline failure 不啟產品，離線 test 通過 |
| product tmp environment | 實體 tmp、owned root dev/ino 檢查，拒絕 symlink；產品共用 owned tmp 因而必須受 B-HC-02 收尾順序保護 |
| product launch／anchor | 使用 canonical ensure/ChildExitObserver/process_group_anchor/SignalController；start_new_session；不 poll/reap product 來判斷退出。anchor 建立失敗會拒絕，但外層 cleanup 有 B-HC-02 |
| runtime guard／產品非零 | FAILED/BUDGET_REJECTED/UNKNOWN／supervisor exit 阻止下一產品，保留 product exit；不開 retry 或 R3。成功 recovered ENOENT 不抹掉 events/causes |
| 雙 viewport／四 PGQ | historyBrowser 一次，驗 viewport 1280×720、1600×900／closed targets／error arrays 後，四個 PGQ 以 concurrency=1 一次執行；產品 assertions 本輪未執行 |
| timeout／residual descendants | 沿 canonical wait_for_process_group 與 TERM/KILL；收斂後才 detach/reap。非收斂已拒絕，但不得忽略 B-HC-02 |
| signal handler | loop 中可停止；child exit／收尾邊界有 B-HC-01 |
| Browser.close／wait／terminate | helper 在 close/log failure 仍等待同一 supervisor；僅在產品不再使用 owned tmp 時才具備安全清理前提 |
| root/marker/PID cleanup 驗證 | 檢查 absence、session root/mode/pid、canonical recovery_process_observation；失敗不能 PASS。browser 歷史 PID 檢查不替代 product group convergence |
| diagnostic／journal | scanner hashes、root、limits、完整 counts、runtime≥2＋cleanup、journal end 與 scans 一致、diagnosticErrors/unfinished 拒絕；保留 recovered causes，離線 tests 通過 |
| receipt／原始原因 | firstCause 不覆寫、runtime/product 分類與 after identity 保留；最後 receipt write failure 不能宣稱交付完整。未做真磁碟滿／host cleanup 演練 |

## 實測與重現

在 PPTSKILL repo root：

```sh
/Users/matt/ai-core/.venv/bin/python -B evidence/edx-core-3-undo-redo/host-controller-r2-test.py
/Users/matt/ai-core/.venv/bin/python -B evidence/edx-core-3-undo-redo/host-controller-r2-review-b-probes.py
```

- 新 controller 原有 offline suite：**21/21 通過**；`host-controller-r2-review-b-tests.log`。
- B 定向 probes：**2/2 通過**（第二個含兩種 failure state），代表兩項缺陷已重現，並非修復；`host-controller-r2-review-b-probes.log` 與 `host-controller-r2-review-b-results.json`。
- CodeGraph 先查 PPTSKILL 新 controller，回傳無關 symbols，改用限定檔案文字查讀；canonical CodeGraph 成功提供 process-group API 實際語義及 caller 關係。未掃 scanner delta。
- 無大型 suite、無 socket/ps/network 限制重試、無換 runner；全部產品／supervisor／訊號均 mocks。只有 identity test 執行唯讀 git/hash 檢查。

## 未實測邊界與交回

未啟動 host、Chrome、雙 viewport 或 PGQ；未實測 macOS 真 process group／KILL convergence、真 Browser.close、owned root deletion、PID absence 或正式容量准入。本次不宣稱產品 acceptance 或 host cleanup 已通過。

**Host execution readiness：NO_GO，B-HC-01／B-HC-02 待 Mainline 裁決。** manifest 保持 `PREPARED_PENDING_MAINLINE_FINAL`；兩審 GO 後才由 Mainline 定值 FINAL。本 reviewer 未改任何 delivery/controller/manifest，也未動原 B receipts。寫完本 receipt 後停止寫入並交回。
