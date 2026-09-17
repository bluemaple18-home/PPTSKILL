# PGQ-WP4 Slice 1 — Independent Review Handoff

## Root question

PGQ-WP4 Slice 1 的 Representative Sample Plan 是否能從既有正式 planning truth deterministic 選出 Typical／Stress，且不改動 approved content、既有 planner outputs、generation units 或 full-deck QA 義務？

## Goal

對 `9c644de..ef848c9` 做獨立唯讀 review。若有 correctness finding，只退回最小 repair；若無 blocking finding，回覆 `GO — PGQ-WP4 Slice 1`。

## Current state

- Branch：`codex/pgq-wp4-s1`
- Base／task-card commit：`9c644de`
- Candidate commit：`ef848c9`
- Status：`READY FOR INDEPENDENT REVIEW`
- 尚未 merge、push，也未開 WP4 Slice 2／EDX。

## Constraints

- Review only；不要直接 repair、merge、push、deploy 或開後續 slice。
- 不重開 PGQ-WP3 Slice 4；G6／D04 已由 WP3 Slice 1～3 關閉。
- 不把 sample PASS 當 full-deck PASS；`sampleCount=0` 只可取消人工等待，不可取消 full-deck QA。
- 不新增 QA service、DB、registry、workflow engine、Reviewer agent 或第二套 renderer/planner truth。
- 本 slice 是 pure planning contract；沒有 renderer／DOM／CSS/runtime 可見 mutation，browser gate 應為 NOT_APPLICABLE，不得偽稱 browser PASS。

## Delivered

- 新增 `runtime/representative-sample-planner.js`，由 Deck Rhythm Plan 與 optional motion/background proposal 派生 bounded sample plan。
- `sampleCount=1` 回一筆 `both`；`sampleCount=2` 回互異的 `typical`／`stress`；單頁 deck 收斂為一筆 `both`。
- Stress 只使用正式 derived truth；reason codes 由內部 allowlist 產生，不接受 caller 自報。
- Ranking 使用固定 score、outline order 與 locale-independent stable ID tie-break，重跑 byte-stable。
- 無 planner truth 的 legacy caller 保留前序 fallback；skip sample 回空 entries 並明示 `fullDeckQaRequired=true`。
- Packaged Skill 與 Codex／Claude Code／Gemini thin adapters 已同步契約；fresh installed `plan-new` 與 direct output 相同。

## Evidence

- Task card：`tasks/pgq-wp4-s1-representative-sample-plan.md`
- Receipt：`evidence/pgq-wp4-s1/slice-1-receipt.md`
- Focused：11/11 PASS。
- PGQ-WP1～WP4 compatibility：72/72 PASS。
- Full regression：189/189 PASS。
- Fresh ZIP：2,121,377 bytes；SHA-256 `45aad80a8d195e57300e5c12d13345cc7037e5a5cb430dc35db91823477f9b66`。
- Fresh install/smoke/uninstall lifecycle：PASS。
- Syntax 與 `git diff --check`：PASS。

## Independent review focus

1. Ranking 是否真的 deterministic，尤其 tie-break 是否受 locale、object order 或 runtime 隨機性影響。
2. Typical 是否可能永遠落在 cover／第一頁；Stress 是否可在第 3 頁以後由正式 risk signals 選中。
3. 一張／兩張／單頁 deck／legacy no-signal／skip sample 的契約是否各自一致且 fail-safe。
4. Caller 是否能透過自報 reason、未知欄位、motion/background metadata 或非正式 DOM state 操縱選樣。
5. `sampleCount` 改變時，composition、Golden、rhythm、motion、background、content integrity 與 generation units 是否完全不漂移。
6. `sampleCount=0` 是否可能被 downstream 誤解為 full-deck QA 已取消；sample PASS 是否仍不能替代全份驗收。
7. Installed ZIP 是否包含新 planner，三個 adapter 是否只做薄指引而未長出第二套選樣邏輯。
8. 是否有應留到後續 slice 的 repair、feedback、persistence、三層 readability 或 browser orchestration 被偷渡進本卡。

## Reproduction commands

```bash
node --check runtime/representative-sample-planner.js
node --test tests/pgq-wp4-s1-representative-sample-plan.test.mjs tests/p0-r4-generation-plan.test.mjs
node --test tests/pgq-wp1*.test.mjs tests/pgq-wp2*.test.mjs tests/pgq-wp3*.test.mjs tests/pgq-wp4-s1-representative-sample-plan.test.mjs
pnpm test
pnpm build:dist
git diff --check 9c644de..ef848c9
```

## Candidate fork

- `GO`：回主線做 closure write-back；merge／push 仍須 Owner 明示授權。
- `REQUEST CHANGES`：只修可重現 finding，不擴到 WP4 後續責任。

## Reviewer prompt

> 讀 `handoff_20260917_pgq_wp4_s1_review.md`，對 `9c644de..ef848c9` 做獨立唯讀 review。重跑必要 focused／compatibility／full／ZIP gates，輸出 GO 或可重現 findings。不要 repair、merge、push、deploy，也不要開 WP4 Slice 2、EDX 或重開 WP3 Slice 4。
