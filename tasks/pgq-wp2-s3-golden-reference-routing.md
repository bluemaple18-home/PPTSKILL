# PGQ-WP2-S3 — Golden Reference Routing

**Status:** COMPLETE
**traces_to:** `PGQ-D03`, `PGQ-D06`

## Objective

把 Slice 2 已通過 truthful capability gate 的 semantic／composition candidates，依 selected StyleSpec 路由到零至兩筆 Owner-accepted Golden design logic refs；Golden 只回答「這個合法構圖如何表達」，不得改變投影片語意、primitive 或內容。

## Input / output contract

- Input：Slice 2 `compositionProposals`、selected `styleSpecId` 與同 ID 的 StyleSpec。
- Canonical evidence：只讀 packaged `golden-design-grammar.v1.json` 的 bounded tokens、accepted `evidenceRefs` 與已歸納 `globalAntiPatterns`；不讀圖片。
- Deterministic boundary：semantic、density、anchor、style match 與 anti-pattern exclusion 均由 code 計分與過濾；LLM 不自由搜尋或選模板。
- Output：每個 available candidate 保持原 rank／primitive，附 `0..2` 個 design-logic refs、structured routing dimensions、reason codes、少量 accepted evidence keys 與 allowlisted design tokens。
- Gate：`trace_gate` + Slice 2 available-candidate boundary；沒有可信 match 時回 `none`，不得硬配。

## Acceptance

1. 同一 `split-proof` candidate 在 Typography Hero 與 Information Led StyleSpec 下分別路由到不同 Golden logic，primitive 與 Slice 2 rank 不變。
2. Routing reason 至少含 `semanticMatch`、`densityMatch`、`anchorMatch`、`styleMatch`、`antiPatternConflict`，並有 machine-checkable reason codes。
3. 每 candidate 最多兩筆 reference；沒有同時通過 semantic、anchor 與 style 的可信 logic 時允許 `none`。
4. `globalAntiPatterns` 參與 deterministic exclusion／guard；不選 rejected reference，不以 generic cards、mechanical 50/50 或裝飾圖片取代語意。
5. 輸出只含 design logic tokens 與 evidence keys，不含圖片、檔名、artifact path、HTML、DOM、CSS、URL 或第三方 asset。
6. Golden routing 不修改 `compositionProposals`、primitive、approved title/subtitle/keyPoints 或 content hash。
7. 只路由 Slice 2 `available` candidates；unavailable verdict 不得重新變成可用。
8. Installed `workflow-cli.mjs plan-new` 輸出相同 routing；未帶 StyleSpec 的舊 request backward-compatible。
9. Slice 3、Slice 2、Slice 1、Golden grammar、distribution、R4/R5/R11 targeted，full regression、syntax 與完整 branch-range `git diff --check` PASS。

## Blocking edges

- 已滿足：PGQ-WP1 COMPLETE；PGQ-WP2 Slice 1 + Slice 2 COMPLETE / GO / integrated。
- 本卡完成前不開始 Slice 4 deck-level rhythm。
- PGQ-WP3 與 EDX formal integration 仍不在本卡。

## Non-goals

- 不新增或修改 Golden 圖片／reference asset。
- 不新增 composition primitive、renderer、variant 或 schema。
- 不複製 Golden DOM、CSS、版型或第三方素材。
- 不做跨頁密度、anchor 重複、高潮或節奏規劃。
- 不改寫、縮短、排序或 mutation approved content。

## Likely files

- `runtime/golden-reference-router.js`
- `runtime/generation-plan.js`
- `distribution/skill/pptskill/SKILL.md`
- `distribution/adapters/*/entry.md`
- `tests/pgq-wp2-s3-golden-routing.test.mjs`
- `BACKLOG.md`
- `evidence/pgq-wp2-s3/slice-3-receipt.md`

## Verification

- RED → GREEN public-interface tests：style-dependent routing、structured reasons、none path、anti-pattern guard、primitive/hash invariance、installed runtime。
- Targeted regression：Slice 1/2、Golden grammar、generation plan、renderer、distribution、entry enforcement。
- Full `pnpm test`、syntax、debug scan、完整 branch-range `git diff --check`。
