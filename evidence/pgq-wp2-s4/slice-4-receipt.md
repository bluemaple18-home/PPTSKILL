# PGQ-WP2 Slice 4 — Deck-level Rhythm Planning Receipt

**Status:** COMPLETE

**Base:** `d35d6f5b853a1cccc8a5716571e5d3db2b54e8e4`

**Task:** `tasks/pgq-wp2-s4-deck-rhythm-planning.md`

## Delivered

- 新增唯一 plan-only `deck-rhythm-planner.js` seam，由正式 `createGenerationPlan()`／installed `workflow-cli.mjs plan-new` 執行。
- 每頁 rhythm input 使用明確 allowlist；density 必須與 Slice 2 semantic truth 一致，composition／Golden／anchor identity 只能從 Slice 2／3 輸出推導。
- Selection 只取既有 `available` candidates；alternate 與 top semantic score 差距上限固定為 10。無 bounded alternate 時保留 top 並輸出 unresolved warning，不為 diversity 犧牲語意。
- 非空 `continuityGroup` 可保留 intentional repetition；一般重複只在明確四頁 run 時嘗試 bounded rerank。
- 每頁輸出 selected candidate、實際 CompositionSpec proposal、Golden logic、anchor、structured signals、continuity、deck reason 與 discarded alternates。
- 跨頁 high density＋highlight、high evidence、high motion、quiet absence、相鄰 transition、narrative role regression、開場／收尾缺口與 unresolved repetition 均輸出 bounded warnings。
- 全 deck content integrity 沿用 Slice 2 hash；未修改 renderer、browser editor、DeckSpec schema、motion runtime、WP4 QA 或 EDX。
- Packaged Skill 與 Codex／Claude Code／Gemini adapters 已補同一 rhythm contract；舊 request 未帶 `rhythmSignals` 時維持 `deckRhythmPlan: null`。

## Acceptance evidence

- RED：新增 public-interface 測試首次執行 `0/6 PASS`，因 generation plan 尚無 `deckRhythmPlan`，符合預期。
- Slice 4 direct + installed runtime：`7/7 PASS`。
- Targeted（Slice 1～4、Golden grammar、R4、R5、distribution、R11）：`68/68 PASS`。
- Full regression：`165/165 PASS`。
- Syntax checks：PASS。
- Debug residue scan：PASS。
- `git diff --check`：PASS。

## Scope decision

- Browser acceptance 未重跑：本 slice 未修改 renderer、browser editor 或 browser runtime；installed distribution path 已由 targeted test 重建 ZIP、fresh install 並執行真實 `plan-new`。
- PGQ-WP2 至此 COMPLETE。下一 frontier 依既有依賴在 PGQ-WP3 Motion Vocabulary Upgrade 與 PGQ-WP4 Representative QA Loop 間裁決，不在本卡偷開。

## Repair 1 — partial repetition dimensions

- Finding：第四張 asset-led `component-focus` 只由 `full-bleed-editorial` 換成 `dark-premium-editorial` 時，Golden repetition 已解，但 composition 與 `scene-photograph` anchor repetition 被整體 `changed` boolean 靜默略過。
- RED：direct 與 installed `plan-new` targeted replay `0/2 PASS`；兩條路徑都缺 `composition_repetition_unresolved`／`visual_anchor_repetition_unresolved`。
- 修復：rerank score 改為計算 candidate 實際解掉的 repeated dimensions；選定後逐 dimension 重算，未解者各自保留 structured warning。
- Browser acceptance 維持不重跑：repair 未修改 browser／editor／renderer runtime。
