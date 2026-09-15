# PGQ-WP3 Slice 1 Receipt — Motion Capability + NumberFlow Odometer

**Verdict:** PASS  
**Branch:** `codex/pgq-wp3-s1`  
**Base:** `main@cff5d4c65db85e15149a98536642dee60ac0f375`

## Delivered

- `plan-new` 新增 optional、allowlisted `motionSignals` 與 truthful `motionPlan`；只允許 WP2 selected `metric-grid`、non-none motion intensity、bounded metric target。
- CompositionSpec optional `motion` 已穿透 Node sanitizer、Node/browser editor save/export、renderer embed 與 recipient reparse；未知欄位剝除，unsupported semantic contract fail loud。
- `number-flow@0.6.2`（MIT）以 pinned `esbuild@0.28.2` 產生 deterministic ES2022 IIFE，條件式 inline 一次；無 CDN、script src 或 runtime network。
- Renderer 只動畫核准 target；其他 metric 維持靜態。Accent 與 display typography 取自 StyleSpec；portable runtime 提供 slide-visible replay、reduced-motion 與 forced-static final state。
- Installed ZIP 的 `workflow-cli.mjs plan-new` → `render-new` 真實路徑完成；legacy request 未帶 motion signals 時保持 `motionPlan: null`。

## Prior-art / bundle evidence

- Source module SHA-256：`df08f25a6a37f0d30ba045caaab66c87ba95172df2ed5e9261e2b090aa8a9b8d`
- License SHA-256：`f8a3eac9fd2ae94f18a2bf0459e57d90da539f015a7ec4ad6186a5ca33a6aa9a`
- Inline bundle：17,146 bytes；SHA-256 `ea78e2aa83778c4642a3b12bb8f1e427db1528f8092bad98ac55837acf3ac73a`
- Intake 與不吸收邊界：`prior-art-intake.md`

## Browser evidence

- Normal：`browser-normal.json` — 2/2 viewports PASS；兩個 odometer 均有真實 `animationsstart=2`、`animationsfinish=2`、replay 增量；forced-static final 完整；browser editor export/reparse PASS。
- Reduced：`browser-reduced.json` — 2/2 viewports PASS；`replayResult=false`、start/finish 均為 0、state=`reduced`；browser editor export/reparse PASS。
- Console exception、page error、network failure、HTTP error、geometry issue：兩模式皆 0。
- 代表 HTML：58,243 bytes；SHA-256 `0fb1840994536c86dc19f3fbe0253cf2c963b3ba6c9aa7d7c461b1741e5d5fba`。
- `browser-normal.png`、`browser-reduced.png` 已人工抽查；metric 編號、數值、currency/percent suffix 與標籤可辨識，normal/reduced resting state 一致。

## Verification

- Slice 1 + WP1/WP2 + R4/R5/R7/R8/R10/R11 targeted：109/109 PASS。
- Full regression：171/171 PASS。
- Syntax checks：PASS。
- Debug scan：runtime 無 debugger／debug console；兩個 build CLI 僅保留預期 JSON stdout。
- Deterministic vendor rebuild：PASS，hash/bytes 不變。
- Fresh distribution：1,927,470 bytes，低於 20 MiB；SHA-256 `21939343e52174f622cbeb17ceda389d5c579e9639af62a4f53454ed1e637eb3`。
- `git diff --check`：PASS。

## Deferred boundary

- E underline sweep、sequencing vocabulary 擴充、14 類背景 effect、Motion/Anime、Vanta/Three/p5、WP4 與 EDX formal integration 均未開始。
- PGQ-WP3 只完成 Slice 1；不得把本 receipt 解讀為整個 WP3 COMPLETE。
