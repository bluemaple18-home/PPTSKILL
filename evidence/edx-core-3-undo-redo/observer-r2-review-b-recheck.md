# Reviewer B：B-01 定向重審

日期：2026-09-28。只審 B-01 cause chain 留證修正及直接 instrumentation regression；未重新進行一般 review、未跑 lifecycle suite、未讀 A verdict。

**B-01：CLOSED / VERIFIED FIXED。此定向範圍沒有新的阻塞 finding。** 原 scanner CODE GO 維持。Reviewer B 的 host code readiness 為 **GO**；實際執行仍須 Mainline 完成原狀態更新及 capacity preflight，並非已執行 host 或通過 host acceptance。

## 修正與重現驗證

- `host-smoke-r2-observer.py` 的 exception event 現在保存 explicit `__cause__` 的 type/message/errno；外層 errno 保持原值。最多 8 個 cause、以 object identity 防 cycle，剩餘 cause 用 `causeChainTruncated` 明示。
- 經真正 `sample_resource_budget()` 的 EIO/EACCES/EPERM 字串邊界，journal 與最終 observer record 都保存原始 cause errno；外層結果仍 FAILED、counts=null，沒有偽裝 recovery 或改 scanner exception/result。
- 自製定向反例涵蓋無 cause、恰 8 個、9 個、循環 chain：長度符合上限，只有超長或循環標 truncated；保留外層 exception 同一物件、errno=null、partial `(7,1)`、FAILED 與 tracer 還原。journal event 與 memory event 一致。
- 直接 regression 選集涵蓋一般 return、cleanup/runtime 區分、成功 ENOENT recovery、budget rejection、unknown return、tracer 還原與 journal 寫入故障。均通過，沒有改既有 outcome 判定。

## 本 reviewer fresh 執行

從 PPTSKILL repo root：

```sh
/Users/matt/ai-core/.venv/bin/python -B evidence/edx-core-3-undo-redo/observer-r2-review-b-recheck-probes.py
```

結果：**10/10 通過**，包含 7 個現有 ObserverTests（含新增 sampling cause 測試）與 3 個自製 bounded/cycle methods。不重跑 controller、socket、ps、network 或 host suite；Owner 所述 14/14 非本次 B 重跑數字。

證據：`observer-r2-review-b-recheck-tests.log`、`observer-r2-review-b-recheck-results.json`、`observer-r2-review-b-recheck-probes.py`。

## 凍結與原證據保存

- candidate HEAD 仍為 `4edd0747a25b13920b3ab1ead99895a99dbe8964`。
- 與原 B results 的 SHA256 比對，scanner/tests/docs 三檔、controller、candidate manifest 全部相等。
- 原 B receipt、probes、logs、results 共 7 檔在本次執行前後 SHA256 全相等；未重跑會覆寫原 results 的舊 probes。
- 本次 observer/test 與所有其餘 delivery 檔案在 recheck 前後 SHA256 相等；修正後的精確 hashes 已保存於 recheck results 的 `deliveryBefore` / `deliveryAfter`。
- 只新增 recheck evidence；未修改 delivery、未啟 Chrome、未執行 host/PGQ、未 merge/commit/push。

## Host execution readiness

**原 B-01 留證阻塞已解除，可交 Mainline 進原定單次 host smoke 的執行前流程。** manifest 仍為 `FROZEN_REVIEW_PENDING`，此狀態正常，本 reviewer 不更新。實際 launch 前由 Mainline 更新為 `REVIEWED_FOR_SINGLE_HOST_SMOKE`、確認凍結 hashes、完成既有 capacity gate。

原 receipt 的真實 socket sandbox EPERM 缺口仍保留，交 Mainline 正式環境處理；本次未換 runner 或反覆嘗試。未宣稱 host teardown 已實測、未改封板、未增加 host 次數或擴 R3。
