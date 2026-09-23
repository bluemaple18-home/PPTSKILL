# EDX-WP2-S18 獨立 review 卡：安全刪除與主機驗收中斷

Status: REVIEW_COMPLETE / MAINLINE_CLOSED
Mainline acceptance: PASS
Independent verdict: CODE_PARTIAL / DIAGNOSTIC_TARGETED_GO；Mainline full CODE_REVIEW_GO
Branch: codex/edx-wp2-s18-delete-element
Base/main/origin-main: e3b90a8969f6d25416e746feefecba718d8d8931
Product candidate: 84ea9381cb438491449b6d871fbaeedea5e55b98
Host AI Core baseline: 81c80ffa349c58b0bb5006f7430ca1624b337774

請獨立唯讀審查 S18 的 delete-element API，並優先釐清主機驗收中斷的已知原因、缺失證據及第二輪診斷方案是否合理。分開交回產品與診斷方案 verdict；不得將主線或 Worker 的 PASS 當作獨立結論。這是審查交接，沒有完成驗收、獨立 GO 或合併授權。

## 1. 固定輸入

以下路徑相對於 <repo-root>（PPTSKILL-canonical）。先讀 tasks/edx-wp2-s18-delete-element.md 與 tasks/edx-wp2-s18-host-acceptance.md。依既有 CodeGraph→限域 rg/read 路徑進入 source；不新增審查框架或第二套紀錄系統。

產品以固定 base→candidate diff 為準，共10個 delivery 檔案。卡片、診斷腳本與 evidence 在本機工作樹，未包含於產品 commit、未推送；只 checkout candidate 會缺少這批輸入。診斷4檔與 AI Core 唯讀4檔的 SHA-256 見 evidence/edx-wp2-s18/review-input-hashes.json；產品hash沿既有source-hashes.json。開始審查先核對，輸入不同即明示差異。

ZIP：dist/PPTSKILL-0.1.0.zip，2,301,572 bytes，SHA-256 5ccedbc43af3f23f9582ed989c635479be10065752d231fefa4bf2104ff3ec74。原 source8/protected4 基準見 evidence/edx-wp2-s18/source-hashes.json。

## 2. 主機中斷與診斷範圍

第一輪 evidence/edx-wp2-s18/host-acceptance/controller-receipt.json 已結束，status=NOT_PASS；readinessExit=0、deleteElementExit=0、pgqExit=1、supervisorExit=2。launcher.stderr 原文為 `NO_GO: resource observation unknown (I/O failure)`。PGQ 原始紀錄僅10 tests／7 pass／3 fail，未完成預期單輪16。

owned root／isolation marker 已不存在，但沒有 Browser.close 成功紀錄，不能等同完整 cleanup PASS。底層 errno／出錯檔名未留下，不能推定磁碟滿、暫態檔案消失或 PPTSKILL regression。先前 Worker 的 `stream disconnected` 記於 execution-notes.md；這是另一事件，目前無證據證明同源，也沒有足夠傳輸診斷可裁定根因。

唯讀檢查下列檔案與其必要 callers/tests：

- evidence/edx-wp2-s18/host-controller.py、host-controller-diagnostic.py、resource-observer.py、resource-observer-selftest.json。
- <ai-core-root>/scripts/tmp_artifact_lifecycle.py、scripts/tmp_session.py、tests/test_tmp_artifact_lifecycle.py、tests/test_tmp_session.py；不得修改 AI Core。
- evidence/edx-wp2-s18/host-acceptance/ 下的 controller-receipt.json、launcher.stdout、launcher.stderr、pgq.log、lifecycle/evidence/session.json 與 stderr.log。

審查重點：從 scanner 的 OSError→統一訊息→resource-stop→owned process-group teardown，區分直接證據與推論；原 exception 的 cause 是否有可讀診斷；第二輪 exception trace 能否捕捉 errno/path、保留原例外與退出語意；trace 的額外開銷、sys.path/runpy 及 finally 寫檔是否影響 readiness、監督者或停損；正常／合成失敗 selftest 能證明與不能證明什麼。

第二輪 host-acceptance-02 尚未執行，目前僅 synthetic selftest PASS。本 review 卡不啟動 browser/controller、不修碼。若建議後續重跑，提出最小方案及需新增的觀測；沿既有主機權限流程、原容量／timeout／readiness／cleanup 門檻、新證據目錄，保留第一輪 FAIL；同一 blocker 再現即停止，不以重跑湊 PASS。

## 3. 產品固定審查範圍

- runtime/component-deletion.js、runtime/deck-editor.js：exact enumerable plain-data payload、明示 confirm=true、getter/symbol/prototype 拒絕；只刪獨立 text/image，composition 引用與 surviving identity remap 必須拒絕；Node/portable 契約一致。
- 同上：只移除 membership 與目標 geometry，保留其他內容／identity／DOM；before/after removal throw rollback、一次 revision、patch/export 同步重入、pending optimizer/picker/text busy、selection/gesture/S16 draft 與 late submit。
- tests/edx-wp2-s18-delete-element.test.mjs（71項）；既有 S2 stable-identity、S3 bounded-geometry 測試各只加入 delete-element literal，保留精確 assertions。tools/edx-wp1-s4-perf-mounted.mjs 的 nextSibling/insertBefore double 不代替真 browser。
- tools/edx-wp2-s18-browser-cases.mjs、tools/edx-wp1-s4-browser-acceptance.mjs：--delete-element-regression 僅 base10＋S18，混合 regression flags 拒絕；真 API/pointer 與 synthetic faults 分列。ZIP 與 checksum 核對封裝 byte-match。

不含 UI/keyboard deletion、Undo/Redo、OS IME、auto-layout、schema/vendor/persistence 擴充。不要用本卡展開 S19。

## 4. 已有證據與缺口

以下均為既有 Mainline 紀錄，本次開卡只核對檔案與 hash，沒有重跑測試。

| 項目 | 已有結果 | 相對於 evidence/edx-wp2-s18/ 的證據 |
| --- | --- | --- |
| Scoped | 14個實體檔案，449/449 PASS | scoped-mainline-02.tap、scoped-mainline-02-summary.json |
| Full nonbrowser | 75個實體檔案，945/945 PASS，無 skip/cancel/todo | nonbrowser-mainline-02.tap、nonbrowser-mainline-02-summary.json |
| ZIP | build／install→smoke→profile→uninstall PASS；兩個 runtime byte-match | distribution-build.log、distribution-lifecycle.json、zip-verification.json |
| S18 browser | 1280×720、1600×900各21/21；五類 errors 均0，targetClosed=true | host-acceptance/delete-element/acceptance.json、4張 S18 before/after PNG、visual-check.md |
| PGQ／完整主機生命週期 | NOT_PASS；7/10，未達單輪16；缺成功 Browser.close／supervisor exit0 | host-acceptance/pgq.log、host-acceptance/controller-receipt.json、host-acceptance/launcher.stderr |
| 第二輪診斷 | synthetic selftest PASS；正式主機 NOT_RUN | resource-observer-selftest.json、host-controller-diagnostic.py |

保留 mainline-reentry-initial.json（FAIL）、mainline-reentry-recheck.json（PASS）、nonbrowser-mainline.tap.gz／nonbrowser-initial-archive.json，以及 worker-log-archives.json 綁定的歷史 FAIL；不能把中途失敗覆寫或混算。先前 node.remove callback 中 applyLocalPatch 造成 revisionDelta=2／DOM-canonical 不一致的修復，需獨立核對 guard 與回歸測試。

## 5. 重播邊界

在 <repo-root> 使用既有 Node 工具鏈；套件操作只用 pnpm，本卡不安裝套件、不 build 或替換 ZIP。

```sh
git status --short
git diff e3b90a8969f6d25416e746feefecba718d8d8931..84ea9381cb438491449b6d871fbaeedea5e55b98 -- runtime tests tools dist
node --test --test-concurrency=1 tests/edx-wp2-s18-delete-element.test.mjs
```

擴大非瀏覽器重播時使用 scoped-files.txt（14個）與 nonbrowser-files.txt（75個）中逐一存在且不重複的檔案，--test-concurrency=1，分開記錄 fresh 結果。不得把讀取既有 evidence 稱作 fresh test/browser。只讀評審不得修改 tracked source、原 evidence、ZIP 或 protected4；測試產物僅使用本次可識別暫存位置。不 merge/push/deploy、不清其他 profile/root。

## 6. 交回格式與停止點

回報實際 base/candidate、診斷 input hashes、P0–P3 findings；每項包含 severity/category、path:line、trigger/repro、evidence、risk、suggested_fix、validation_gap、confidence。分列「本輪執行」「既有 evidence 核對」「未驗證」，沒有足夠資料時寫明 unknown，不補猜測。

分別給出 CODE_REVIEW 與 DIAGNOSTIC_PLAN_REVIEW 的 GO／NO_GO／PARTIAL，並說明阻塞 finding 或缺失證據。即使程式審查 GO，MAINLINE_ACCEPTANCE 仍須維持 PARTIAL / HOST_BROWSER_PENDING，直到雙 viewport、PGQ單輪16、readiness/Browser.close/supervisor退出與cleanup/hash全部符合原契約。獨立 Reviewer 各自判定，不讀另一名 Reviewer verdict；交回本卡結果後停止，修復與下一輪驗收由原主線接續。

## 本卡交回結果

見evidence/edx-wp2-s18/mainline-closure.md及mainline-review/，本卡原指令／原輸入hash保留作初審歷史。修復後診斷hash另存mainline-review/repair-input-hashes.json。Owner要求接續後，Mainline已正式執行第二輪且全PASS；不得把診斷GO或native產品抽查單獨當整體GO。
