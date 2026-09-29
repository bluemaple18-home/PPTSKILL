# Owned-group 唯一正式 host：Reviewer B evidence closure

日期：2026-09-29。**本輪 host acceptance evidence：GO。此次限定核對未發現仍阻塞 Core3 closure 的證據缺口。** 可交 Mainline 綜合既有產品 CODE GO 關卡；本 reviewer 不更新任務狀態、不代表重審整個產品。既有兩審 P2 保留，不修、不升級為本輪阻塞。

僅讀本輪 `host-acceptance-owned-group` 原始 artifacts 與必要固定身份來源，執行 JSON／hash／檔案 absence assertions。未重跑 host、Chrome、PGQ 或任何測試 suite，未改 source／manifest。以下 fresh 指 Mainline 本輪實際執行；B fresh 是對其 artifacts 的獨立唯讀核對，不是 B 執行 host。

## 本輪來源與結果交叉核對

- controller 記錄 canonical observer → `/Users/matt/ai-core/scripts/tmp_session.py browser -- …/host-client-owned-group.py`，不是舊 smoke 或 mock。
- supervisor PID **15531**，exit **0**；client、historyBrowser、PGQ、Browser.close 均 **0**。controller/client status PASS、errors=[]，所有 controller checks=true。
- standalone `client-receipt.json`、`resource-observation.json`、`undo-redo/acceptance.json` 分別與 controller 內嵌完整物件相等。
- `historyBrowser.log` 指向此 run 的 acceptance.json；PGQ raw log 有 **16 個具名 ✔**，summary tests/pass=16、fail/cancelled/skipped/todo=0，duration **706156.966541ms**。不是引用舊測試數字。
- 雙 viewport **1280×720、1600×900，各 11 checks**，均 pass、targetClosed=true、traceback=false；console/pageErrors/networkFailures/httpErrors/remoteRequests 全空。20 個列出的 HTML artifacts 均在本 run 目錄，實測 bytes／SHA256 與 acceptance 完全相符；sourcePath 的當前 SHA 亦等於 sourceSha256。

## Scan #533：原始 ENOENT 與完整第二輪

共 **706 scans = 705 runtime + 1 cleanup**：704 runtime COMPLETE、1 runtime RECOVERED_COMPLETE、1 cleanup COMPLETE。沒有 FAILED/BUDGET_REJECTED/UNKNOWN；unfinishedScans=[]、diagnosticErrors=[]；line/opcode tracing=false。

scan **533**：

| 證據欄位 | 實值 |
| --- | --- |
| 首次實際 exception | FileNotFoundError，errno **2**，attempt **1**，`visit` 的 `before_stat` |
| relative path | `tmp/pptskill-geometry-wd8uUi` |
| 首輪 entries | **945** |
| 首輪 partial bytes/files | **30,586,501 / 747** |
| attemptsDiagnostic | 單筆，同 attempt/phase/path/errno/entries/partial，elapsed **0.013938624993897974s** |
| 完成 attempt | **2**，recovered=true，RECOVERED_COMPLETE |
| 最終 entries | **1891**，保留首輪 945，第二輪增加 **946**，不是重新從 0 覆蓋 |
| 第二轮完整 counts | **31,252,760 bytes / 748 files** |
| 全 scan elapsed | **30.441957991570234ms** |

journal 有 3 個 exception trace records，與 diagnostic events 相同：它們是同一 ENOENT 經遞迴 visit 與 scan frame 的傳播，**不是三次 filesystem race，也不是第三次 attempt**。頂層傳播 phase=close 不覆蓋首個 before_stat 與 attemptsDiagnostic。

全 journal 尾端換行完整；start/end IDs 都連續 **1…706**；去除 end record 的 phase 後，**全部 706 筆逐物件等於 diagnostic scans**。3 個 exception records 全屬 scan533。所有 scan root/limits/counts 類別吻合；runtime 時限／entry ceiling 未超界，最大 runtime elapsed **427.5588329182938ms**，不是調高 5s ceiling 才成功。全部 counts 均低於 64 MiB／10000 files。

這證明本輪實際發生 bounded recovery，不只是一般 COMPLETE；不外推 atomic filesystem 或 hostile containment。

## 同 PGID、退出與 absence

- 原始 session.json：browser mode、owned root `/private/tmp/aic-b-3cd6b953fafb49d3aa2e39b0ce5eff28`、outer leader **15537**。
- 原始 processes.jsonl：browser **15546**、client **15554**，兩筆 started 的 PGID 都 **15537**；兩筆 exited returncode 都 **0**。standalone session/processes 與 controller 內嵌內容完全相同。
- client receipt：pid15554、pgid15537、同一 root，TMPDIR/TMP/TEMP 全為該 root/tmp；historyBrowser PID15585、PGQ PID15677、Browser.close PID16879，皆 exit0。這些產品子程序 PGID 沒有另存 OS snapshot；證據是已審固定 ordinary-child runtime PGID check 成功與 canonical 整組收斂，並非另有產品逐 PID 的原始 ps dump。
- controller 保存本輪 `fresh-full-ps-pid-ppid-pgid-root` 觀測：observed_at_ns=**1790663360307564000**、process_count=**587**、historical_pid=15537、matches=[]；ownedRootAbsent/isolationMarkerAbsent/pidsAbsent/cleanupVerified 全 true。
- B 此次另外唯讀確認 exact owned root 與 repo git-common-dir isolation marker **現在均不存在**。沒有再次查 ps，也不把現在 PID 可能已重用的狀態當歷史證明。
- 限制明說：完整當時 ps 清單未存成 artifact，receipt 保存的是固定 canonical seam 的檢查結果／時間／方法／計數。這是已審契約既有留證形式；本次核對可驗證其內部一致性與原始 session/group/exit，不能聲稱重建當時全機 process table。未因此要求新增 runtime 或補跑 host。

## Before / after / 現存 bytes

controller **before == after** 完整相等；B 又逐檔重算目前 SHA：

- 產品 **75 source、4 protected** 全相同，並等於固定 `transaction-boundary-r07-mainline-hashes.json`；該 manifest hash 也符合本輪 FINAL manifest。
- ZIP **2,329,758 bytes**，SHA256 `862bb19f82b10fab9a244a1c334fed1f39b6edc1ad5c5ff95aebe3cc04daf290`，before/after/current 相同。
- canonical 六檔 hashes 相同；HEAD 仍 **71b774d31b8e7aa9e05786c8dc431c7528dabdc1**。scanner before/after/current 都為 `0e411a0c970ae17f9fac805b5d3010ebc0742a5b6b774eb15b8c06137ffe8edf`。
- client/controller 仍原審 SHA：`52aed789555807495ea62a1179a4e5b143c631331bb65f2358f8a7e1a30a6430`／`5a73298ff0617994788f9c159582ab54d07d3e55fb7441a79ae2301a29e4e1ea`。本輪所有 harness、integration receipt、callchain audit 的現存 hash 都等於 before/after 固定值。
- pending rejection 測試已改 explicit pending fixture，實際 snippet 與所述三行調整吻合；test SHA **bff46f0ec43b2880f0daab192e806ae53a1e6554c024088d5209b11c620802fa**。FINAL manifest SHA **bc09789aef80baae04c6169799210de9b1000ebfb285d67b1bf3dc4db6b0db2c**，與本輪 before/after 相同。它們不是原 pending 時的 hash，未誤稱完全未變。
- `host-owned-group-final-offline.log` 原始 summary **13/13 OK，0.186s**，SHA `dda2bf834615b7c5cb118758aa5891dada97a2fc7220e9aedeaa99fd97c4dcc1`；屬 Mainline fresh offline，不是本次 B 重跑或 host 測試。

## 原始 stderr，不掩蓋訊息

launcher.stderr 為空；lifecycle stdout 為空。lifecycle stderr 並非空：包含本輪 loopback DevTools endpoint、allocator 重複載入訊息、CVDisplayLink 錯誤、GCM DEPRECATED_ENDPOINT／QUOTA_EXCEEDED 與 Metal adapter 訊息。這些原文保留且已 hash 固定；沒有將它們改稱「零 stderr」。本輪產品頁面的 error arrays 與實際 assertions 仍通過，沒有 scanner failure、非零退出或缺 cleanup 證據，故未形成此固定驗收的新增阻塞。不由 remoteRequests=[] 外推 Chrome 全程序沒有任何背景網路。

## 本輪 artifact SHA256

以下相對 `host-acceptance-owned-group/`：

| artifact | SHA256 |
| --- | --- |
| controller-receipt.json | `4cc490070392ed1b7519af4b94e6df66091beea975d36c20e3340c43bd0bcb25` |
| resource-observation.json | `a5e3c94d1c6a4c0ff9248c2cbd1ed6d84261161ed60534c4afd9b5a3a51e0273` |
| scan-events.jsonl | `d169da88f09afc5881c5b657dcc424d376a8d27d519681af5a2ed6807cfd83e4` |
| client-receipt.json | `2e92ace56b65ecf89b99a0e74233542ae33b890eae919242c0b4fe8d15040579` |
| pgq.log | `76968514abfc6654f4a5eb7e382abb9c837f0aae4c22fbe8ea54de6b5e97de3c` |
| undo-redo/acceptance.json | `6e1831657c56e0abc0e3c7e404f7fb133972d0f38caf78a1634a0db8dfffd95b` |
| lifecycle/evidence/processes.jsonl | `721366f778dc82e4e5ddafb0571f5b9c4d87cbb5765cb4919bfb2b0f2a0d4c0f` |
| lifecycle/evidence/session.json | `806e12337dc67fa6745ba966ea6820280ab43df029b829173041690c98af658f` |
| lifecycle/evidence/stderr.log | `aca2e1a2416f239f63aa29cfd1c00045e4c02186438c0df030454ff479ec83de` |
| lifecycle/evidence/stdout.log | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

## Core3 closure 邊界

既有產品 CODE GO 引用 `review-round-08.md`（SHA `ab4d87390d22be7da90f9f16253101e00c88bccb0624e5f42668ae3ca881fd79`），固定 packaged **9ce7396a481621960f6f2c89ff7fcf352c0e515a**、code **f3d8a11865a5af25f34a08a5b65dccb3fed6914f**。原 Writer full **1061/1061** 是歷史證據，不是這次 fresh 重跑；此輪 fresh 產品證據是雙 viewport＋PGQ16。

此次 host evidence 已補足原 HOST_OBSERVER_BLOCKED／產品 host acceptance 缺口。既有 mapping 兩審 P2 保留、不修；review-round-08 註記的既有 Crop F2/P2 仍為另域 OPEN，不藉本輪 closure 宣告解決。**在本次固定 Core3 範圍內，未發現新增或仍未滿足的 blocking evidence；可交 Mainline 作 Core3 closure 裁決。** 只新增本 receipt，完成後停止寫入。
