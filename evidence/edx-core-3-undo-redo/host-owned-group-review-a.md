# Owned-group mapping — 獨立盲 Reviewer A

日期：2026-09-29。**GO（本輪薄 mapping 的 code／host-execution readiness；一項非阻塞 P2）**。未發現新群組／第二 cleanup authority 或可誤報 PASS 的阻塞問題。pending manifest 是預期 gate，不因此阻塞；是否切 FINAL 及唯一正式 host run 仍由 Mainline 在兩份獨立 review 後裁決。

**HOST／Chrome／PGQ／whole Core3：NOT_RUN，不能宣稱 PASS。** 本 reviewer 不解鎖 manifest、不 launch、不 commit、不改候選或 canonical。未讀本輪另一 Reviewer 結果。

## Finding

### [P2] 產品 exit 留證單次失敗會以通用 client exit 2 取代已觀察的產品非零

- 位置：`host-client-owned-group.py:75–77`，相關 `:106–108`、`:124–126`。
- 觸發：historyBrowser `wait()` 回 7，`receipt['historyBrowserExit']=7` 後的 `save()` 單次 ENOSPC，後續留證恢復；browser close 成功。
- 重現：`host-owned-group-review-a-probes.py` 的 `exitEvidenceFailure` 使用真 ordinary/run_client 控制流及 mock Popen，精確在上述 save 注入一次錯誤。結果 **client exit=2、historyBrowserExit=7、browserCloseExit=0、pgqStarted=false**，firstCause 為該 OSError。
- 影響：CLI／canonical 所見 client code 不再保留產品非零優先序，若只看 supervisor exit 會失去原碼語意；原碼仍保存在最後 receipt，沒有抹除原產品 evidence，也沒有把失敗變成功。PGQ 被擋、outer ownership 不受影響，因此列非阻塞 P2。
- 建議：將已觀察的產品非零與 evidence error 分別保留，確保保存進度失敗也不跳過非零優先序；避免由未返回的 ordinary 隱含控制原 exit 是否能傳遞。加入同一單點測項即可，不需要更改 canonical/scanner 或新增監督者。
- 驗證缺口：既有 13 tests 沒有 wait 已回非零、隨後 save 失敗這個邊界；新增 probe 已固定反例。Mainline 可依較嚴格失敗契約決定是否另作小修，本 reviewer 不自行擴 repair。

## 契約、固定身分

依 `tasks/edx-core-3-observer-r2-integration.md` 最新 **2026-09-29 Owner「先推上去再繼續吧」** 段，僅審四個 owned-group 新檔與其既有純 helper 接點。canonical 實際 HEAD 為 `71b774d31b8e7aa9e05786c8dc431c7528dabdc1`。未重審或改其 scanner/runtime。

| 檔案 | SHA256 |
| --- | --- |
| `host-client-owned-group.py` | `52aed789555807495ea62a1179a4e5b143c631331bb65f2358f8a7e1a30a6430` |
| `host-controller-owned-group.py` | `5a73298ff0617994788f9c159582ab54d07d3e55fb7441a79ae2301a29e4e1ea` |
| `host-controller-owned-group-test.py` | `a6b2080f96705da049193bf2ef0130a2c0a7b0602c4f190851df34e1d23bda39` |
| `host-controller-owned-group-manifest.json` | `43d6d616df3b2add2534ee1e39a93a85f7392471e74b0da47ba461c495fab895` |

四檔與 Worker receipt 固定 hashes 一致，probes 前後完全不變。manifest 為 `PREPARED_PENDING_MAINLINE_FINAL`。唯讀 identity test 在 reviewer 自有 fixture 建立 temporary FINAL 副本，只用來呼叫驗證，不改正式 manifest、不呼叫正式 launch。

CodeGraph 先作語義 query，但回傳無關的 geometry QA source，未命中本四檔；因此改用限定檔案 `rg`／read。沒有掃全 repo、建立 clone 或改索引。舊 NO_GO controller 僅作固定純檢查函式來源，舊 `run_task`／`finish_supervisor`／signal 路徑沒有被新接線呼叫。

## Spec／Standards

- **Spec：核心 mapping 與失敗停線契約符合。** 普通 child 繼承既有 outer PGID；64MiB／10,000files／TTL3600、readiness25s、browser900s／PGQ1800s 沒放寬；產品失敗不啟 PGQ；unknown 不新增外部 cleanup。非零與 evidence error 同時發生的優先序有上述 P2。
- **Standards：GO，非 clean-GO。** Canonical 是唯一 group/budget/kill/convergence/cleanup owner；無第二 registry/signal controller/cleanup authority；有固定身份、失敗結果與完整 evidence gates。既有 trusted non-detached callchain audit 的檔案 hashes 在 identity test 中核對，未要求 hostile containment。

## Activation 到 finally 的副作用／failure-state 矩陣

| 接點 | 行為、失敗收斂與證據 |
| --- | --- |
| import／manifest | 新 controller import 先核對舊 pure-check source hash；import 無 launch。pending／integration status/HEAD/hash 錯誤在 OUT/Popen 前拒絕；不把 pending 當缺陷。13 tests 含 import 與 schema rejection。 |
| before identity／capacity | 實際唯讀核對 canonical commit/current bytes、policy defaults/hard limits、integration、75 source／4 protected／ZIP、harness、固定 client callchain audit 檔案。capacity 仍沿既有 seam；本輪不把 mock capacity 當真機容量准入。既有 isolation marker 阻擋。 |
| outer activation | `command()` 唯一 Popen 為 observer→canonical tmp_session browser→`-- Python -B host-client-owned-group.py`。沒有新 session/group/signal controller。outer 只 wait 3675 秒，這是證據等待上限，runtime TTL 仍為 3600。OUT exclusive mkdir 保持單輪，不覆寫舊驗收目錄。 |
| managed context | client 核对 active flag、絕對 root、root/tmp/profile/evidence 實體目錄、TMP 三變數、evidence/workdir、session root/mode/outer PID 等於自身及 parent PGID、owned manifest budget/TTL、generic port 精確位置。錯誤不啟產品；ownership 強度以固定可信任 canonical/callchain 為前提。 |
| readiness／port | 只读本輪 profile 的 DevToolsActivePort，helper 限 regular/no-follow/bounded read，port 與 browser path 格式合格才連 loopback。檔案未出現／未完整則在25s內等待；其他 I/O/格式拒絕或 deadline 失敗不啟產品。宣告 port 路徑不等於 ready。 |
| product activation | generic env 映射為 `PPTSKILL_DEVTOOLS_ACTIVE_PORT`，TMP 不改；Popen cwd=repo、普通 child 無 session/group 參數。啟動後核對 PGID，mismatch 記 outerStopRequired，不自行 signal/kill。每個產品 log exclusive create；進度 receipt 僅寫本輪 OUT。 |
| product fail／receipt fail | browser 固定雙 viewport harness 在 PGQ 前，後續固定四支串行 PGQ 僅一次。非零或驗收 evidence exception 都中斷 loop。測試／補充 probe 證實不啟 PGQ；一般正值非零保留原碼並嘗試 Browser.close。保存 exit 時的單次 I/O 優先序例外見 P2。 |
| product timeout／signal | timeout 記原 timeout、outerStopRequired，client124；KeyboardInterrupt130、負值 child code 映射128+signal，停後續、略過 Browser.close，交 outer。沒有新 signal handler 吞掉 canonical first_signal。SIGTERM/outer KILL 可能直接終止 client、只留最後進度；缺 receipt/exit 不可當成功。真 signal 尚未實測。 |
| Browser.close | 正常或一般產品 failure 由同群組普通 child 執行固定 CLOSE_JS，10s timeout。close failure 在原產品成功時轉失敗；原產品7遇 close9仍回7（補充 probe）。close timeout／signal／異常由 outer 最終處理；不增加 tmp 刪除權限。 |
| canonical termination／unknown | 所有普通後代共享原 outer group；client 沒有 kill/cleanup。controller wait失敗只記 UNKNOWN_NO_EXTERNAL_INTERVENTION，不 close/terminate/kill，也不聲稱 cleanup。root 是否保留／回收完全取決於未改 canonical 收斂契約；本輪只測 mock，不宣稱真 unknown fixture 已跑。 |
| cleanup verification | controller 只讀匯出 session/processes，核對 exact browser root parent/prefix、mode、outer PID、唯一 browser/client started 與同 PGID；用 lexists 檢 root/marker 消失，再沿 canonical fresh full-ps observation 查 outer PID/PPID/PGID/root。未確認 supervisor 返回則不驗成成功；任何未知/缺件拒 PASS。沒有掃 tmp 猜 root、沒有外部刪除。此函式路徑本輪以 source 核對，未執行真 ps/cleanup。 |
| observer／diagnostic | 保留完整原 diagnostic、runtime failures/recovery；純 helper 核對 scanner hash、exact root、limits、完整 counts、至少兩 runtime/一 cleanup、journal newline及所有 end records 與 diagnostic 相同。FAILED/BUDGET/UNKNOWN、diagnosticErrors/unfinished 拒絕；成功 ENOENT recovery 的原事件不刪。 |
| final result／rollback | browser receipt 驗雙 viewport、targetClosed/error arrays；after identity/capacity 再驗。supervisor、client/products/close、browser、diagnostic、cleanup、identity、capacity 必須齊全且errors空才PASS。沒有產品 source rollback write；controller 不承擔資料/root復原權限。receipt write失敗或強制中斷只能是未完成，不能憑狀態推定成功。 |

## Reviewer fresh 測試與重播

在 workspace 根目錄：

```sh
/Users/matt/ai-core/.venv/bin/python -B PPTSKILL-canonical/evidence/edx-core-3-undo-redo/host-owned-group-review-a-probes.py
```

**既有離線選集 13/13 PASS，0 failure/error/skip，0.231s。** log：`host-owned-group-review-a-tests.log`。另有四組窄 probe 結果保存在 `host-owned-group-review-a-probes.json`：

1. 產品 evidence exception：exit2，不啟 PGQ，Browser.close0。
2. 單次 exit-evidence ENOSPC：exit2、原產品7仍在receipt、Browser.close0、不啟PGQ（P2）。
3. 產品成功但 close9：exit2。
4. 產品7且 close9：仍exit7。

Runner 只把既有 tests 的 TemporaryDirectory 定位到同目錄 **`host-owned-group-review-a-fixture-*`** 自有 evidence 前綴，結束自動移除；不在 /tmp 建 raw/managed root、不建 clone。程序/訊號相關 Popen 等均 mock；唯讀 git/hash identity 檢查是實際執行。沒有啟 browser、產品命令或 canonical supervisor。所有保留輸出均為本 reviewer 前綴，候選 hashes 未變。

## 未實測範圍與停止邊界

未親跑真 Chrome/readiness、雙 viewport／四 PGQ、Darwin 真 PGID/signal/TTL/resource stop、真 Browser.close、root/marker/PID cleanup、host capacity admission、unknown group recovery。既有 canonical 整合／入口測試為 Mainline 背景證據，不冒稱本 reviewer fresh host。

外層 wait／SIGTERM／強殺時，client進度可能不完整；精確原碼/首因以原 receipt、process journal、observer與stderr分開解讀。observer/scanner contract failure 時維持本契約停止 scanner patch 線、不R3；產品 assertion failure不自動repair。Mainline 仍須依兩review結果與正式前置條件才執行唯一hostrun，不另開smoke。

交付後停寫；P2 與本窄域 GO 一併交回，不自行修改或解鎖。
