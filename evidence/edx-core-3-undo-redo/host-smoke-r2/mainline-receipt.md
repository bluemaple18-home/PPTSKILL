# Observer R2：實作與單次 host smoke 完成

Status：**CODE_GO / HOST_SMOKE_PASS / RECOVERY_NOT_OBSERVED / CANONICAL_ADOPTION_PENDING**。Core3 尚未整卡 closure，未執行產品 browser／PGQ。

## 固定候選與核准

Owner 於 2026-09-28 明示「做吧」，按 `26576e9` 封板實作一次 R2 並執行唯一一次 managed host smoke。AI Core 候選 `4edd0747a25b13920b3ab1ead99895a99dbe8964`，base `c23e46555b73a29f16319c657622acb1acc51e7a`；scanner SHA256 `0e411a0c970ae17f9fac805b5d3010ebc0742a5b6b774eb15b8c06137ffe8edf`。候選位於 workspace `.work/ai-core-observer-r2-20260928`，亦保存 `../observer-r2-candidate.bundle` 與 gzip patch；bundle 只含相對 canonical base 的候選提交，已 git bundle verify。

Scanner 只對 owned browser runtime 的 descendant ENOENT 做一次 whole-scan re-observation，固定 root identity、共用 deadline／entries、超額立即停損；cleanup/general 不放寬。未疊加或修改 R1。

## 離線驗證與 review

- Mainline 正式允許環境 fresh scanner 選集 **33/33 PASS**，含真實 Unix socket fixture；保留 Worker／Reviewer sandbox EPERM 歷史，不把環境阻擋冒充通過。log：`../observer-r2-mainline-tests.log`。
- 同一組正向 re-observation 測試套 canonical，2 個 methods／5 個 subcases 如預期回 I/O failure；原始 RED 保存於 `../observer-r2-canonical-red.log.gz`。
- 兩名 clean native reviewer 都給 scanner CODE GO，且各自沿 launch/handler/finally 列副作用 failure states。B-01 指出 observer 漏記 identity guard cause errno，Mainline 在同輪 evidence harness 補有界 explicit cause chain；scanner commit 不變。原 verdict/probes 不覆寫。
- 最終 host 離線 **14/14 PASS**；A 定向複核 **9/9 PASS**、B **10/10 PASS**，B-01 CLOSED。精確範圍與 hashes 見兩份 `observer-r2-review-*-recheck.md`，不把重複測項相加。

## 單次正式 host 結果

執行入口為原 `exec_command(require_escalated, login=false)`；原生 CODEX_SANDBOX 為 null，未刪改標記。controller → 本候選原 `tmp_session.py browser` → 原 lifecycle/policy/supervisor；未建立新 launcher。正式命令及完整 identity 在 controller-receipt.json。

- 原 Foundation capacity gate 通過；64 MiB／10000 files／TTL120 秒／readiness25 秒與原 scan ceiling 不變。
- readiness **6.151 秒**；新 owned target 的 data HTML DOM、target close PASS，page error 陣列空。
- **7 次 runtime scans 全部 COMPLETE**，都只有 attempt 1，耗時 0.220～7.561 ms；Default 有 **23 個子目錄**。這是帶 instrumentation 的小 profile 數據，沒有 baseline benchmark。
- **0 次自然 recovery**：只能稱 HOST_SMOKE_PASS／RECOVERY_NOT_OBSERVED，不能宣稱真 host 已重播並修復 ENOENT，也不反推 Host04 根因。重掃契約目前由離線反例驗證，本輪不因未遇 race 而重試。
- Browser.close exit **0**，supervisor exit **0**，cleanup scan COMPLETE。Mainline 獨立 ps 確認本輪 supervisor/browser PID 均不存在，owned root／marker 均不存在；見 mainline-process-check.json。
- controller errors=[]，diagnosticErrors=[]，unfinishedScans=[]；journal 與 final report 逐筆吻合。Chrome 自身 stderr 原文保留，不宣稱全 browser 零 stderr。

## 身分、限制與下一步

75/75 source、4/4 protected、ZIP 2,329,758 bytes／SHA256 `862bb19f82b10fab9a244a1c334fed1f39b6edc1ad5c5ff95aebe3cc04daf290` 全吻合；harness 前後 hashes 未變。canonical 仍 c23e465，scanner SHA 仍 427162d34af5be6f3269c418f141716130909ce3fea82b5e3b4431732ebfdd6c。未 merge/push/activation/deploy、未開 Core4。

**本輪 R2 交付到此完成。** 下一階段為 AI Core canonical 採用裁決，之後才能安排 Core3 固定產品雙 viewport／affected PGQ；不把 smoke 當產品驗收。host 次數已用完，不再追加試跑；若後續重新出現觀測契約失敗，沿封板回 observation primitive／runtime resource-control 層裁決，不自動開 R3。

流程偏差亦保留：初始開發 clone 在載入 Rule24 全文前由 raw git clone 建於 tmp，未經 tmp-session lifecycle；它從未作 managed root 或用於 browser profile。Writer 停止後已移到 workspace 持久開發目錄，未刪 unique work；不宣稱該 checkout 有 managed cleanup 證明。正式 browser 本身全程沿既有受管入口，兩者不混淆。
