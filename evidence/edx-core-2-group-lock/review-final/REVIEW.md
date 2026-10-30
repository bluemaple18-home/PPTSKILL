# Core2 Repair1 whole-card final addendum — Ramanujan

固定產品與 ZIP commit：`88f401c7798976babfd28df991a6ba5b6b784e4e`。

**Whole-card verdict：GO。** 承接原線 Repair1 targeted CODE GO；本次只补核 final evidence，原有 pending 已解除。此為 Core2 驗收判定，不代表授權 merge／push／deploy。

## Findings 與 residual

- 本次新／Core2 未解 findings：**P0=0、P1=0、P2=0、P3=0**。
- GL-R1 P1、GL-R2 P2 維持 RESOLVED。
- **Inherited Crop F2：OPEN／P2，1 項 residual**，依原卡留第6張 Final Closure，不重分類成 Core2 新 finding，不宣稱零風險，也未修復它。

## 獨立核對結果

| 證據 | 核對結果 |
|---|---|
| host06 controller | status PASS；readiness/groupBrowser/PGQ/Browser.close/supervisor 五項 exit 全 0；無 error 欄位 |
| host06 browser | 1280×720、1600×900 各 27 check records PASS；五類 errors 全 0；各 targetClosed=true |
| PGQ | 原始 pgq.log 有 16 個唯一 PASS test names、單一 tests=16 summary，fail/cancelled/skipped 各 0；controller script 為四個指定檔案、單輪 `--test-concurrency=1` |
| source freeze | 11/11 實體檔 SHA256 符合 source-hashes.json，亦各自符合 `git show 88f401c:<path>`；controller before/after 全 true |
| protected freeze | 4/4 實體檔 SHA256 符合凍結值，controller before/after 全 true；未修改 |
| ZIP | 2,322,437 bytes；實體、固定 commit、freeze、controller before/after、lifecycle archive hash 全一致 |
| distribution lifecycle | lifecycleStatus/packageSmokeStatus=pass；sharedCore ready/single=true；profile save=pass 且 uninstall 後保留 |
| cleanup | receipt ownedRootAbsent/isolationMarkerAbsent=true；Reviewer 本輪另以 filesystem existence 確認兩者目前不存在；diagnosticVerified=true，724 scans |
| 歷史保留 | host05 controller=NOT_PASS、browser=fail；host05 acceptance 與上次 Reviewer 保存副本 hash 相同，未覆寫歷史失敗 |

ZIP SHA256：`1f8ed872504a5a9f655a52dad2adda52d065e78288eb3d34d698475858dfa2b9`。

host06 browser acceptance 與前次 targeted review 保存副本 hash 完全相同，因此沿用當時已核對的 native SE hit=true、trusted resizeGroupStart/update/end、minimum release 全組拒絕、canonical/DOM 比例與 export/reopen 證據。27 是 check records（含 diagnostics），不是 27 個独立測試。

## Fresh、既有執行證據與 committed product 的分界

- **本輪 fresh 執行測試 0、browser 0、PGQ 0**。Fresh 工作只有唯讀解析 receipts/log、hash 比對、固定 commit 對照與 cleanup 路徑存在性核對。
- **前次 Reviewer fresh：76 PASS／0 FAIL**，承接同一固定 SHA 的 targeted receipt；未重跑、未重新計入本輪 fresh。
- **Mainline 既有執行證據**：host06 雙 viewport、PGQ 16/16、controller、distribution lifecycle；本輪獨立讀取與交叉比對，不冒稱 Reviewer 執行。
- **Committed product**：source／ZIP 已綁定 `88f401c`。本輪核對的九個 receipt/log/controller-script evidence 檔不在此產品 commit；它們是 repo 中已提供的證據實體，逐檔 SHA256、大小与路徑已固定記於本 addendum `receipt.json`，未把它們誤稱為該 commit 內容。
- 前次 ZIP 74 個 runtime/schema/contracts source-byte-match、38 個 artifacts hash 核對及 host06 完整 source HTML 等同 candidate render 的證明沿用，不重跑。

## 限制

GL-R2 的例外回退證明仍是 synthetic after-effect injection，未宣稱普通 browser 曾自然觸發。Lifecycle 的 hostCapabilityStatus=partial，原因為 Gemini CLI 不在 PATH；lifecycle 本身 pass，不將其宣稱為 Gemini host recognition pass。這些限制不改變本卡既定驗收判定。

沒有重跑 tests／browser／PGQ，没有修改 repo／ZIP／protected。只在 reviewer owned tmp 新增本 addendum 與 receipt。所有前次報告與歷史 FAIL 保留。
