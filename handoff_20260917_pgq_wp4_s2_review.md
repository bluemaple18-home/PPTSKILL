# PGQ-WP4 Slice 2 — Independent Review Handoff

## Root question

PGQ-WP4 Slice 2 的 Representative Hard Gate 是否能以完整、可重播的 Layer-1 evidence 安全輸出 `pass | repair | blocked`，並讓同一 `slideId + issue code` 在所有 rerun 共用最多兩次 repair budget？

## Goal

對 `2e0b832..d6a246e` 做獨立唯讀 re-review，並聚焦 `7aec6f6..d6a246e` 的 Repair 1。若仍有 correctness finding，只退回最小 repair；若無 blocking finding，回覆 `GO — PGQ-WP4 Slice 2`。

## Current state

- Branch：`codex/pgq-wp4-s2`
- Base／task-card commit：`2e0b832f2a764813ba79a7a2af28162d6973e902`
- Initial candidate commit：`7aec6f6056773cde1cf7ba235db4f54a1adcfb7b`
- Repair 1 commit：`d6a246eaefdd5550b32e3d376c7628c9bb89b139`
- Status：`INDEPENDENT RE-REVIEW GO`；closure write-back 已授權，等待整合驗證與 push。
- 尚未 merge、push，也未開 WP4 Slice 3／EDX。

## Constraints

- Review only；不要直接 repair、merge、push、deploy 或開後續 slice。
- 本 slice 只做 pure hard-gate decision，不執行 layout／content／motion mutation。
- 不把 sample PASS 當 full-deck PASS；輸出必須永遠保留 `fullDeckQaRequired=true`。
- `not_run | unknown` 必須 blocked，不能被視為 fail、repair 或 PASS。
- 同 issue 最多兩次 repair，不能因 layer、rerun、CLI 或 validator 改名而重置。
- 不新增 service、DB、ledger、workflow engine、agent、hook 或第二套 evidence truth。

## Delivered

- 新增 `runtime/representative-qa-gate.js`，完整驗證 Slice 1 sample identity、四種 allowlisted hard checks、repair history 與 last-success reference。
- Checks 固定為 `content_integrity`、`geometry`、`static_readability`、`animation_interference`；每個 sample slide 都必須完整覆蓋。
- Issue identity 只由 `slideId + code` 派生；caller 不能自報 issue ID、attempt、verdict 或 next action。
- Fail issue 的第 1／2 次只回 bounded action；完成兩次仍 fail 時 blocked，保留 last-success reference並交人處理。
- `workflow-cli.mjs qa-sample` 接上同一 pure gate；PASS／blocked／repair 的 exit code 分別為 0／2／3。
- Packaged Skill 與 Codex／Claude Code／Gemini adapters 只描述唯一 CLI contract，沒有複製 gate 邏輯。

## Evidence

- Task card：`tasks/pgq-wp4-s2-hard-gate-repair-budget.md`
- Receipt：`evidence/pgq-wp4-s2/slice-2-receipt.md`
- Slice 2 focused：6/6 PASS。
- Slice 1＋PS-002/R6 compatibility：21/21 PASS。
- PGQ targeted＋PS-002/R6：87/87 PASS。
- Full regression：195/195 PASS。
- Fresh ZIP：2,124,775 bytes；SHA-256 `19d164d7ded203102528737b7be224221885ceea79f88f3f8f0e7cfd5122c647`。
- Fresh install/smoke/uninstall lifecycle：PASS。
- Syntax 與 `git diff --check`：PASS。
- Browser：NOT_APPLICABLE；未改 renderer／DOM／CSS／browser runtime。

## Independent review focus

1. Checks 是否真的要求 sample × 四個 codes 完整笛卡兒覆蓋；缺漏、重複、額外 slide 或 unknown field 是否 fail loud。
2. `not_run | unknown` 是否始終 blocked 且不消耗 repair budget；是否存在空 evidence reference 或偽造 status 的繞過。
3. Repair history 是否可透過重排、跳 action、自報 result／attempt、混入其他 slide/code 或重複紀錄繞過兩次上限。
4. 同 issue 在第 0／1／2 次 history 下是否分別回第 1 repair、第 2 repair與 blocked；是否有 off-by-one。
5. 多個 issues 同時存在時，排序、next actions 與 blocked 優先序是否 deterministic；一個 UNKNOWN 是否會錯誤允許其他 mutation。
6. Content integrity fail 的 action 是否仍只是 proposal，沒有授權自動改寫 approved facts；last-success artifact 是否只引用、不覆寫。
7. CLI 是否把 gate status 正確放在 top level，並以 exit code 0／2／3 對應 pass／blocked／repair；installed ZIP 是否與 direct pure gate parity。
8. PS-002 aggregate legacy behavior、R6 repair sequence、Slice 1 sample plan 與 full regression 是否無回退。

## Reproduction commands

```bash
node --check runtime/representative-qa-gate.js
node --check runtime/workflow-cli.mjs
node --test tests/pgq-wp4-s2-hard-gate.test.mjs tests/ps-002-validator.test.mjs tests/p0-r6-geometry-gate.test.mjs tests/pgq-wp4-s1-representative-sample-plan.test.mjs
node --test tests/pgq-wp1*.test.mjs tests/pgq-wp2*.test.mjs tests/pgq-wp3*.test.mjs tests/pgq-wp4*.test.mjs tests/ps-002-validator.test.mjs tests/p0-r6-geometry-gate.test.mjs
pnpm test
pnpm build:dist
git diff --check 2e0b832..d6a246e
```

## Candidate fork

- `GO`：已取得；Owner 已明示授權 closure write-back、merge 與 push。
- `REQUEST CHANGES`：只修可重現 finding，不擴到實際 repair、feedback persistence 或 Layer-2/3。

## Reviewer prompt

> 讀 `handoff_20260917_pgq_wp4_s2_review.md`，對 `2e0b832..d6a246e` 做獨立唯讀 re-review，重點檢查 `7aec6f6..d6a246e` 是否完整關閉 sample role/shape finding。重跑必要 focused／compatibility／full／ZIP gates，輸出 GO 或可重現 findings。不要 repair、merge、push、deploy，也不要開 WP4 Slice 3、EDX 或任何自動 mutation loop。

## Repair 1

- Finding：hard gate 原本只核對 sample slide IDs；偽造單張 `typical` 或雙張 `typical` 可在 checks 全 PASS 時繞過 Stress QA。
- Root cause：Slice 2 把 Slice 1 output 當成可信內部值，沒有在 public `qa-sample` boundary 重驗其 role／shape invariant。
- Fix：入口現在完整 allowlist sample 與 entry fields，鎖 `version=1`、approval/full-deck flags、bounded unique reason codes，並只接受單張 `both` 或 ordered 雙張 `typical + stress`。
- Regression：direct gate 與 fresh installed CLI 都用 reviewer 的兩種偽造 shape fail loud；修補前同一路徑為 RED，修補後 GREEN。

## Re-review result

- `GO — PGQ-WP4 Slice 2`；無新 finding。
- 前次 P1 已確認關閉；focused 6/6、compatibility 21/21、PGQ targeted 87/87、full regression 195/195 PASS。
- Fresh ZIP 2,124,775 bytes；SHA-256 `19d164d7ded203102528737b7be224221885ceea79f88f3f8f0e7cfd5122c647`；lifecycle 與 branch-range diff gate PASS。
