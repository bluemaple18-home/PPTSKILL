# PGQ-WP4-S2 — Representative Hard Gate and Repair Budget

**Status:** READY FOR INDEPENDENT REVIEW
**traces_to:** `PGQ-D05`, `PGQ-D09`, `PGQ-D11`

## Objective

沿用 Slice 1 的 stable Representative Sample Plan，加入可重播的 Layer-1 hard-gate decision：只根據既有 deterministic evidence 判斷 `pass | repair | blocked`，並以 `slideId + issue code` 鎖定同一問題最多兩次 repair。此 slice 只輸出下一步，不自動修改 deck。

## Measured gap

- `tools/validate-sample.mjs` 目前只有 aggregate `receipt.repairAttempts`，沒有 stable issue identity；不同問題可能共用或重置錯誤計數。
- 現有 validator 直接消費三模式 receipt，但無法把 Slice 1 的 Typical／Stress slide identity 與 content／geometry／static-motion hard evidence 綁成同一 decision。
- 規格要求未驗證為 `NOT_RUN/UNKNOWN`、不得硬給 PASS，且同一問題最多兩次 repair；目前尚無共用 pure gate 表達這些狀態。

## Input / output contract

- Input：Slice 1 `sample`、每個 sample slide 的 allowlisted hard checks、local repair history、optional last-success reference。
- Hard check codes 僅限 `content_integrity`、`geometry`、`static_readability`、`animation_interference`；status 僅限 `pass | fail | not_run | unknown`，每筆需有 bounded evidence reference。
- Issue identity 固定由 `slideId + code` 派生；caller 不得自報 issue ID、attempt count、verdict 或 next action。
- Output：`pass | repair | blocked`、sorted issues、bounded next action、attempts used/remaining、preserved last-success reference 與 `fullDeckQaRequired=true`。
- `not_run | unknown` 一律 blocked，不消耗 repair budget；fail 才可提出 repair。
- 同 issue 已完成 0／1 次 repair 時可分別提出第 1／2 次；完成 2 次仍 fail 時 blocked，不能因 layer、rerun 或另一個 validator 重置。
- Gate 不寫 DeckSpec／StyleSpec／CompositionSpec、不碰 approved content，也不覆寫 last-success artifact。

## Acceptance

1. Typical／Stress 的每個 slide 都須完整覆蓋四個 hard checks；缺 slide、缺 code、重複 code、未知欄位或 sample 之外 slide fail loud。
2. 全部 checks PASS 才回 `pass`；sample PASS 仍輸出 `fullDeckQaRequired=true`，不得宣告 full deck PASS。
3. 任一 `not_run | unknown` 回 `blocked` 並列出缺證據，不偽裝成 fail 或 PASS。
4. Fail issue 的 identity 與排序 deterministic；repair history 僅接受 gate 先前可產生的 bounded action，不能自報已修或竄改其他 issue。
5. 同 issue 第 1、2 次可回 `repair`；第 3 次前即 blocked，保留 last-success reference並提供人工選項。
6. Content integrity fail 不授權改寫事實；geometry/static/animation 只回 bounded action proposal，不在本卡執行 mutation。
7. Direct 與 installed CLI 使用同一 pure gate；legacy `validate-sample` 不回退，aggregate 第三次停止規則不得被放寬。
8. Focused、PS-002/R6、WP4 Slice 1 compatibility、full regression、fresh ZIP lifecycle、syntax 與 `git diff --check` PASS。

## Blocking edges / checkpoint

- 已滿足：PGQ-WP4 Slice 1 COMPLETE，stable sample slide IDs 已存在。
- Frontier：本卡可立即開工；scope-aware feedback、sample freeze/invalidation、Layer-2 advisory、Layer-3 Owner calibration 依賴此 hard-gate result，但不納入本卡。
- Checkpoint：本卡 independent review GO 後，再決定 feedback/persistence 與三層 readability 的最小後續 slice。

## Likely files

- `runtime/representative-qa-gate.js`
- `runtime/workflow-cli.mjs`
- `tools/validate-sample.mjs`（只做必要相容接線，不重寫 PS-002）
- `tests/pgq-wp4-s2-hard-gate.test.mjs`
- `tests/ps-002-validator.test.mjs`
- packaged Skill／thin adapters（只同步唯一 CLI contract）

## Non-goals

- 不自動 patch layout/content/motion，不執行無上限 loop，不新增 hook、agent、service、DB、ledger 或第二套 evidence store。
- 不做 Layer-2 AI advisory、Layer-3 Owner aesthetic calibration、scope-aware feedback persistence、sample freeze/invalidation 或 full-deck orchestration。
- 不重開 WP3 Slice 4、WP4 Slice 1、EDX、Golden grammar 或 renderer primitive。

## Verification

- TDD RED：完整 PASS、NOT_RUN blocked、同 issue 0/1/2 repairs、history spoof、coverage/allowlist、last-success immutability。
- Direct/installed CLI parity；PS-002 aggregate legacy behavior 與 R6 repair order regression。
- WP4 Slice 1 + PGQ targeted、full suite、fresh ZIP install/smoke/uninstall、syntax、`git diff --check`。

## Candidate result

- Slice 2 focused：6/6 PASS；Slice 1＋PS-002/R6 compatibility：21/21 PASS。
- PGQ targeted＋PS-002/R6：87/87 PASS；full regression：195/195 PASS。
- Fresh ZIP lifecycle PASS；2,124,775 bytes；SHA-256 `19d164d7ded203102528737b7be224221885ceea79f88f3f8f0e7cfd5122c647`。
- Browser gate：NOT_APPLICABLE；本 slice 只新增 pure evidence decision 與 CLI contract，未改 renderer／DOM／CSS／browser runtime。

## Review repair

- Repair 1：hard gate 現完整驗證 Slice 1 sample shape；單張只接受 `both`，雙張只接受 ordered `typical + stress`，並鎖定 sample／entry allowlist、approval/full-deck flags 與 bounded reason codes。
- Direct 與 fresh installed CLI 均新增偽造 role regression；修補前為 RED，修補後 PASS。
