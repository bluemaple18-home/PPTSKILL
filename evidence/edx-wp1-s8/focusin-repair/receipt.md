# S8 focusin wrong-slide mutation：P1 bounded repair

狀態：**REPAIR_COMPLETE / TARGETED_INDEPENDENT_REVIEW_PENDING**。Reviewer 對 `fd7fc9ae2c94d393d570550bf4292972910d3160` 的 NO-GO 保留，Mainline 不自行關閉 P1。工作基點為 handoff docs commit `f541281`。

## 契約、原因與最小修復

唯一 scope 是真正 slide identity change 必須清 selection／interaction target。CodeGraph 語意 query 未定位 generated editor closure，因此 bounded rg 核對 `select(id)`、focusin 與 `clearSelection()`。既有 click/move/remove 路徑局部清理，focusin 直接呼叫 select，只更新 currentId／slide marker，留下上一頁 target。若在共用 select 變更 currentId 前清理，該錯寫應消失；若同頁也清，則破壞既有 focus/selection continuity。

產品僅一行變更：`if(currentId!==id)layout?.clearSelection();`，沿既有 cleanup authority 銷毀 Moveable、清 editor-local selection 與 interaction target，不新增 state／writer／keydown 特例。初始化 layout=null 仍安全；同頁 select 不清。回退可反向套用本候選的產品與 regression diff，不操作其他工作。

## Fresh evidence

- `red.log`：修復前跑 `node --test --test-name-pattern='S8 focusin' tests/edx-wp1-s8-mounted-selection.test.mjs`，**1 named FAIL**，命中 focusin 換頁後 ArrowRight 改變舊頁 canonical 的 assertion。僅清行尾空白，未改錯誤內容。
- `targeted.log`：`node --test tests/edx-wp1-s8-*.test.mjs`，**10/10 PASS**。新增兩個 regression：focusin 換頁→方向鍵不改舊頁、selection empty／target null／Moveable destroyed；同頁 focus 保留 selection/Moveable，跨頁多選清空。citation anchor 僅 synthetic mounted event target，沒有聲稱真 browser focus navigation。
- `focused.log`：S3/S4/S5/S7/S8 + S1 export cleanup，**174/174 PASS**。
- `nonbrowser.log`：`tests/*.test.mjs` 排除四支 browser-backed affected PGQ，**379/379 PASS**。
- `distribution-lifecycle.json`：fresh install/smoke/uninstall、single shared core、profile preserve PASS；Gemini CLI missing 仍僅 host capability partial。
- ZIP：**2,280,195 bytes**；SHA-256 **`ab59115c7f5c52d258af22021c8b57e8334fba0f5ac7ecee93622fbeb158061f`**。
- `source-hashes.json`：20 sources final freeze、四個 protected untracked **4/4 MATCH**。相對前 candidate，source hash 只變 `runtime/deck-editor.js`、`tests/edx-wp1-s8-mounted-selection.test.mjs`；ZIP 隨產品重建。

本輪未啟 browser、未重跑 PGQ。前候選雙 viewport 各 15 checks、affected PGQ 16/16 僅繼承 evidence，不宣稱覆蓋本次 focusin regression 的 fresh browser execution。修復沒有改 export cleanup／PGQ seam；mounted public runtime 提供此次 bounded finding 的直接 RED→GREEN。

## 下一步

只做 targeted independent re-review，確認此 P1 與同頁 focus 保留契約，回 GO／NO-GO。既有 S8 範圍不擴張；未 merge／push／deploy，未開 S9。
