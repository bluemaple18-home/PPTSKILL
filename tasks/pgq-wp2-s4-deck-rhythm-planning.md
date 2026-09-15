# PGQ-WP2-S4 — Deck-level Rhythm Planning

**Status:** COMPLETE
**traces_to:** `PGQ-D06`, `PGQ-D08`

## Objective

把 Slice 2／3 已核准的 per-slide composition candidates 與 Golden design logic，協調成 deterministic、bounded 的 Deck Rhythm Plan；兼顧 coherence、contrast、pacing 與 intentional repetition，但不得把 diversity 當目標或犧牲語意較強的構圖。

## Input / output contract

- Input：approved outline、Slice 2 `compositionProposals`、Slice 3 `goldenRouting`，以及每頁一筆 allowlisted `rhythmSignals`。
- Signals：`density`、`emphasis`、`evidenceWeight`、`motionIntensity`、`sectionRole`、optional `continuityGroup`；visual anchor、composition family 與 Golden logic 必須從既有 candidate／routing 推導，不信任 caller 自報。
- Selection：只可選 `available` ranked candidates；alternate 的 semantic score 與 top candidate 差距不得超過 10，且只為明確跨頁衝突重新排序。
- Output：plan-only `deckRhythmPlan`，含每頁 selected candidate／Golden logic、structured signals、continuity、deck reason codes、discarded alternates、warnings 與 content integrity；不直接改 DeckSpec／CompositionSpec。
- Backward compatibility：沒有 `rhythmSignals` 時回 `deckRhythmPlan: null`；若要求 rhythm 卻缺 Slice 2／3 完整資料則 fail loud。

## Acceptance

1. 連續四頁同 composition family、且沒有 continuity group 時，只能在 semantic score 差距 ≤10 的既有候選中選 alternate；不得產生新 primitive。
2. 相同非空 `continuityGroup` 的連續頁保留 top candidate，標示 intentional repetition，不因 diversity 強制換版。
3. 若 alternate 與 top semantic score 差距 >10，保留 top candidate並輸出 unresolved repetition warning。
4. 每頁輸出 selected CompositionSpec proposal、`density`、`emphasis`、`evidenceWeight`、`visualAnchorFamily`、`compositionFamily`、`goldenLogicRef`、`motionIntensity`、`sectionRole`、`continuityGroup` 與 machine-checkable reason codes；rhythm density 必須等於 Slice 2 semantic density。
5. 連續四頁 `high density + highlight`、high evidence、high motion、全 deck 無 quiet emphasis、相鄰 transition、敘事角色倒退、開場／收尾角色不完整與未解重複均產生 bounded structured warnings；不新增 motion runtime。
6. Deck Rhythm Plan 不修改 outline content、Slice 2 proposals、Slice 3 routing 或任何 content hash；全 deck `contentIntegrity.unchanged=true`。
7. Unknown／duplicate／incomplete rhythm signals、非法 enum 與未知 slide fail loud；caller 不可自報 anchor／composition／Golden identity。
8. Installed `workflow-cli.mjs plan-new` 輸出相同 Deck Rhythm Plan；舊 request 未帶 rhythm signals 仍可用。
9. Slice 4、Slice 3、Slice 2、Slice 1、distribution、R4/R5/R11 targeted，full regression、syntax 與完整 branch-range `git diff --check` PASS。

## Non-goals

- 不修改 renderer、browser editor、DeckSpec schema或 composition primitive。
- 不做動畫 runtime、B odometer、E Sweep、Vanta 或背景效果。
- 不做 Typical／Stress sample、readability repair loop 或 Golden Visual Regression。
- 不開 EDX、WP3 或 WP4 正式實作。
- 不為「每頁不同」任意換掉語意上更好的候選。

## Likely files

- `runtime/deck-rhythm-planner.js`
- `runtime/generation-plan.js`
- `distribution/skill/pptskill/SKILL.md`
- `distribution/adapters/*/entry.md`
- `tests/pgq-wp2-s4-deck-rhythm.test.mjs`
- `BACKLOG.md`
- `evidence/pgq-wp2-s4/slice-4-receipt.md`

## Verification

- RED → GREEN public-interface tests：bounded alternate、intentional repetition、semantic protection、structured warnings／integrity、invalid input、installed runtime／legacy。
- Targeted regression：WP2 Slice 1～3、Golden grammar、generation plan、renderer、distribution、entry enforcement、R4/R5/R11。
- Full `pnpm test`、syntax、debug scan、完整 branch-range `git diff --check`。
