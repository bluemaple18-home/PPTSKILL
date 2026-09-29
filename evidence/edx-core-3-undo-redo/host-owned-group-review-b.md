# Owned-group mapping — 獨立盲審 B

日期：2026-09-29。**GO（1 項非阻塞 P2；無 P0/P1）。** 此 GO 限固定四檔的 offline code review，不是 host／產品 acceptance PASS，也不代替 Mainline 與另一 reviewer 的裁決。未讀另一 reviewer 本輪結果。

契約依 `tasks/edx-core-3-observer-r2-integration.md` 最新 2026-09-29「先推上去再繼續吧」段；只審薄 client mapping。canonical HEAD 實測為 `71b774d31b8e7aa9e05786c8dc431c7528dabdc1`。不修改或重審 canonical scanner/runtime；可信任、non-detached callchain 為既定邊界。

## 固定 SHA256

| 候選檔案 | SHA256 |
| --- | --- |
| `host-client-owned-group.py` | `52aed789555807495ea62a1179a4e5b143c631331bb65f2358f8a7e1a30a6430` |
| `host-controller-owned-group.py` | `5a73298ff0617994788f9c159582ab54d07d3e55fb7441a79ae2301a29e4e1ea` |
| `host-controller-owned-group-test.py` | `a6b2080f96705da049193bf2ef0130a2c0a7b0602c4f190851df34e1d23bda39` |
| `host-controller-owned-group-manifest.json` | `43d6d616df3b2add2534ee1e39a93a85f7392471e74b0da47ba461c495fab895` |

以上與 Worker receipt 相同，B probes 前後也相同。manifest `PREPARED_PENDING_MAINLINE_FINAL` 正常；未修改為 FINAL，亦不以 pending 單獨阻塞。

## Finding B-OG-01

**[P2 / correctness，非阻塞] receipt 暫時寫入故障會改變已知產品非零的 client 回傳優先序。**

- 位置：`host-client-owned-group.py:75`–`:77`、`:106`–`:108`。
- 觸發：historyBrowser 的 wait 已回 7；`ordinary()` 把 historyBrowserExit=7 放入記憶體後，該次 `save(receipt)` 丟 EIO；後續 save 與 Browser.close 正常。
- 實測結果：client 回 **2**，最終 receipt 是 NOT_PASS、historyBrowserExit=7、browserCloseExit=0、firstCause=EIO，未啟動 PGQ。原因是 ordinary 未返回，run_client 尚未把已知 7 設為自身 exit。
- 對照：沒有該 I/O 故障時，product 7 加 Browser.close 9 仍正確回 7；這條非零優先序已獨立驗證。
- 風險：只看 process exit 的 consumer 會得到通用 evidence failure 2，與已知產品 7 不一致。**不會偽造成功、不會繼續 PGQ、原 child exit 並未從最終 evidence 遺失，故不列為 host ownership 阻塞。** 這也不同於先前 B-BC-01 的 evidence failure 回 0。
- 建議：若要讓異常留證路徑也維持同一非零優先序，可在落盤前保存 client 的既知非零結果，另記 evidence error；不增加 runtime 或清理權限。本 reviewer 未修改。
- 重現：`host-owned-group-review-b-probes.py::NarrowProbes.test_post_wait_save_failure_replaces_product_exit`。高信心；probe 通過代表行為已重現，不代表此 P2 已修正。

## Spec / standards 判定

Spec：主要 ownership／停止／留證契約通過離線驗證。managed env 與 generic→PPT port 映射、固定 tasks、product fail 不跑 PGQ、timeout/negative signal status 不主動 close、原 child exit 保存、outer unknown 不介入、absence 與 diagnostic fail closed 皆成立。P2 對 scalar client exit 的例外如上，不把它描述為所有 failure 下退出碼都完全一致。

Standards：無新 session/group、SignalController、killpg、cleanup authority；外層只 Popen 一次 canonical observer/tmp_session 並 wait；client 的 product／Browser.close 都是普通 child。舊 NO_GO controller 只復用 tasks、identity、browser receipt、diagnostic 等接點，沒有呼叫其 run_task／finish_supervisor。原 64 MiB／10000 files／3600s 未放寬。

## Activation → finally 副作用與 failure states

| 接點／副作用 | 行為、失敗狀態與證據 |
| --- | --- |
| import 與歷史 helper | 固定歷史 controller hash，import 不 launch；private module 接點映射到新 OUT/MANIFEST/INTEGRATION，未改歷史檔 |
| FINAL／identity／capacity admission | pending 拒絕；canonical HEAD/current/committed hashes、integration、75 source/4 protected/ZIP、固定 callchain audit 校驗；capacity-before 沿原 seam；任一失敗不啟 supervisor |
| OUT / launcher logs | exclusive OUT 防止覆用舊 run；log/open/Popen 失敗留下部分 evidence，finally 不能判 PASS；只一次 launch，無 retry |
| canonical browser -- client | command 固定 `_observer → tmp_session browser -- python client`；原 TTL/bytes/files；唯一 outer owned group / cleanup authority 沿 canonical，不建立第二群組 |
| client managed context | 檢查 ACTIVE、absolute root、root/tmp/profile/evidence 為實體目錄；TMP 三變數、evidence/workdir、session root/mode/pid、parent PGID、manifest purpose/budgets/TTL、generic port 必須一致。失敗不啟產品；無 root 修復／刪除 |
| readiness／port | 25s 有界等待本次 port 檔；合法 loopback endpoint 才開始產品；缺檔重等，invalid endpoint 超时；非 ENOENT I/O 拒絕；symlink/oversize 沿 regular-read seam 拒絕 |
| mapping / logs / product launch | 只加 PPTSKILL_DEVTOOLS_ACTIVE_PORT；TMP 等繼承；固定 repo cwd；log exclusive；普通 child launch 後核對 PGID，錯誤設 outerStopRequired、禁止自行處置群組 |
| product wait / raw exit | wait timeout 900/1800；positive nonzero 記 raw exit、停止後續並嘗試正常 Browser.close；negative exit 轉 128+signal 並交 outer；save 故障 scalar exit 例外見 P2 |
| browser receipt → PGQ | 第一產品成功後還須雙 viewport receipt gate 通過，才能啟四個固定 PGQ、concurrency=1；無 repair／重跑分支 |
| timeout / KeyboardInterrupt | timeout 記 124、KeyboardInterrupt 記 130；設或保留 outerStopRequired，不開始 PGQ、不自建 signal controller、不 kill/terminate child。SIGTERM／outer KILL 可能沒有 client finally；缺 evidence 不能 PASS |
| 普通 Browser.close child | 正常／可處理產品失敗時才 close；同群組普通 child，10s wait；close failure 不能把產品既有非零變成功，成功流程遇 close failure 改非零。timeout/未知／negative status 交原 outer 收斂 |
| client receipt 寫入 | 保存進度與 firstCause；persist failure 不視為成功。覆寫檔遇 signal/KILL 可能不完整；outer JSON read／finalize 會拒絕，不能補造缺失結果 |
| outer wait 3675s | 只為等待證據上限，不改 3600s runtime TTL；timeout／中斷記 UNKNOWN_NO_EXTERNAL_INTERVENTION，**不 Browser.close、不 terminate、不 kill、不清 root**；由 canonical 原規則繼續負責停止／unknown 保留 |
| exact cleanup identity | 匯出 session root 須符合 canonical parent/prefix、mode、pid；恰 browser/client 兩個 started records 且同 outer PGID；root/marker lexists 與 fresh recovery_process_observation 都須成功；foreign root 或 remaining root 反例被拒絕 |
| raw processes / PID | 保存 processes.jsonl；已知 browser/client PGID 檢查配合 canonical 整組收斂。PID absence 依原 recovery seam，不新增 ps／signal runtime，不把未返回 supervisor 當清理完成 |
| diagnostic / original causes | 保存 raw resource-observation；runtimeFailures、diagnosticErrors、unfinished 保留分類；scanner hashes/root/limits/counts/runtime≥2/cleanup/journal end 一致檢查；recovered ENOENT 原 events/causes 不刪除 |
| final identity/capacity/receipt | after 與 before 相同、capacity-after、browser/client/supervisor/cleanup/diagnostic 全部成立才 PASS；任何 evidence 異常導致 NOT_PASS；最後 controller receipt write 失敗不能宣称完整交付 |

未發現原「獨立 product group 使用被提前刪除 tmp」問題重現；此結論依已整合 canonical 單 outer authority 與 trusted non-detached callchain，不外推 hostile containment。

## Reviewer B fresh 證據

從 PPTSKILL repo root：

```sh
/Users/matt/ai-core/.venv/bin/python -B evidence/edx-core-3-undo-redo/host-owned-group-review-b-probes.py
```

結果 **16/16 通過、0 skip**：現有 offline tests 13 個，加 B probes 3 個（cleanup probe 含 valid/foreign/remaining）。log：`host-owned-group-review-b-tests.log`；source：`host-owned-group-review-b-probes.py`；詳細 hashes/反例：`host-owned-group-review-b-results.json`。

測試使用 mock Popen／group／clock／host seams；只有既有 identity test 執行唯讀 git/hash 校驗。fixture 全限制於本 evidence 目錄的 `host-owned-group-review-b-fixture-*` 並清除；未建立 managed tmp root、clone 或新 checkout，未啟 browser/client/PGQ/supervisor 真程序。

CodeGraph 先查指定新 mapping symbols，回傳 unrelated browser geometry，改用限定四檔／最新契約／Worker receipt 查讀。沒有讀另一 reviewer 的結果。沒有重跑 canonical 大型 suite 或 scanner。

## 未實測與交回

未實測真 Chrome readiness、CDP Browser.close、雙 viewport、四支 PGQ、OS signal delivery、TTL/bytes/files 停損、真 process-group convergence／unknown root preservation、root/marker/PID host cleanup、正式容量 admission。這些須由 Mainline 在兩審 GO 並完成原執行前條件後，依既有契約進行唯一一次 host run；scanner observation 失敗仍停止、不 R3。

**交回 GO（保留上述非阻塞 P2）；manifest 仍 pending，由 Mainline 決定 FINAL。** 四檔 candidate 未改、未 commit、未 launch；只寫本 B prefix 的 receipt/probes/log/results，完成後停寫。Core3 acceptance 維持未驗，不將本 code review 當產品 closure。
