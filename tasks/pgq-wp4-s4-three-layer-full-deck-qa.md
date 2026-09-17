# PGQ-WP4-S4 — Three-Layer Readability and Full-Deck QA Closure

**Status:** READY FOR IMPLEMENTATION
**traces_to:** `PGQ-D05`, `PGQ-D09`, `PGQ-D11`

## Objective

沿用 Slice 1～3 的 Representative Sample、trusted browser evidence、bounded repair budget 與 approval freeze，補齊 G7 尚未落地的三層可讀性及逐頁 full-deck QA。Sample approval 只保留為代表頁 checkpoint；交付判定必須對同一 canonical artifact 的每張 slide 完成 hard checks，並記錄具引用理由的 Layer-2 advisory 與同 identity 的 Layer-3 Owner confirmation。

## Measured gap

- Slice 1～3 已閉環 representative selection、hard gate、repair budget、human sample freeze、scope-aware feedback planning 與 affected-only invalidation。
- 現有 trusted producer 只以 representative sample 建立 approval authority；尚無單一 release decision 證明 full deck 每頁均已檢查。
- PGQ-D11 要求 Layer 2 結構／閱讀風險只能是有引用理由的 advisory，Layer 3 必須保留 Owner／製作者對本 deck 的明確確認；目前兩層均未契約化。
- `sampleCount=0` 已能跳過人工 sample wait，但尚無完整 release gate 證明它不會同時跳過逐頁 QA。

## Input / output contract

- Input：portable HTML artifact、artifact 內 sanitized DeckSpec、optional approved sample freeze、同一 artifact identity 的 bounded advisory items、Owner confirmation，以及既有 repair history。
- Layer 1 由 packaged trusted browser producer 對 artifact 內全部 slides 產生 content integrity、geometry、static readability、animation interference evidence；caller 不得自報 PASS、slide coverage、artifact fingerprint 或 full-deck verdict。
- Layer 2 只接受 allowlisted risk code、受影響 slide IDs、具體 `evidenceRefs` 與 `reason`；狀態只可為 `advisory | resolved | accepted-risk | unknown`，不得升格為客觀 PASS 或覆蓋 Layer 1 failure。
- Layer 3 必須由 Owner／製作者明示確認，並綁定同一 artifact／DeckSpec／contract identity；identity 改變即失效。未確認時只能 `awaiting-owner`，不得宣稱 release PASS。
- Output：immutable three-layer receipt、每頁 Layer-1 coverage、unresolved advisory、Owner confirmation state、共用 repair-budget decision、`samplePassDoesNotImplyFullDeckPass=true` 與單一 `pass | repair | blocked | awaiting-owner` release decision。
- Repair 次數沿用 Slice 2 的 `slideId + issue code` history，不因 sample/full-deck 或 Layer 1～3 切換而重置；本 slice 只輸出既有 allowlisted repair action，不自行改文、拆頁或 mutation。

## Acceptance

1. Trusted producer 的 coverage 必須與 embedded DeckSpec slide IDs 完全一致；缺頁、多頁、duplicate ID、NOT_RUN／UNKNOWN 或任一 hard-check failure 均 fail closed。
2. Sample PASS／freeze、`sampleCount=0` 或 Owner confirmation 均不能替代 Layer 1 full-deck checks；偽造 full-deck PASS／coverage／identity 必須被拒絕。
3. Layer-2 advisory 必須逐項引用已收集 evidence 與 slide；未知 code、缺引用、錯 artifact identity、任意 score 或客觀 PASS 文案均 fail loud。
4. Layer-2 unresolved risk 只能導向 `repair | blocked | awaiting-owner`；`accepted-risk` 必須由 Layer-3 confirmation 明示涵蓋，不得自動接受。
5. Layer-3 confirmation 綁定同一 artifact identity；content、composition、style、motion、contract 或 slide set 改變後不得沿用舊確認。
6. 同一 issue 最多兩次 repair，第三次前 blocked；計數跨 sample/full-deck 與各 layer 共用，保留 last-success artifact。
7. 不 secret shrink-to-fit、不自動 shortening／split／semantic change；需要內容或頁數變更時回到既有 human confirmation boundary。
8. Direct 與 installed CLI parity；Focused、WP4 compatibility、PGQ targeted、full regression、fresh ZIP lifecycle、managed browser、syntax 與 `git diff --check` PASS。

## Blocking edges / checkpoint

- 已滿足：PGQ-WP4 Slice 1～3 COMPLETE 且 independent review GO；trusted producer、stable identity、repair budget 與 sample freeze 可重用。
- Frontier：本卡是 G7／WP4 completion candidate；只有驗收與 independent review GO 後，才能判斷 WP4 COMPLETE。
- Checkpoint：不預設 Slice 5。若實作發現必須新增 renderer primitive、任意 LLM judge、第二套 evidence store 或自動內容 mutation，停止並回 Mainline 重切，不把 scope 塞入本卡。

## Likely files

- `runtime/representative-qa-evidence.js`（抽出可覆蓋指定／全部 slide 的 trusted producer seam）
- `runtime/representative-qa-gate.js` 或最小 `runtime/full-deck-qa.js`
- `runtime/workflow-cli.mjs`
- focused direct／installed／browser tests
- packaged Skill／thin adapters（只同步唯一 CLI contract）

## Non-goals

- 不新增 QA service、DB、ledger、workflow engine、per-layer agent、任意 AI score 或第二套 DeckSpec truth。
- 不執行自動文案改寫、split slide、renderer primitive、profile write 或 Golden grammar 更新。
- 不把 Layer-2 advisory 冒充 deterministic hard gate，不把 Owner confirmation 冒充 browser evidence。
- 不重開 WP1～WP3、WP4 Slice 1～3、EDX、Slice 5、merge、push 或 deploy。

## Verification

- TDD RED：partial/duplicate coverage、sample shortcut、caller-authored PASS/identity、stale Owner confirmation、unreferenced advisory、unknown advisory、accepted-risk 未獲涵蓋、repair count reset。
- Direct/installed CLI parity；WP4 Slice 1～3 compatibility。
- Managed Chrome：static／normal × supported viewports；console、pageerror、network、HTTP、geometry、content integrity、motion interference 與 lifecycle cleanup。
- PGQ targeted、full suite、fresh ZIP install/smoke/uninstall、syntax、`git diff --check`。

