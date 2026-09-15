# PGQ-WP2 Slice 1 — Truthful Generation Capability / Chart Semantics Receipt

**日期：** 2026-09-15
**狀態：** COMPLETE / READY FOR INDEPENDENT REVIEW
**基線：** `b5d57570b7d27ded46d1c1138052abc4473c6d8a`

## 交付

- 新增一份共用 deterministic generation capability contract；composition primitive IDs 直接取自既有 registry，不維護第二份名單。
- `createGenerationPlan()` 的真實 output 包含 capability view 與 bounded candidate verdict。
- Planner 直接承接 WP1 preflight 的 `generationPermissions`；未明確授權 chart generation 時，即使 chart type 本身可支援也標為 unavailable。
- packaged Skill 與三個 adapter 在人工 outline／Style gate 後呼叫 installed `workflow-cli.mjs plan-new`，只允許使用 `available` candidate。
- renderer、Node editor 與內嵌 browser editor 共用同一 chart capability：目前只支援非負值 `bar`。
- line／area／pie／donut 與負值 bar 明示 unavailable；renderer 不再用絕對值把負值扭成正值 bar-row。
- Browser editor 拒絕 unsupported chart patch 時會 rollback state，原本合法 chart 可繼續另存與重開。
- 舊 DeckSpec 仍可 sanitize／讀取；尚未支援的 chart 在 render 時 fail loud，不靜默改變圖意。

## 驗證

- WP2-S1 + R1/R4/R5/R8/R11 targeted：41/41 PASS。
- Full `pnpm test`：144/144 PASS。
- Installed ZIP：`plan-new` capability output 與 unavailable candidate gate PASS。
- Browser editor acceptance：PASS；line chart rejection、state rollback、save/reopen、claim/source privacy 與 image replacement 均 PASS。
- Browser diagnostics：console 0、page errors 0、network failures 0、HTTP errors 0。
- Syntax checks：PASS。
- `git diff --check`：PASS。

Machine-readable browser evidence：`evidence/pgq-wp2-s1/browser-editor-regression.json`。

## Review repair

獨立 review 發現 planner 原先只執行 chart permission，image candidate 可在 `generationPermissions.image === false` 時誤標 available。修補後 image／chart 都使用同一個 `generation_permission_required` gate；direct planner 與 installed `plan-new` regression 會重播 image opt-in 關閉情境。既有 user-provided image 的 renderer／editor 路徑不受此 generation permission 影響。

## 邊界

本 slice 只關閉 truthful capability 與已知 chart correctness gap。PGQ-D02 的語意到構圖選擇、PGQ-D03 Golden reference routing、PGQ-D08 跨頁節奏，以及需要新 executable renderer 的 chart 類型仍未實作；不得由本收據推論已完成。
