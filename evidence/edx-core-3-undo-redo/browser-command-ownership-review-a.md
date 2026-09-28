# Browser command ownership — 獨立盲 Review A

日期：2026-09-28。**CODE GO（限本候選 ownership 接點；一項非阻塞 P2 留證問題）**。未發現舊 controller 兩個 P1 在此設計中仍成立的證據。這不是無 findings 的 clean GO，也不是 canonical adoption、PPT client mapping 或 whole Core3 GO。

**Spec 軸：** trusted、non-detached client 的同 outer owned group、signal 優先序、unknown 保留 root、舊 browser argv 保護相容，於 source／本次單元驗證範圍成立；journal 錯誤與 exit 0 的不一致詳見 P2。**Standards 軸：**沿既有 run_child 的單一 budget／kill／convergence／cleanup，未新增 inner 群組監督或第二套 lifecycle；可放行 ownership 方向，P2 交 Mainline 決定本候選修正或在 consumer 留證契約中明確處理。

## Finding

### [P2] client 退出留證失敗可記錄 session error 卻仍回 exit 0

- 位置：`scripts/tmp_session.py:37–39`、`:54–57`。
- 觸發：`client.wait()` 已得到 0，但隨後 `record(client, exited)` 出現一次 OSError；session error 與 browser exit 紀錄後續可正常寫入，browser 也 exit 0。
- 重現：自有 mock probe 對第五次 `processes.jsonl` append/open 注入單次 ENOSPC，後續恢復。結果 helper 回 **0**；journal 有 `session/error`，但沒有 client exited 紀錄。這是故障注入，未製造真磁碟容量不足、未啟任何 child。
- 影響：caller 若只依 CLI 成功判斷留證完整，會遺漏 client 原始退出記錄。這不表示實際 child exit 未知或群組未收斂，也不會繞過 outer budget／signal；因此本次不列 ownership 安全阻塞。但 docs 已要求缺失退出紀錄不可補成 0，後續 consumer 必須看見此缺口。
- 建議：將此 session/evidence error 保留為失敗狀態；即使已觀察兩個 exit 0，也不回成功。保留已觀察的原始 returncode、照常交 outer 收斂；不需要更改 scanner、outer ownership 或新增 runtime。新增同一單點 I/O case 至現有 helper 單元測試即可。
- 驗證缺口：既有 cases 覆蓋 spawn failure、非零和 ordinary stop，沒有 client exited 留證在 wait 成功後失敗的 case。

## 固定身分與範圍

- 候選：workspace `.work/ai-core-observer-r2-20260928`。
- HEAD：`1829f1ab31ba63bbe6e286faf1bc03d2bb9e11ed`；base `28cad2d3`。
- delta 僅 `scripts/tmp_session.py`、新 `tests/test_tmp_session_browser_command.py`、`docs/tmp-session-lifecycle.md`。

| 檔案 | SHA256 |
| --- | --- |
| `scripts/tmp_session.py` | `0bff045e697875fc9c4431dab51d61b7b107a53065d920302b68fd8d65826dc4` |
| `tests/test_tmp_session_browser_command.py` | `86cfa3d4eeb436909e4aef8af4febe20d55e92e444eb162f434b4276e50d5ac2` |
| `docs/tmp-session-lifecycle.md` | `1852e379023ecf23589e31377b81cb8bec20e2650ae3591930795b2da5c79a89` |
| 未改的 outer／scanner 檔 `scripts/tmp_artifact_lifecycle.py` | `0e411a0c970ae17f9fac805b5d3010ebc0742a5b6b774eb15b8c06137ffe8edf` |

CodeGraph 先做語義 query，回覆候選未建索引；改限定檔案讀取，未建索引或掃 repo。未重審 scanner；outer 檔與 base 無 delta，沿用本 session 已讀的 run_child/command_run 契約。三個 delivery 檔與 HEAD 一致，`git diff --check 28cad2d3 1829f1ab` 通過；候選原有 untracked `CLAUDE.md` 未動。本輪未讀 B 結果。

## 從 activation／signal 到 cleanup 的副作用判定

| 階段／failure state | 行為與判定 |
| --- | --- |
| CLI／admission 前 | optional remainder 必須 `--` 加非空、不以 `-` 開頭的第一命令。空 `--`、空命令、裸命令及選項形命令都在 command_run 前拒絕。browser sandbox gate、URL 不得以 `-` 起始、evidence 路徑防護沿用。 |
| 無 client 舊路徑 | 同樣 fixed Chrome argv、profile cwd、os.execvpe。mock 比較有/無 client 產生的 browser argv 完全一致；review 分支沒有新執行方式。client 引數不被接入 Chrome argv。 |
| outer activation | 仍只由原 command_run/run_child admission、marker、root、唯一新 session 與 anchor 管理 `_exec`。browser_client 不取得 repo lock、不建立 root、不清理 root。 |
| `_exec` 準備 | session.json／browser-starting announcement、stdout/stderr 重導、tmp/profile 建立與 env 更新都在同一 outer 管理下。準備失敗令直接 child 非零；outer 必須確認整組收斂才可清 root。announcement 不表示 CDP ready。 |
| browser／client Popen | 兩個普通 Popen 均無 start_new_session/process_group/preexec_fn；繼承 `_exec` 所在唯一 PGID。Chrome cwd 為 profile；client cwd／TMP_SESSION_WORKDIR 為 repo，共用 tmp/evidence env，generic DevTools port env 指向本輪 profile。只在 trusted non-detached 前提下成立。 |
| 雙側 spawn failure | browser 啟動失敗不啟 client；client 啟動失敗則等待已啟 browser，必要時 ordinary stop；不自行刪 root。啟動／journal 寫入的持續錯誤仍使 child 失敗；單次退出 journal 錯誤例外見 P2。 |
| client 正常／非零／signal returncode | 保留 client 原始 wait status；非零 client 優先，否則 browser 非零；負值轉 CLI 128+signal，journal 保留原負值。client wait 沒有獨立 TTL，但仍受唯一 outer TTL／resource guard 控制。 |
| browser 未隨 client 正常退出 | 先 wait 1s，Timeout 後普通 child TERM，再 wait 1s；不自行 kill 群組或刪 root。曾 ordinary stop 即使兩側後來 exit 0 也不回成功；仍未退出記 unconfirmed，交 outer residual-group 收斂。 |
| signal／TTL／budget／殘留 descendants | `_exec`、browser、client、繼承群組的 descendants 都在 outer signal/TERM/KILL 範圍；內層沒有 SignalController 可消費並丟失停止狀態。原 run_child 以 first_signal 優先於 child exit，resource_stop 保留 exit 2，不能被 client exit 0 改寫。這是 source 不變與接線判定，本輪未發真 signal。 |
| unknown convergence | run_child 的 ProcessGroupControlError 向 command_run 傳播，operation_complete 不成立；原契約 preserve_unknown_isolation、禁止 cleanup/clear marker。新 UnitTests 實際呼叫 command_run、以 mocks 注入 unknown，驗證 root 保留、cleanup/clear 未呼叫。 |
| 正常 cleanup／rollback | 原 outer 確認整組退出後才匯出與清 root；inner 沒有 Browser.close→獨立 supervisor cleanup 邊。副作用回收仍是既有 exact-owned lifecycle；本輪不驗證 copy/rmtree/marker 的真機 I/O，不額外擴充其規格。 |
| 強制終止／diagnostic 缺失 | outer KILL 也會終止 `_exec`，因此不能保證內層收集兩側 wait status；started-only/unconfirmed 不能補為 exit 0。docs 已明示原始 child code 和 outer stop code 的區別。沒有把 signal/強殺 receipt 的未驗項冒稱完成。 |

## 舊 controller 兩個 P1 的比較

1. **產品群組不收斂卻清 browser root：**新接點沒有獨立產品 PGID，也沒有內層 cleanup 呼叫；唯一 outer group 包含所有可信任 client 後代。unknown 時仍保留 root，原先跨群組「旗標為風險但仍 cleanup」的結構已移除。
2. **signal 與 child exit 0 競態後仍進下一項：**新入口不持有产品 task 列表、不捕獲 outer SignalController 的 signal；原 outer 優先序未改。PPT client 未來如何串行雙 viewport／PGQ 仍須 mapping 自己受測，不能從此接點 GO 推定產品內部編排已完成。

## 本次實際測試與重播

在 workspace 根目錄：

```sh
/Users/matt/ai-core/.venv/bin/python -B PPTSKILL-canonical/evidence/edx-core-3-undo-redo/browser-command-ownership-review-a-probes.py
```

- 僅 `BrowserCommandUnitTests`：**6/6 PASS，0 skip**。
- 一個 journal 單點故障 probe：重現 P2，exit 0＋session error＋client exited record 缺失。probe 自身 exit 0 表示反例成立，不表示該故障情境正確。
- `browser-command-ownership-review-a-tests.log` 保存選集結果；`browser-command-ownership-review-a-probes.json` 保存 hashes 與反例 facts；同前綴 Python 保存可重播方式。
- 新 process-test class 只讀 source，未執行。沒有啟 Chrome、PGQ、host fixture 程序或對真程序發 signal；輸出的 browser-starting JSON 來自 execute 單元測試，Popen/exec 都是 mock，不能當 host 啟動證據。
- probes 前後四檔 SHA 相同；未改候選／canonical／原 controller／原 review receipts。僅寫本 reviewer 的同前綴 evidence。

未驗項：真 same-PGID／Darwin process observation、signal/TTL/bytes/files/KILL/residual 的 process fixtures、真 root/marker 清除、Chrome readiness／Browser.close、PPT generic→產品 env mapping、雙 viewport與四 PGQ。Mainline 已正式跑過進程 suite 的說明只作背景，不冒稱本 reviewer 重跑。此輪沒有要求 hostile/detached containment，也不開第二套 lifecycle 或擴 scope。

## Mainline fresh host evidence 補充核讀

依 Owner 後續提供資訊，只核讀 `browser-command-ownership-host-tests.log` 與 `browser-command-ownership-verification.json`，未重跑任何 host case。

- raw log SHA256 為 `d4c661314b16d260d8f809664e4d0940a0a4d352088fa10250d9b75781646958`，與 verification 所記相同；log 結尾為 **25 tests／37.083s／OK**，verification 記 0 failures/errors/skips、exit 0。
- verification 的候選 HEAD 為本次 `1829f1ab31ba63bbe6e286faf1bc03d2bb9e11ed`，三個 candidateSourceSHA256 與本 reviewer 固定 hashes 相同。
- 從 raw log 抽出的 10 組 process JSON 與 verification cases 逐項完全相同：spawn-browser/client 各 2、normal-0 為 0、normal-7 為 7、residual 為 2、SIGINT 為 130、SIGTERM 為 143、TTL/bytes/files 各 2。所有已啟動並列出的 process PGID 等於各自 outer PID；browser spawn failure 沒有 process，不能將其空集合當作實際同 PGID 證據。
- 10 組均記錄 `rootAbsent=true`／`knownPidsAbsent=true`，與已讀 test source 中 assertions 的輸出位置一致。強殺後原 child returncodes 保留 null，沒有補為 0。

這是 **Mainline fresh、Reviewer 核讀並交叉比對**，不是 Reviewer fresh process test；不是本次再次測量 PID/root 的現況。它補充了上述 process-fixture 未由本 reviewer 親跑的證據，支持同群組、停止碼與回收契約。unknown 保留 root 仍是 mock；真 Chrome/PGQ、PPT client mapping、whole Core3 仍未驗。既有 25 cases 沒有本次 journal 單點故障，故 P2 不因該 suite PASS 而關閉。

交付後停寫；以上 P2 與窄域 GO 一併交 Mainline 裁決。
