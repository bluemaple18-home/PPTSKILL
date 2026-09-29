# Reviewer A — 本輪正式 host acceptance evidence closure

日期：2026-09-29。**HOST ACCEPTANCE EVIDENCE：GO。就本次固定 Core3 契約，未發現仍需阻塞 closure 的證據缺口。** 可交 Mainline 以既有產品 CODE GO 加本輪 host 驗收收束 Core3；本 reviewer 不修改 task 狀態、不開下一階段。

這是 Reviewer 對 **`host-acceptance-owned-group/` 本輪正式 host 輸出** 的獨立唯讀核對，不是 Reviewer 重跑 host，也不是舊 smoke／mock 結果。本輪沒有啟 Chrome、PGQ、host fixture 或 ps，沒有改 source、manifest、原 review 或原 evidence。既有兩審同 P2 保留，不修、不因這次成功而關閉。

## 核對方法與結果

以指定 Python `-B` 執行唯讀 JSON／JSONL parsing、逐筆相等比較、SHA256、檔案大小與存在性檢查，以及限定 `git rev-parse`／`git show`；全部 assertions 通過。不是只讀 PASS 文案。

| 驗收面 | 本輪交叉證據 |
| --- | --- |
| 正式執行結果 | controller `status=PASS`、`supervisorExit=0`、errors空、全部 checks=true；client `status=PASS`、exit/historyBrowserExit/pgqExit/browserCloseExit均0、errors空。controller 內嵌 client／diagnostic／browserAcceptance 分別與獨立原始 JSON 完全相等。 |
| 全量 scanner observation | 706 scans，id連續1–706；705 runtime＋1 cleanup。705 COMPLETE、僅id533 RECOVERED_COMPLETE；沒有 FAILED/BUDGET/UNKNOWN、unfinishedScans或diagnosticErrors。scanner前後SHA一致，line/opcode tracing=false。 |
| journal 完整性 | 1415 records＝706 start＋706 end＋3 exception，尾端 newline 完整。移除 end 的 `phase` 後，706份 end records 與 diagnostic scans 全量逐項完全相等；每個id有唯一start/end，該id的exception records也與scan.events完全相同。 |
| runtime 預算 | 每筆 runtime root/limits一致，counts型別完整非負，bytes/files/entries/elapsed均在原上限。實際 runtime最大31,950,380 bytes、751files、1891entries、427.558833ms；上限仍64MiB／10,000files／21,024entries／5s scan、TTL3600，沒有放寬。 |
| 雙 viewport | acceptance為pass；1280×720、1600×900各11 checks，targetClosed=true、traceback=false；console/pageErrors/networkFailures/httpErrors/remoteRequests皆空。包含本輪Core3 toolbar／Ctrl+Shift+Z／group-lock replay／export offline reopen。 |
| artifacts | source.html 的sourceSha256吻合；兩viewport共20份receipt所指HTML，全部位於本輪目录，bytes與SHA逐一吻合。這是互動／匯出驗收證據，不另宣稱設計視覺品質審查。 |
| PGQ | 本輪pgq.log有16條實際成功test紀錄；summary tests16/pass16/fail0/cancelled0/skipped0/todo0，duration706156.966541ms。client記本輪PGQ exit0；未使用舊PGQ或舊smoke。 |
| identity | controller before與after整份完全相等；75 source、4 protected、ZIP、6個canonical檔、固定harness與callchain audit逐項重新算SHA吻合。canonical現HEAD與本輪記錄均為71b774d31b8e7aa9e05786c8dc431c7528dabdc1，6個檔案現值及該commit bytes都吻合。 |
| cleanup | 本輪session/processes原檔與controller內嵌記錄相等；browser/client均有原始exit0。root/marker/PID/cleanupVerified都true；下文區分本輪PID觀測與Reviewer檔案現況核查。 |

## Scan 533：實際 ENOENT 與 bounded re-observation

- kind=`runtime`，root=`/private/tmp/aic-b-3cd6b953fafb49d3aa2e39b0ce5eff28`。
- 首個exception：`FileNotFoundError`、errno2，`visit`第1128行、attempt1、phase=`before_stat`；relativeDirectory=`["tmp"]`，entry=`pptskill-geometry-wd8uUi`。
- 第一次attempt diagnostic：entries **945**、partial bytes **30,586,501**／files **747**。不是泛稱 race、不是 unknown I/O，也不是根目錄錯誤。
- 成功結果：attempt **2**、recovered=true、outcome=`RECOVERED_COMPLETE`、entries **1891**，所以第二次另消耗 **946** entries；沒有在retry時將累計entry budget清零。
- 最終counts **31,252,760 bytes／748files**，elapsed **30.441958ms**。回傳的是第二次完整counts，不是第一次partial；兩份counts均未跨ceiling。
- 三條exception是同一ENOENT沿兩層visit及scan frame傳播，不能當成三次獨立I/O失敗；其餘scan均COMPLETE。scan frame事件顯示close phase是unwind位置，不改變首因與attempt diagnostic的before_stat事實。

這證實本輪真host確實用到R2 recovery，並保留首次原因；不外推成原子filesystem snapshot、任意host或hostile filesystem保證。

## 同 PGID 與 absence 證據的界線

原始 `lifecycle/evidence/session.json` 記outer PID **15537**；`processes.jsonl` 記browser PID **15546**、client PID **15554**，兩者PGID均 **15537**。獨立client receipt的pid/pgid/root一致，TMP/TMPDIR/TEMP均指本輪owned root/tmp；process journal有client/browser各自exited returncode0。

本輪產品PID為historyBrowser **15585**、PGQ **15677**、Browser.close **16879**。它們未另保存獨立PGID快照；同群組判定依固定普通Popen接線、已審trusted non-detached callchain，以及 `ordinary()` 啟動後的PGID檢查成功並完整返回。不能聲稱原始log逐一列出了所有descendant PGID。

本輪canonical PID觀測記錄：`observed_at_ns=1790663360307564000`、`historical_pid=15537`、`process_count=587`、`matches=[]`，方法 `fresh-full-ps-pid-ppid-pgid-root`。這是本輪原生collector執行時的結構化absence證據，配合outer exit0／完整cleanup scan／browser-client exit記錄，符合已凍結的可信任群組清理契約。

Reviewer另行唯讀確認本次root及repo精確marker目前都不存在：

- `/private/tmp/aic-b-3cd6b953fafb49d3aa2e39b0ce5eff28`
- `<PPTSKILL-repo>/.git/.ai-core-tmp-artifact-isolation.json`

未保存完整原始ps表，也未由Reviewer再次跑ps，因此不宣稱獨立重建當時587筆程序或重新證明所有歷史PID現在不存在。此為證據粒度界線，並非本契約新增阻塞；不能拿本次檔案absence現況取代當時group convergence。

## FINAL、三行 test 調整與固定產品

client/controller仍是原review固定bytes：

- client：`52aed789555807495ea62a1179a4e5b143c631331bb65f2358f8a7e1a30a6430`
- controller：`5a73298ff0617994788f9c159582ab54d07d3e55fb7441a79ae2301a29e4e1ea`
- FINAL manifest：`bc09789aef80baae04c6169799210de9b1000ebfb285d67b1bf3dc4db6b0db2c`，與before/after所記完全相同。
- 新test：`bff46f0ec43b2880f0daab192e806ae53a1e6554c024088d5209b11c620802fa`。將explicit pending fixture的三行在記憶體還原舊單行後，SHA精確回到原review的`a6b2080f96705da049193bf2ef0130a2c0a7b0602c4f190851df34e1d23bda39`；沒有其他test delta，未寫回檔案。
- `host-owned-group-final-offline.log` 記 **Mainline fresh 13/13、0.186s、OK**；SHA=`dda2bf834615b7c5cb118758aa5891dada97a2fc7220e9aedeaa99fd97c4dcc1`。Reviewer只核讀，沒有重跑或改称Reviewer fresh。

產品 CODE GO 引用既有 `review-round-08.md`，packaged commit **9ce7396a481621960f6f2c89ff7fcf352c0e515a**、code commit **f3d8a11865a5af25f34a08a5b65dccb3fed6914f**。兩個Git ref核對無誤，固定manifest的codeCommit相同。ZIP為 **2,329,758 bytes**、SHA **862bb19f82b10fab9a244a1c334fed1f39b6edc1ad5c5ff95aebe3cc04daf290**；本輪before/after、目前檔案及9ce7396 commit中的ZIP皆相同。75／4亦符合原固定manifest。

**1061/1061是round-08引用的歷史Writer證據，這次沒有fresh重跑。** 本輪新補足的是固定產品的正式雙viewport／四PGQ與受管host gate，不重做整個產品code review。既有Crop範圍外問題及兩審同P2都不因此被改寫或關閉。

## 原始 logs 與 SHA 鎖定

以下路徑皆相對本輪 `host-acceptance-owned-group/`：

| Evidence | SHA256 |
| --- | --- |
| `controller-receipt.json` | `4cc490070392ed1b7519af4b94e6df66091beea975d36c20e3340c43bd0bcb25` |
| `resource-observation.json` | `a5e3c94d1c6a4c0ff9248c2cbd1ed6d84261161ed60534c4afd9b5a3a51e0273` |
| `scan-events.jsonl` | `d169da88f09afc5881c5b657dcc424d376a8d27d519681af5a2ed6807cfd83e4` |
| `client-receipt.json` | `2e92ace56b65ecf89b99a0e74233542ae33b890eae919242c0b4fe8d15040579` |
| `pgq.log` | `76968514abfc6654f4a5eb7e382abb9c837f0aae4c22fbe8ea54de6b5e97de3c` |
| `undo-redo/acceptance.json` | `6e1831657c56e0abc0e3c7e404f7fb133972d0f38caf78a1634a0db8dfffd95b` |
| `lifecycle/evidence/session.json` | `806e12337dc67fa6745ba966ea6820280ab43df029b829173041690c98af658f` |
| `lifecycle/evidence/processes.jsonl` | `721366f778dc82e4e5ddafb0571f5b9c4d87cbb5765cb4919bfb2b0f2a0d4c0f` |
| `lifecycle/evidence/stdout.log` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `lifecycle/evidence/stderr.log` | `aca2e1a2416f239f63aa29cfd1c00045e4c02186438c0df030454ff479ec83de` |

Native stderr不是空的：有真DevTools endpoint、allocator、macOS CVDisplayLink、GCM DEPRECATED_ENDPOINT/QUOTA_EXCEEDED及GPU adapter訊息。沒有把它稱作零error log；已查的scanner outcomes、退出碼及產品頁面error arrays均未顯示因此造成失敗，這些native訊息本身不構成本輪固定驗收阻塞。

## Closure 裁決

- root question：原Core3 host observer／owned-group mapping blocker是否已由本輪實測補足？**是。**
- 本輪host evidence：**GO**；沒有新增可重現阻塞finding或必要evidence缺件。
- 剩餘P2：產品退出留證單次故障可能改變client code優先序，沿用兩審既有裁決；本輪成功沒有覆蓋該故障case，不予關閉。
- 可交Mainline收束固定Core3 acceptance；不等於全產品重審、production readiness或下一Core授權。
- 本review只新增此closure receipt；完成後停寫。
