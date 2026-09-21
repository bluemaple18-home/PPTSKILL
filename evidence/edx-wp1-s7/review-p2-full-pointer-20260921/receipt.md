# S7 P2 — 1600×900 full-pointer 補驗

狀態：PASS。Reviewed product candidate 仍為 `c390d26899f5b3289ad5b46cae562ec54f8accf6`；本輪未修改產品 source、verifier 或 ZIP。

## 執行

使用 candidate 已提交的 `tools/edx-wp1-s4-browser-acceptance.mjs --snap-regression`，透過 AI Core managed Chrome `2d78d8e18d42156f43f12f0ebc6997914ec64328` 執行。正式 harness 本身固定跑 1280×720 與 1600×900；本輪 reviewer 缺口只在1600，1280結果視為重複驗證。

## 結果

- 1280×720：66 checks PASS，targetClosed=true。
- 1600×900：66 checks PASS，targetClosed=true。
- 1600明確包含 snap off/on 的 drag＋resize positive/negative/multi/zero/return、Escape cancel、pointercancel、toggle/blur/resize/scroll/text/selection/stale cancel、bounds/minimum原子拒絕、keyboard guard、preview export/offline reopen、三組motion treatment的normal/reduced/static，以及重複destroy cleanup。
- 1600 console/pageErrors/networkFailures/httpErrors/remoteRequests 全0。
- Browser harness exit0；readiness exit0；Browser.close exit0；managed lifecycle exit0；launcher stderr空。
- 執行前後14/14 source與4/4 protected hashes MATCH。
- ZIP未重建；實檔SHA-256仍為 `f94e99eeac7627f5c8ef022ec6d600f7922cce87f0271a67beb5740c10adf5ae`。

`pointercancel` 在既有S7 harness中由browser內 `PointerEvent("pointercancel")` 事件路徑觸發，receipt標記 `synthetic:true`；Escape與主要drag/resize gesture仍使用CDP真pointer／key input。此方法與原1280 accepted harness一致，本輪未改測試語意。

原始結果：`browser/acceptance.json`。本輪不宣稱Independent Review GO；僅補 reviewer 指出的P2 evidence gap。
