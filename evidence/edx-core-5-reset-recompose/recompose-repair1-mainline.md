# Core5 Recompose Repair1 主線複核

狀態：CODE NO-GO；Core5 仍 4/6；未進行 Reset、browser、PGQ、ZIP 或 commit／push。

- 候選只改 `runtime/deck-editor.js` 與 `tests/edx-core-5-reset-recompose.test.mjs`。Worker RED 7/8、GREEN 9/9、相鄰 73/73；主線 fresh focused 9/9、`git diff --check` PASS。
- Repair1 已於 `planRecomposeSlide` 擋住清除非 slot 的 geometry-only component，防止 renderer 應省略而 live DOM 留下殘影。Node 和 portable 反例均已測。
- 尚存可重現的不一致：`full-deck-renderer.js` 的 `renderWorldChrome()` 會按 variant 產生 `data-type-visual`；目前 `projectSlideVariant()` 只改 class。`component-focus: quote-monument → evidence-axis` 的即時畫面缺節點，重新匯出／開啟則有節點；`title-points: editorial-index → dense-ledger` 的節點 token/class 亦需跟隨 variant。Worker 重現前者 live=false、fresh=true。
- Repair2 有界方案：先加 RED DOM 對 fresh renderer 比對，再在現有投影 seam 精確同步視覺節點及撤銷／重做／草稿恢復；若某 variant 無法精確投影，驗證前 fail closed。注入投影失敗時 canonical、DOM、history、revision 必須回退。不得擴成通用 renderer。
- Reset 獨立缺口：history 僅保存 canonical spec；現有 `projectHistoryState()` 不能投影元件增刪。`restoreDraft()` 有基準 DOM clone 路徑但清 history，不能直接作可撤銷 Reset。需另做有界交易與 UI 影響範圍確認，並跑真 browser／雙 viewport／PGQ 才能結案。

此處是 Repair1 後發現的第二個 Recompose patch 需求；依 Owner 提供之 AGENTS.md，Repair2 需 Owner 成本核准。授權範圍建議只含本地 runtime／focused tests 之 Repair2，不含 push、deploy 或 Core5 GO 宣告。
