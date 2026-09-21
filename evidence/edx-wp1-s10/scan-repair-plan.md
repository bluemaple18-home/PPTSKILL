# S10 scan-limit blocker：Owner 指示後的診斷修復

> 本計畫已完成；實測、工具修復／review 與修復後 PGQ 16/16 結果見 `host-final-receipt.md`。下列保留診斷階段原始範圍。

Owner 在收到 `791545d` 的停止 receipt 後明示「我是說你處理這件事」。本輪接手跨 repo 工具診斷，仍不把新卡／profile 視為 blocker 計數重置。

## Scope / contracts

- AI Core base `2d78d8e18d42156f43f12f0ebc6997914ec64328`。
- 已讀既有 bounded-launch diagnostics 與 observer-repair receipts；現有修復未提供 scan deadline/entry-limit 的區別。
- CodeGraph 查詢 `tmp_artifact_lifecycle resource observation scan limit scan_timeout`，確認 `scan_resource_artifacts` → `sample_resource_budget` → `run_child` 是既有單一 seam。
- 第一階段只改 `scripts/tmp_artifact_lifecycle.py` 的 failure diagnostics 與 `tests/test_tmp_artifact_lifecycle.py`；既有 dirty logs、其他 `.work` 不碰。不改 Rule 24、Foundation sensor、policy JSON、100ms/5s deadlines、entry bounds、ownership 或 TERM/KILL cleanup。
- 在 deadline 或 entry-limit 觸发時保存 reasons、elapsed/timeout、entries/limit、bytes/files、phase；不新增 clock read，不追蹤 symlink。未知仍 fail-closed。

## 已驗證

三項 regression RED（原訊息缺三類資料）→ GREEN。完整原 lifecycle/session/routing/recovery suite 加新三項，**109/109 PASS**，未啟 Chrome。證據 `scan-diagnostics-{red,green,regression}.log`。

## 新觀測決策

已通過 diagnostics regression 後，一次正式 host managed sample-approval 重現，目的為辨識實際觸發原因；不是沿用原先「重新啟動直到 PASS」計畫。受管入口與所有限制不變，額外記錄 AI Core scanner SHA。Evidence `scan-diagnostic-observation/`。拿到資料後才決定最小修復，不預先認定 deadline 或提高任意預算。
