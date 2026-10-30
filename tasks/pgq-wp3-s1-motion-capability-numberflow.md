# PGQ-WP3-S1 — Motion Runtime Capability + NumberFlow Odometer

**Status:** COMPLETE
**traces_to:** `PGQ-D04`, `PGQ-D06`

## Objective

把 WP2 planning chain 接到第一個真實、可攜的 role-aware motion runtime：motion capability truth + B odometer。NumberFlow 必須由 pinned upstream bundle 實際驅動；靜態、reduced-motion、unsupported browser 都直接顯示完整 final value。

## Prior-art decision

- `number-flow@0.6.2`：`ADOPT`，MIT，vanilla custom element；只吸收官方 runtime，不複製 demo／framework wrappers。
- `esbuild@0.28.2`：`ADOPT_BUILD_ONLY`，僅用於 deterministic offline IIFE；不進最終 HTML runtime。
- Package lifecycle：只允許 esbuild 自身本機 binary install；不執行 NumberFlow installer、hook、MCP、外部服務或 CDN。
- Intake evidence：`evidence/pgq-wp3-s1/prior-art-intake.md`。

## Input / output contract

- `plan-new` optional `motionSignals`：每筆只含 `slideId`、`effect=number-flow-odometer`、`role=metric`、1～5 個 `{ ref, from }` targets、`replay=slide-visible`、bounded `staggerMs`。
- Target ref 只允許 `content.keyPoints.0..4`，且該 value token 必須是 bounded ASCII decimal／grouped decimal，optional `$ € £ ¥` prefix 或 `%` suffix；scientific／engineering、非 Latin digits、RTL／任意格式 fail truthful unavailable。
- Planner 只接受 WP2 selected `metric-grid` 且 `motionIntensity != none`；不得由 motion 改 primitive、Golden logic、content 或 content hash。
- Output `motionPlan`：capability snapshot、available／unavailable verdict、structured reason codes、resolved final values，以及可直接寫入 CompositionSpec 的 allowlisted `compositionMotion`。
- Portable CompositionSpec optional `motion` 不保存 duplicated final value；renderer 每次由 target content 重算 final value，避免 metadata 漂移。
- Runtime：NumberFlow exact bundle inline；role-aware stagger、explicit replay API、system reduced-motion 與 unsupported-browser static fallback。

## Acceptance

1. `plan-new` 與 installed `plan-new` 都輸出同一 motion capability truth；未帶 `motionSignals` 的 legacy request 回 `motionPlan: null`。
2. Available B odometer 只來自 WP2 selected `metric-grid`、non-none motion intensity、合法 targets 與不同的 finite `from`；所有 failure 有 structured reason codes。
3. Planner 不修改 deck rhythm selection、approved content 或 content hash；`compositionMotion` 不重複保存 final value。
4. DeckSpec Node sanitizer、browser editor clean/save/export、recipient reparse 保留同一 allowlisted motion contract並移除未知欄位。
5. Renderer 只對核准 targets 產生 `<number-flow>`；其他 metric 保持靜態文字。Style accent／display typography 映射到 odometer。
6. Final HTML 內嵌 pinned NumberFlow bundle，不含 script src、CDN 或 runtime network；bundle identity、license、version、hash 可重現。
7. Browser normal motion 觸發真 `animationsstart/finish`、依序更新並可 replay；reduced-motion 與 forced-static 直接顯示 final value、無 animation，resting geometry/content 完整。
8. Installed ZIP 可從 `plan-new` 到 `render-new` 走真實 runtime；ZIP 與代表 HTML 均低於 20 MiB hard gate。
9. Slice 1 targeted、WP1/WP2、R4/R5/R8/R10/R11 regression、full `pnpm test`、syntax、debug scan、browser acceptance、`git diff --check` PASS。

## Blocking edges

- 已滿足：MVP CLOSED；PGQ-WP1 COMPLETE；PGQ-WP2 COMPLETE。
- 本卡完成前不開始 E Sweep、background effects、WP4 或 EDX formal integration。

## Non-goals

- 不做 E underline sweep。
- 不導入 Motion／Anime.js、Vanta／Three.js、p5.js。
- 不做 14 種背景 vocabulary、WP4 Typical／Stress 或 EDX。
- 不新增 renderer primitive、第二套 motion workflow、CDN 或外部 runtime。

## Verification

- RED → GREEN public-interface tests：capability、planner gate、portable round-trip、renderer/vendor、installed runtime、legacy。
- Browser evidence：normal／reduce／forced-static，listeners 必須在 navigation 前註冊。
- Targeted + full regression + syntax + debug scan + `git diff --check`。
