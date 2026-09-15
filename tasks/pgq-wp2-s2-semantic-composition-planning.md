# PGQ-WP2-S2 — Semantic-to-Composition Planning

**Status:** COMPLETE
**traces_to:** `PGQ-D02`, `PGQ-D06`

## Objective

把已核准 slide content 與 bounded semantic signals 轉成多個排序後的既有 CompositionSpec candidates，最後通過 WP2-S1 truthful capability hard filter，產生可核查 proposal，且不改任何 content。

## Input / output contract

- Input：既有 approved outline slides，加上每頁 `slideRole`、`relationship`、`evidence`、`density` 與 optional existing component。
- Advisory boundary：同一 AI 可判斷 semantic signals；runtime 不從任意文案猜語意。
- Deterministic boundary：候選排序、reason codes、capability filtering、content hash 與 CompositionSpec proposal 由 code 決定。
- Output：每頁最多 3 個 available ranked candidates、所有 considered unavailable verdict、structured reason codes、human-readable reason、content hash 與 top CompositionSpec proposal；無可用候選時 blocked。
- Gate：`schema_gate` + WP2-S1 capability gate；plan-only，不直接 mutation DeckSpec。

## Acceptance

1. Semantic relationship classes 至少涵蓋 comparison、sequence、evidence、explanation、asset-led；不是一對一固定 primitive mapping。
2. Numeric comparison 可排序 `metric-grid` 與其他合法候選；textual comparison 不被固定成 metric-grid。
3. 有重要 existing component 時可提出 `component-focus`；cover／section-break 只由 slide role 決定。
4. 每個候選含 machine-checkable reason codes；reason prose 只為人讀，不是 gate。
5. WP2-S1 capability verdict 是最後硬 filter；unavailable candidate 保留原 verdict，不偷換成別的 primitive。
6. 每頁 available candidates 最多 3 個；top candidate 產生既有 CompositionSpec proposal。
7. Approved title/subtitle/keyPoints before/after deterministic content hash 完全一致。
8. Installed `workflow-cli.mjs plan-new` 真實路徑輸出相同 proposal；既有無 semantic signals 的 plan request backward-compatible。
9. Targeted、distribution、full regression、syntax 與完整 branch-range `git diff --check` PASS。

## Blocking edges

- 已滿足：PGQ-WP1 COMPLETE；PGQ-WP2-S1 COMPLETE / GO / integrated。
- 本卡完成前不開始 Golden reference routing 或 deck-level rhythm planning。
- PGQ-WP3 仍受 WP2 完整 capability／planning contract 阻擋；EDX 正式 integration 不在本卡。

## Non-goals

- 不讀 Golden 圖片或 reference asset。
- 不規劃跨頁 rhythm。
- 不新增 primitive、renderer、schema 版本、workflow、DB 或 Agent。
- 不改寫／壓縮 approved content。

## Likely files

- `runtime/semantic-composition-planner.js`
- `runtime/generation-capabilities.js`
- `runtime/generation-plan.js`
- `runtime/workflow-cli.mjs`
- `distribution/skill/pptskill/SKILL.md`
- `distribution/adapters/*/entry.md`
- `tests/pgq-wp2-s2-semantic-composition.test.mjs`
- `BACKLOG.md`
- `evidence/pgq-wp2-s2/slice-2-receipt.md`

## Verification

- RED → GREEN public-interface tests covering ranked ambiguity, asset-led, role routing, unavailable preservation, hash invariance and installed runtime。
- Existing WP2-S1、R4 generation plan、R5 renderer、R8 distribution 與 R11 entry regression。
- Full `pnpm test`、syntax checks、JSON parse、complete branch-range `git diff --check`。
