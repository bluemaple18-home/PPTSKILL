# Observer R2：AI Core canonical 採用裁決

Status：**GO_FOR_CANONICAL_INTEGRATION / CANONICAL_NOT_INTEGRATED / HOST_APPLICABILITY_PASS / CORE3_ACCEPTANCE_PENDING**。

日期：2026-09-28。此 receipt 完成的是固定 R2 候選的採用裁決；尚未修改 AI Core canonical、未重跑 host smoke、未執行 Core3 browser／PGQ。

## 裁決

**GO：允許下一個既有 Mainline frontier 將固定候選 `4edd0747a25b13920b3ab1ead99895a99dbe8964` 整合至 AI Core canonical。**

本裁決只對下列固定 lineage 有效：

- canonical base：`c23e46555b73a29f16319c657622acb1acc51e7a`
- candidate：`4edd0747a25b13920b3ab1ead99895a99dbe8964`
- candidate parent：`c23e46555b73a29f16319c657622acb1acc51e7a`；base→candidate 僅 1 commit
- scanner SHA256：`0e411a0c970ae17f9fac805b5d3010ebc0742a5b6b774eb15b8c06137ffe8edf`
- tests SHA256：`b517c796fa45124bfffc1ab22a54c7ea904b302ae5a917b0e164877b37cf199a`
- docs SHA256：`bdded7bdac133b1e967365d0a19ac293fb8656f939e3a3719f259638543ba362`
- delta 僅：
  - `scripts/tmp_artifact_lifecycle.py`
  - `tests/test_tmp_artifact_lifecycle.py`
  - `docs/tmp-session-lifecycle.md`

## 執行當下身分核對

AI Core 實測 canonical HEAD 為 `c23e46555b73a29f16319c657622acb1acc51e7a`，與本卡固定 base 完全一致；`merge-base(base, HEAD)=base`、ahead/behind 為 `0/0`，tracked dirty 為 0，因此本卡的 canonical-drift HOLD 條件未觸發。

工作樹另有兩個既存 untracked work dirs，整合時必須原樣保存，不得 reset／clean：

- `.work/CARD-CODEX-WEB-GPT-RETAINED-CONTEXT-20260924/`
- `.work/CARD-PPTSKILL-PGQ-HOST-ROUTING-AND-OBSERVER-HANDOFF-20260924/`

live canonical scanner SHA256 為 `427162d34af5be6f3269c418f141716130909ce3fea82b5e3b4431732ebfdd6c`，與 host-smoke receipt 保存的 pre-integration canonical identity 一致。

固定 bundle 已重新 `git bundle verify` 通過；以 live canonical clone 補足 prerequisite 後 fetch bundle，重建 ref 精確得到 candidate `4edd0747a25b13920b3ab1ead99895a99dbe8964`，merge-base 精確為 `c23e46555b73a29f16319c657622acb1acc51e7a`。三檔 diff 與上述 SHA256 亦逐一吻合既有 A/B review evidence。

## 採用理由與證據

R2 的契約邊界與封板一致：只在 owned browser runtime sampling 的 descendant ENOENT 上允許一次 whole-scan re-observation，最多兩次 attempt；原 5 秒 deadline 與累計 entry budget 不重設，observed budget violation sticky fail-closed，cleanup/general、special/no-follow allowlist、EIO/EACCES/EPERM、root identity、depth/deadline/entry-limit 均未放寬，也未引入 watcher、第二 scanner、第二 supervisor 或新 runtime。

離線與 review 證據一致：

- Mainline scanner 33/33 PASS。
- host harness 最終 14/14 PASS。
- Reviewer A CODE GO；定向複核 9/9 PASS。
- Reviewer B 原 B-01 為 identity guard errno 留證缺口；定向複核已 **CLOSED / VERIFIED FIXED**，scanner commit 未因此改變。
- candidate 三檔與 harness identity 在 recheck evidence 中維持固定。

唯一一次 managed host smoke 支持 host applicability：7 次 runtime scans 全部 COMPLETE、均為 attempt 1，Browser.close=0、supervisor=0、owned root／marker／相關 PID 均清除，controller `errors=[]`、`diagnosticErrors=[]`、`unfinishedScans=[]`。因此 host applicability 為 **PASS**。

host smoke 中沒有自然發生 descendant ENOENT，故狀態必須保留 **RECOVERY_NOT_OBSERVED**。這不等於真 host 已重播 recovery；re-observation contract 的正反例證據來自離線測試。依本採用卡封板，這個限制本身不要求第三次 smoke，也不構成 HOLD。

## 已知限制與未驗證項

- 既有 sampling 保證仍是非原子；短命 entry 若在兩次 sampling 之間消失，可能不出現在成功 sample。這是已接受的既有 observation model 邊界。
- 真 host recovery 本輪未自然觸發；不得把 HOST_SMOKE_PASS 寫成 RECOVERY_OBSERVED。
- canonical 目前仍未整合 candidate；因此尚未完成 post-integration scanner identity 與實際 canonical regression。
- Core3 雙 viewport／affected PGQ 尚未執行，產品驗收仍為 `CORE3_ACCEPTANCE_PENDING`。
- 舊 R1 `8e60945` 維持 rejected-for-host 歷史，不因本裁決重開。

## canonical 整合方案

下一個 Mainline integration task 應先保存當下 canonical HEAD 與 `git status --short`，確認 tracked 工作樹仍無新修改並保留上述 untracked dirs。再以既有 Git seam 匯入已驗證的 incremental bundle，取得固定 ref 後只 cherry-pick 單一 candidate commit `4edd0747a25b13920b3ab1ead99895a99dbe8964`。若 base、candidate、三檔 hashes 或工作樹條件任一偏離本 receipt，停止整合並回本裁決重新核對，不自行重做 R2。

整合只允許上述三個 delivery paths；不得順手帶入 candidate worktree 的其他檔案、歷史 raw evidence、產品檔、ZIP、protected assets 或新的 observation runtime。

## 最小 post-integration 驗證

整合完成後至少證明：

1. canonical 實際載入的 `scripts/tmp_artifact_lifecycle.py` SHA256 精確等於 `0e411a0c970ae17f9fac805b5d3010ebc0742a5b6b774eb15b8c06137ffe8edf`；tests/docs 亦精確等於本 receipt 固定 hashes。
2. pre-integration HEAD→integration HEAD 的 delivery diff 只有三個固定 paths。
3. 直接 scanner regression 仍符合 R2 封板：owned browser descendant ENOENT 最多一次 whole-scan retry；deadline／entries／sticky exceeded／identity／cleanup-general／special allowlist 均不漂移。原固定測試 bytes 未變時可沿用既有 suite 身分，不為採用重跑全產品 suite。
4. launcher／policy／host-capacity sensor identity 與 host-smoke frozen evidence 一致。
5. product source、4 protected hashes、ZIP identity 仍與 `host-smoke-r2/mainline-verification.json` 一致且無 drift。
6. 保存 integration commit SHA 與上述 verification receipt，且狀態才可從 `CANONICAL_ADOPTION_PENDING` 轉為 canonical integrated/verified。

## 回退

若 integration commit 已建立但 post-integration verification 失敗，僅回退該 R2 integration commit，優先使用可追溯的 `git revert <integration-commit>`；不得 `reset --hard`、`git clean` 或覆蓋既存 untracked work。回退後重新核對 canonical scanner SHA256 回到 `427162d34af5be6f3269c418f141716130909ce3fea82b5e3b4431732ebfdd6c`，並確認原兩個 untracked dirs 仍存在且未變。

## 回交條件

本 decision card 到此完成。下一 frontier 是已獲授權的 canonical integration；只有 integration 與上述 identity verification 完成後，才解鎖既有 Core3 host-evaluation／產品驗收流程的雙 viewport 與 affected PGQ。

四個狀態保持分離：

- 採用建議：**GO_FOR_CANONICAL_INTEGRATION**
- canonical：**NOT_INTEGRATED**
- host applicability：**PASS / RECOVERY_NOT_OBSERVED**
- Core3 產品驗收：**PENDING**
