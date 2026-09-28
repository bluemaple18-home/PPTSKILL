# Browser command ownership — 窄域盲審 B

日期：2026-09-28。候選 `1829f1ab31ba63bbe6e286faf1bc03d2bb9e11ed`，base `28cad2d3beaaf32de2f62d0c08396aaba789ea01`。僅審三檔 delta 與既有 outer 接點；不讀 A 本輪結果、不重審 scanner、不要求 hostile containment。

**判定：ownership 方向成立，但此候選 NO_GO：一項 P1 留證錯誤可被回傳成功。** 不是 whole Core3 GO；PPT client mapping 尚未實作，也未在本輪驗收。

## 固定 SHA256

| 路徑（candidate root 相對） | SHA256 |
| --- | --- |
| `scripts/tmp_session.py` | `0bff045e697875fc9c4431dab51d61b7b107a53065d920302b68fd8d65826dc4` |
| `tests/test_tmp_session_browser_command.py` | `86cfa3d4eeb436909e4aef8af4febe20d55e92e444eb162f434b4276e50d5ac2` |
| `docs/tmp-session-lifecycle.md` | `1852e379023ecf23589e31377b81cb8bec20e2650ae3591930795b2da5c79a89` |
| `scripts/tmp_artifact_lifecycle.py`（僅確認未改） | `0e411a0c970ae17f9fac805b5d3010ebc0742a5b6b774eb15b8c06137ffe8edf` |

四檔在本次測試前後 hashes 相同。`git diff --check 28cad2d3 HEAD` 通過。候選 tracked files 無工作目錄變更；既有未追蹤 `CLAUDE.md` 未讀未改。

## Finding B-BC-01

**[P1 / correctness] client exit evidence 寫入失敗後，仍可返回成功。**

- 位置：`scripts/tmp_session.py:37`–`:39`、`:54`–`:57`。
- 觸發：client.wait() 已返回 0，但追加 client/exited record 時發生一次 OSError（例如 transient EIO）；後續 session/error record 可寫、browser 正常 exit 0。
- 實測：mock 只在 client/exited 的 journal write 注入 errno 5，browser/client wait 都返回 0。`browser_client()` 返回 **0**；journal 有 session/error，卻沒有 client/exited。原始兩 child exit 0 本身不錯，錯在 evidence I/O failure 被成功結果掩蓋。
- 根因：except OSError 只記錯，不保留 failure flag，也不重新拋出；client_code 已是 0，最後成功判斷只比較兩個 child codes 與 stopped。既有 outer 沒有解析這個 process journal 的驗收責任，因而不能靠 outer signal／resource／convergence gate 攔住此成功值。
- 影響：新接點可能向 consumer 回報成功，但 promised raw client exit evidence 已缺失；與本次 docs 明示「缺失退出紀錄代表未知，禁止補成 exit 0」不一致。這不是 group unknown，不能用增加 unknown isolation 或擴 runtime 來修。
- 最小建議：使捕捉到的 OSError 成為 sticky failure，或在既有 finally 收尾後沿原 exception contract 回非零；保留已知 child 非零優先序及 ordinary stop 行為。不需要新 launcher、第二監督者、scanner 改動或 unmanaged TMP。
- 驗證：`browser-command-ownership-review-b-probes.py::NarrowProbes.test_client_exit_record_io_failure_returns_zero`；結果存於 `browser-command-ownership-review-b-results.json`。高信心。probe 通過代表已重現缺陷，不是已修復。

## Spec axis / Standards axis

**Spec axis：部分通過，B-BC-01 未滿足。** optional `browser -- client`、固定 Chrome argv、client repo cwd/env、同 outer owned group、signal／unknown 邊界在本次離線驗證成立；留證故障卻仍回成功需修正。尚無 PPT mapping，不判產品 readiness、雙 viewport 或 PGQ。

**Standards axis：範圍及 runtime 邊界符合。** 只有三檔；browser/client 用普通 Popen，沒有 `start_new_session`、`process_group`、`preexec_fn`；未新增 inner SignalController／budget scanner／群組 kill／cleanup。普通 browser child 的 terminate 不取代 outer 群組收斂。可信任 non-detached client 是本次固定前提；不要求 setsid/detached/hostile containment。

## 原兩項 controller 缺口比較

- **原 B-HC-01 信號被 exit 0 蓋掉：此架構的 outer 路徑已解。** 自製 mock 在 canonical `run_child` 的 non-reaping exit 邊界設定 SIGINT/SIGTERM，child wait=0，outer 分別回 130/143。新接點不另建會吞掉 first_signal 的 SignalController。此結論限 canonical outer 收到信號的既有契約，不宣称只向任意 inner PID 發 signal 等同停止 outer。
- **原 B-HC-02 獨立 product group 共用 tmp cleanup race：結構缺口已解。** browser/client 與可信任後代繼承 `_exec` 的 outer PGID；唯一 outer 會對整組執行 budget／TTL／signal／residual convergence，然後才 cleanup。不存在新 controller 外層 close gate 與獨立 PGQ group 各自收尾。unknown convergence 的實際 `command_run` mock test 確認不 cleanup、不 clear marker、保留 root 與 unknown isolation。
- 以上不替代未完成的 PPT mapping 或正式 process evidence；本次新 B-BC-01 仍阻止候選整體 GO。

## Activation / trap / cleanup 副作用核對

| 副作用／邊界 | failure state / 證據 |
| --- | --- |
| optional CLI admission | 空 `--`、空 client、以 '-' 起頭、缺分隔符在 outer admission 前拒絕；unit 通過；舊 URL option guard 保留 |
| 舊 browser argv / exec | 沒 client 時仍原 exec；有 client 時 Chrome argv 相同；unit 逐項比較通過，browser cwd 仍 profile |
| root/evidence/session、stdout/stderr dup2、tmp/profile | 沿舊 execute；I/O exception 結束 `_exec`，由 outer 判退出與收斂；無新直接 root cleanup |
| env / cwd | TMPDIR/TMP/TEMP/TMP_SESSION_EVIDENCE 沿 owned root；client cwd、TMP_SESSION_WORKDIR 為 repo，generic DevToolsActivePort 路徑不宣稱 readiness；unit 通過 |
| browser spawn | 普通 child；spawn failure 不啟 client、回失敗；unit 通過 |
| client spawn / wait | 普通 child；spawn failure 進 browser finally；未開始/未確認 client 不補成功；unit 通過 |
| processes journal | 記 PID／繼承 PGID／已知退出碼；starting/started failure 大致沿非成功出口；client/exited transient I/O 有 B-BC-01。journal 持續失敗會再拋錯，不能據此否定單次失敗反例 |
| client raw nonzero / child signal status | 優先保存 client 非零，再 browser；負 signal status 轉 CLI 128+signal，原值寫 journal；unit 覆蓋 7/9/-9/-15 |
| browser ordinary stop | wait 1s、普通 child TERM、再 wait 1s；不自行 kill，未確認交 outer；曾 stop 不回成功；unit 驗證 kill 未呼叫 |
| outer signal / TTL / budget | 仍單一原 run_child；SIGINT/SIGTERM exit0 覆蓋反例被拒絕。本輪未執行真 TTL／budget process test、未重審 scanner |
| residual descendants / unknown | trusted non-detached descendants 由同 outer group 收斂；未知保留 root/marker，不清理；unknown mock 通過 |
| export / rollback / cleanup | 未新增 staging、writer、root 刪除或 marker 管理；沿原 command_run operation_complete/convergence 決定清理；無 consumer finish_supervisor 競態接點 |

## 本 reviewer 實際測試

從 PPTSKILL repo root，以指定 interpreter：

```sh
/Users/matt/ai-core/.venv/bin/python -B evidence/edx-core-3-undo-redo/browser-command-ownership-review-b-probes.py
```

**8/8 通過**：6 個新 `BrowserCommandUnitTests`＋2 個 B 窄 mock probes。unit 的 expected argparse errors 是拒絕測試輸出。未載入 process test suite 執行；未啟任何真 browser/client/PGQ/host child。自製 probes 僅用 mock process／訊號；未清 sandbox flag、未換 runner。

可重播來源、實際 log、hashes／反例結果分別為：`browser-command-ownership-review-b-probes.py`、`browser-command-ownership-review-b-tests.log`、`browser-command-ownership-review-b-results.json`。

CodeGraph 對候選查 `tmp_session execute browser client command signal run_child`，回無索引；依要求使用限定三檔 diff/read 與先前已知 outer API 語義，未建索引或掃大型 suite。Mainline 已跑的正式 process tests 是提供的背景，本 reviewer 未读取或重跑其結論。

## 未驗項與交回

未驗真 samePGID／signal delivery／TERM→KILL／TTL／bytes/files／PID absence／真 root cleanup；未 launch Chrome、PGQ 或 host。新 PPT client mapping、25s readiness、產品專用 env、雙 viewport＋四 PGQ、產品 evidence gate 尚待後續；本 receipt 不代表 whole Core3 GO。

**交回：NO_GO，B-BC-01 待 Mainline 裁決；原 execution-ownership REPLAN 方向可保留。** 未改候選或其他 delivery，僅新增本 receipt 與同前綴 probes/log/results；完成後停止寫入。不要求 R3、hostile containment 或新 runtime。
