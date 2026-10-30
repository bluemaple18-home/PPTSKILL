# PGQ-WP2 Slice 3 — Golden Reference Routing Receipt

**Date:** 2026-09-15

**Status:** COMPLETE / READY FOR INDEPENDENT REVIEW

**Base:** `b7a832e0cd1065fd193a3840e4587acdd8a38d90`

## Delivered contract

- `plan-new` 可接收 selected `styleSpec`；StyleSpec ID 必須與既有 `styleSpecId` 一致。
- Slice 2 每個 ranked `available` candidate 保持原 rank／primitive，另取得零至兩筆 Golden design logic refs。
- 同一 `split-proof` 在 Editorial Style 路由到 `typography-hero`，在 Technical Style 路由到 `information-led-cover`；Golden 不重新定義語意。
- 每筆 reference 提供 `semanticMatch`、`densityMatch`、`anchorMatch`、`styleMatch`、`antiPatternConflict`、reason codes、少量 accepted evidence keys 與 allowlisted design tokens。
- 只有同時通過 semantic、anchor、Style 與 anti-pattern gate 的 logic 才是 credible；沒有可信 match 時明示 `none`。
- Packaged Golden grammar 的七項 `globalAntiPatterns` 與固定 guard codes 一對一驗證；需要不存在 semantic image 的路由會被排除。
- Repo acceptance 以 Golden reference manifest 驗證所有 emitted evidence keys 均為 Owner accepted；installed runtime 不攜帶或讀取 reference 圖片。
- 輸出不含 artifact path、filename、HTML、DOM、CSS、URL、data URI 或第三方 asset。
- 未帶 StyleSpec 的舊 `plan-new` request 保持相容，回傳空 `goldenRouting`。

## Evidence

- RED：首個 public-interface test `0/1 PASS`，既有 plan 沒有 `goldenRouting`。
- Slice 3 public tests：`7/7 PASS`。
- Targeted（Slice 3 + Slice 2 + Slice 1 + Golden grammar + R4 generation + R5 renderer + R8 distribution + R11 entry）：`56/56 PASS`。
- Full regression：`158/158 PASS`。
- Browser acceptance：本 slice 未修改 browser、editor 或 renderer runtime，因此不新增 browser rerun；既有 renderer regression 已包含在 targeted 與 full suite。

## Explicit deferrals

- Slice 4：deck-level rhythm planning；本 slice 不判斷跨頁密度、anchor 重複、高潮位置或整份節奏。
- 不新增 composition primitive、variant、renderer、schema、workflow engine、Evidence DB 或 Agent。
- 不讀、複製、搜尋或包裝 Golden 圖片、模板、DOM、CSS 與第三方素材。

## Repair 1 — image-treatment dependency guard

- Review finding：缺 semantic image 時，`cropped-type-image` 的 `display-type` anchor 會避開 image-anchor guard，但 route 仍要求 `deliberate-offstage-crop`／`photo-field`。
- RED：最小 direct planner reproduction `0/1 PASS`；`cropped-type-image` 實際出現在 matched references。
- Root cause：image dependency 只檢查 `visualAnchor`，沒有納入 canonical `imageTreatment` token。
- Fix：route 的 visual anchor 屬 image anchor，或 `imageTreatment !== none`，任一成立都要求 semantic image；否則加入既有 `anti_pattern_conflict_missing_semantic_image` exclusion。規則依 grammar token，不 hardcode archetype。
- Regression：direct 與 installed `plan-new` 均驗證 `cropped-type-image` 被排除，剩餘 matched references 的 `imageTreatment` 皆為 `none`。
