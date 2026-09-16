# PGQ-WP3-S2 — E Sweep / Role-aware Text Entrance

**Status:** READY FOR REVIEW
**traces_to:** `PGQ-D04`, `PGQ-D06`

## Objective

沿用 Slice 1 的唯一 motion planning／CompositionSpec／renderer／editor seam，新增 bounded `underline-sweep`：title 先 reveal，supporting copy 後 reveal，subtitle 細底線由左向右 sweep。正常、replay、reduced-motion、forced-static 都必須到達相同完整終態。

## Input / output contract

- `motionSignals` 新增 `effect=underline-sweep`、`role=text`、`replay=slide-visible`、`staggerMs=0..300`。
- Targets 只允許依序 `content.title`（optional）與 `content.subtitle`（required）；target 不接受 caller 自報 role、CSS、selector、duration 或任意 metadata。
- Planner 只接受既有七種 primitive、非 `none` motion intensity、非空 title/subtitle；不得改 primitive、Golden logic、Deck Rhythm Plan、content 或 content hash。
- CompositionSpec 只保存 allowlisted refs，不保存 duplicated text、DOM selector 或 style payload。
- Renderer 由 ref 決定 role：title 只做 restrained reveal；subtitle 做 reveal + 1px accent underline L→R sweep。不得新增 primitive 或任意 HTML/CSS 入口。
- Runtime 使用既有 CSS/IntersectionObserver/replay seam；不引入 Motion、Anime、Vanta、Three 或 p5。

## Acceptance

1. Direct 與 installed `plan-new` 回傳相同 truthful capability；legacy request 不帶 motion signal 時仍為 `motionPlan: null`。
2. 合法 proposal 產生 allowlisted CompositionSpec；unknown field、錯序/重複 target、缺 subtitle、空文字、`motionIntensity=none` 均 fail loud 或 truthful unavailable。
3. DeckSpec sanitizer、Node/browser editor、renderer embed、export 與 recipient reparse 保留契約並移除未知欄位。
4. Renderer 只標記核准 title/subtitle；CSS 使用 opacity/transform 與 pseudo-element scaleX，不動畫 width/height/margin/position。
5. Normal 顯示 title→subtitle 的 bounded sequence，subtitle underline L→R；`replaySlide()` 可重置 presentation state，不改 DeckSpec。
6. Reduced-motion、forced-static 與缺少 runtime capability時直接顯示精確終態；console/pageerror/network failure 為 0。
7. Browser editor 修改 title/subtitle 後 export/reopen 仍使用新 canonical text，motion metadata 不漂移。
8. Content hash before/after 不變；NumberFlow Slice 1、WP1/WP2、R4/R5/R7/R8/R10/R11 無回退。
9. Targeted、full regression、syntax、browser acceptance、single-file/offline/20 MiB、`git diff --check` PASS。

## Blocking edges

- 已滿足：MVP CLOSED；PGQ-WP1 COMPLETE；PGQ-WP2 COMPLETE；PGQ-WP3 Slice 1 COMPLETE。
- 本卡完成前不開始背景 effects、WP4 或 EDX formal integration。

## Non-goals

- 不做 keyPoint/grouped reveal、專業 timeline 或多 effect composition。
- 不做 Vanta／Three.js／p5.js、14 類背景 vocabulary 或 Style background color adapter。
- 不新增 renderer primitive、第二套 motion schema、CDN 或外部 runtime。

## Verification

- TDD：capability/planner → portable round-trip → renderer/runtime → installed workflow。
- Browser：normal/replay、reduced-motion、forced-static、editor mutation/export/reopen；listeners 在 navigation 前註冊。
- Targeted + full regression + syntax + debug scan + `git diff --check`。
