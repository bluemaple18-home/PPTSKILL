# Core5 portable renderer feasibility

Status: BOUNDED_RECOMPOSE_FEASIBLE / RESET_HISTORY_GAP / NO_PRODUCT_CHANGE
Base: `098177ac395d1dcf0d02f30c102ceb8c0f11abe5`

Clean Worker 唯讀 source decision：`runtime/full-deck-renderer.js` 的同 primitive variant 已由 CSS class 表達；`runtime/deck-editor.js` 有既有 operation 與 canonical／DOM 投影 seam。可接受的最小 `recompose-slide` 是保持 primitive、slots、content 和 stable IDs，明示切換現有 CSS variant，並只清除／取代 payload 點名的 geometry／typography overrides。跨 primitive／slots 必須拒絕，不能只改 JSON。

Worker 同時指出既有 history DOM 投影只涵蓋文字與部分 geometry；若 `reset-slide` 恢復 edit-start slide 涉及元件增刪，Undo／Redo 不能先宣稱通過。此缺口留同一張 Core5，須補完整交易／回退驗證後才可驗收。

此輪 Worker 沒有保留 runtime／tests 變更；相鄰 Core3/Core4 51/51、`git diff --check` 通過。Mainline 決定按上述 bounded Recompose 子集進實作，但 Core5 仍為 4/6，不另開新主卡。
