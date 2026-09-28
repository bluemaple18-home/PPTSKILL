# Observer R2
目標：依 26576e9 封板契約完成 canonical-base bounded re-observation，Owner 於 2026-09-28 明示「做吧」授權 R2 與契約內單次 host smoke。
範圍：AI Core 隔離 clone /private/tmp/ai-core-observer-r2-20260928，base c23e46555b73a29f16319c657622acb1acc51e7a；僅 scanner seam、直接 tests/docs。Mainline 另準備 PPTSKILL 本輪 evidence controller。
約束：完整契約見 evidence/edx-core-3-undo-redo/observer-r2-preflight-contract-20260928.md；不補 R1、不 merge/push/activation/deploy、不跑 PGQ；單一 writer；host observation 再失敗即停止，不開 R3。
驗收：固定 failure-state matrix、fresh offline tests、獨立 review、原 ceilings 單次 managed host smoke 與 cleanup evidence；來源與 ZIP/protected 不變。
狀態：IMPLEMENTING；原生 clean subagent；工具使用繼承模型，主線不變更使用者模型。候選 clone 隔離 canonical，最終裁決由 Mainline 負責。

## 範圍與前置實測
- 呼叫鏈：sample_resource_budget → scan_resource_artifacts；cleanup/count_artifacts 共用 seam。維持 tuple(bytes,files)、LifecycleError 與 launcher/policy/supervisor 公開介面。
- Host 副作用限原 managed browser 新 root/profile/cache/tmp、PPTSKILL 本輪 evidence、原 repo isolation marker；沿原 finally Browser.close→supervisor wait/terminate→exact-owned cleanup。失敗即保存原始原因及清理狀態，不重試。
- 正式 require_escalated/login=false 唯讀 capacity preflight：CODEX_SANDBOX=null；physical available 65,069,621,248；Foundation admission 79,054,133,559／total 494,384,795,648 bytes；64MiB projected 原 gate 通過。不是 host smoke 已執行。
- 流程偏差：Mainline 在讀取 Rule24 全文前以 git clone --shared 建立上述 tmp 開發 checkout，未經 tmp-session seam；這不是受管 review root，不宣稱已通過其 lifecycle。候選工作保留，完成 writer 後移至 workspace 持久開發目錄，禁止按 managed-root cleanup 刪除或把偏差當 host 授權。

## 凍結 review
- Writer 已停止；候選移至 workspace `.work/ai-core-observer-r2-20260928`，開發 clone 不再留 tmp；來源仍 canonical c23e465，候選 commit 4edd0747。
- Mainline 正式環境 fresh 33/33 scanner 選集通過，socket fixture 未 skip；本輪 host 未啟動。
- Review：兩名 clean native reviewer 各自盲判 scanner 契約及 host activation/teardown failure states；只寫各自 evidence receipt，禁止改 delivery。核心三檔以 commit 凍結；PPTSKILL controller/observer/test 以 review 開始時 SHA 凍結。
- Review 不自動授權新 Repair generation。若有阻塞 finding，先由 Mainline 對照 R2 封板與剩餘額度裁決；不自動 R3。

## 初輪 review 與 bounded harness 修正
- A：scanner CODE GO／host conditional GO；B：scanner CODE GO／host NO-GO，唯一 B-01 為 identity I/O cause 的 errno 未保存在 observer。Mainline 亦以真 sampler seam 獨立重現。
- 本次只修 evidence observer 序列化與直接測試：保存最深 8 層 explicit exception cause（循環截斷明示），外層 exception、counts、scanner/controller 均不改。這是首次本輪 harness 留證補全，不是 scanner R3；不增加 host 次數。
- 新 host offline 14/14 PASS；原 13/13 log、兩名原 verdict、原 probes 全保留。交原兩名 reviewer 僅對此 delta recheck。

## 最終結果
R2 本輪交付完成：候選 4edd0747；33/33 scanner、14/14 host harness、兩名盲 review 與窄複核 GO。唯一一次正式 host smoke PASS（7 runtime scans 完整，未自然觸發 recovery）；Browser.close/supervisor exit0，cleanup/root/marker/PID 核對完成。詳 evidence/edx-core-3-undo-redo/host-smoke-r2/mainline-receipt.md。
狀態：R2_HOST_SMOKE_PASS / RECOVERY_NOT_OBSERVED / CANONICAL_ADOPTION_PENDING。canonical、產品、ZIP、protected 未動。未 merge/push/activation/deploy/PGQ；host 次數已消耗，不追加 retry 或 R3。下一階段先 canonical 採用裁決，再 Core3 正式驗收。
