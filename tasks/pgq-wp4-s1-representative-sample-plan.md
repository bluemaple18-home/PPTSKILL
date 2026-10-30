# PGQ-WP4-S1 — Representative Sample Plan

**Status:** COMPLETE — INDEPENDENT REVIEW GO
**traces_to:** `PGQ-D05`, `PGQ-D11`

## Objective

把目前 `sampleCount` 直接取前 1～2 頁的行為，替換為 deterministic、可解釋的 Typical／Stress 代表頁計畫。計畫只從同一次正式 generation plan 的真實 slide 與既有 composition、Golden、rhythm、motion、background 結果選擇，不另做漂亮假樣張，也不建立第二套 QA workflow。

## Measured gap

- `createGenerationPlan()` 目前以 `outline.slides.slice(0, sampleCount)` 選樣；無法證明非前兩頁可被選中，也沒有 Typical／Stress role 或 reason code。
- WP1～WP3 已提供 content、composition、Golden、deck rhythm、motion 與 background 的正式 planning truth；缺口是把這些既有訊號轉成 1～2 張可重播的代表頁計畫，而非再新增 motion capability。
- 因 G6／PGQ-D04 已由 WP3 Slice 1～3 完成，沒有 measured gap 支持 PGQ-WP3 Slice 4；whole-deck 驗證歸入本 WP4 QA frontier。

## Input / output contract

- Input 沿用 `createGenerationPlan()` 的 outline 與既有 planner outputs；不得讀 live DOM、任意 selector、私密工作理由或未核准內容。
- `sampleCount=0` 時不建立人工等待點，但輸出仍明示 full-deck QA requirement；不得把 skip sample 解讀為 skip QA。
- `sampleCount=1|2` 時輸出穩定 slide ID、`typical|stress|both` role、bounded reason codes 與 `requiresApprovalBeforeRemaining`；一張樣張必須是 `both`。
- Stress ranking 只使用 allowlisted signals，例如高密度、高證據、高動態、背景效果、節奏 warning 與 composition risk；同分以 outline order／stable slide ID deterministic tie-break。
- Typical 必須代表 deck 的主要敘事／構圖路徑；不得固定第一頁或只選 cover。當真實訊號支持時，非前兩頁必須可被選中。
- 計畫不得修改 approved copy、content hash、CompositionSpec、StyleSpec、motion/background selection 或 generation units。

## Acceptance

1. `sampleCount=1` 產生一筆 `both`；`sampleCount=2` 產生互不重複的 Typical／Stress；deck 只有一頁時 fail loud 或收斂為一筆 `both`，契約須明示且測試鎖定。
2. Fixture 證明第 3 頁以後可因真實 risk／representativeness signals 被選中；cover 不因位置自動成 Typical。
3. 相同 input 重跑得到 byte-stable sample plan 與 reason ordering；未知／自報 reason 不進輸出。
4. `sampleCount=0` 不新增 approval wait，且 full-deck QA 仍為 required；sample PASS 不得宣告 full-deck PASS。
5. Direct 與 installed `plan-new` 使用同一 contract；legacy `sampleCount` caller 相容，非法 count 維持 fail loud。
6. WP1～WP3 的 content hash、composition／Golden／rhythm／motion／background plans 與 units 不漂移；targeted/full regression、syntax、fresh ZIP smoke 與 `git diff --check` PASS。

## Blocking edges / checkpoint

- 已滿足：PGQ-WP1、WP2、WP3 Slice 1～3 COMPLETE；WP3 independent review GO。
- Frontier：本卡可立即開工；後續 repair loop、scope-aware feedback、sample persistence 與三層 readability 均依賴本卡的 stable sample identity，但不納入本卡。
- Checkpoint：本卡完成並獨立 review GO 後，才切下一張 WP4 repair／feedback slice。

## Likely files

- `runtime/generation-plan.js`
- `runtime/representative-sample-planner.js`（若最小抽離有助於 pure testing）
- `tests/p0-r4-generation-plan.test.mjs`
- 新增 bounded WP4 focused test／fixture
- installed Skill adapters 與 package manifest（僅既有 `plan-new` 路徑必要同步）

## Non-goals

- 不實作自動 repair、AI aesthetic verdict、scope-aware feedback persistence、sample freeze/invalidation 或 full-deck browser QA orchestration。
- 不新增 QA service、DB、registry、workflow engine、Reviewer agent 或新的使用者審批步驟。
- 不重開 WP3、CLOUDS2／p5 license gate、EDX editor integration、專業 timeline 或 whole-deck motion runtime。

## Verification

- TDD：先以「第三頁 stress 應被選中」「一張為 both」「skip 不等待」「deterministic tie-break」建立 RED，再做最小 planner。
- Contract：direct/installed `plan-new` parity、legacy/invalid inputs、content/planner output immutability。
- Regression：WP1～WP3 targeted + full suite、syntax、fresh ZIP smoke／size、`git diff --check`。

## Candidate result

- Focused（含 installed `plan-new` parity）：11/11 PASS。
- PGQ-WP1～WP4 compatibility：72/72 PASS；full regression：189/189 PASS。
- Fresh ZIP lifecycle PASS；2,121,377 bytes；SHA-256 `45aad80a8d195e57300e5c12d13345cc7037e5a5cb430dc35db91823477f9b66`。
- Browser gate：NOT_APPLICABLE；本 slice 只改 pure planning output 與 packaged instructions，沒有 renderer／DOM／CSS／runtime 可見行為。

## Closure

- Independent review：`GO — PGQ-WP4 Slice 1`；無 blocking finding。
- Reviewer 重跑 focused 11/11、PGQ compatibility 72/72、full regression 189/189、fresh ZIP checksum 與 branch-range `git diff --check`，結果皆與 receipt 一致。
- Reviewer hook 產生的未追蹤 `CLAUDE.md` 不屬 candidate；Owner 授權後已移除。
- Slice 1 已關閉；本 closure 不授權或預設開啟 WP4 Slice 2／EDX。
