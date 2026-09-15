# PGQ-WP2-S1 — Truthful Generation Capability / Chart Semantics Gate

**Status:** COMPLETE / READY FOR INDEPENDENT REVIEW  
**traces_to:** `PGQ-D02`, `PGQ-D06`

## Objective

讓既有 generation planner 從共用 runtime registry 取得真實可用能力，並在候選與 renderer 入口明示拒絕尚未支援的 chart 語意，停止把 line／area／pie／donut 或負值資料靜默畫成正值 bar-row。

## Scope

- 從既有 composition registry 與共用 component/chart capability registry 產生 deterministic capability view。
- `createGenerationPlan()` 回傳該 capability view，並對傳入的 bounded candidate requests 標記 `available | unavailable` 與原因。
- renderer 使用同一份 chart capability contract；只渲染已支援且語意可保真的 chart。
- 保留舊 DeckSpec 的讀取／sanitizer 相容性；不支援內容在 render 時 fail loud，不偷換圖意。
- 無取代：不新增 renderer、workflow、資料庫、Agent 或 schema 版本。

## Acceptance

1. Capability view 的 composition primitive IDs 直接來自既有 registry，不維護第二份名單。
2. Planner 在真實 `createGenerationPlan()` output 內帶出 capabilities 與 candidate verdict。
3. `bar` 且數值非負的 chart candidate 可用；line／area／pie／donut 明示 unavailable。
   - Planner 必須帶入 WP1 preflight 的 `generationPermissions`；未授權 chart generation 時，`bar` 也不可用。
4. 含負值的 bar candidate 明示 unavailable，renderer 同樣 fail loud，不使用絕對值扭曲語意。
5. 未知 primitive／component type 明示 unavailable。
6. 合法既有 deck 的 content hash 與 render 行為不回退；舊格式仍可讀。
7. Targeted、distribution/full regression、syntax 與 `git diff --check` PASS。

## Blocking edges

- 已滿足：PGQ-WP1 Slice 1 + Slice 2 COMPLETE / GO / integrated。
- 本卡完成前，不開始 WP2 的語意構圖 candidate、Golden reference routing 或跨頁節奏 slice。
- PGQ-WP3 正式實作仍受 WP2 capability view 阻擋；EDX 正式 integration 不在本卡。

## Likely files

- `runtime/composition-primitives.js`
- `runtime/generation-capabilities.js`
- `runtime/generation-plan.js`
- `runtime/full-deck-renderer.js`
- `runtime/workflow-cli.mjs`
- `distribution/skill/pptskill/SKILL.md`
- `distribution/adapters/*/entry.md`
- `tests/pgq-wp2-s1-generation-capabilities.test.mjs`
- `BACKLOG.md`
- `evidence/pgq-wp2-s1/slice-1-receipt.md`

## Verification

- RED → GREEN public-interface tests for planner capability output and renderer fail-loud behavior。
- Existing generation-plan／DeckSpec／renderer／distribution targeted regression。
- Full `pnpm test`、syntax checks、`git diff --check`。

## Final evidence

- WP2-S1 + R1/R4/R5/R8/R11 targeted：41/41 PASS。
- Full regression：144/144 PASS。
- Browser editor：unsupported line chart 明示拒絕且 state rollback 保留原 `bar`；save/reopen 與既有 editor acceptance PASS。
- Browser diagnostics：console/page/network/HTTP errors 均為 0。
- Syntax checks 與 `git diff --check`：PASS。
- Receipt：`evidence/pgq-wp2-s1/slice-1-receipt.md`。
