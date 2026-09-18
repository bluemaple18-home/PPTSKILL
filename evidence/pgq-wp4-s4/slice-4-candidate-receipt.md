# PGQ-WP4 Slice 4 Candidate Receipt

**Status:** READY FOR INDEPENDENT REVIEW
**Range:** `e9172136..fe255b1`（另含本 receipt 更新 commit）

## Delivered contract

- `qa-full-deck` 只接受 portable artifact 與 bounded request；Layer-1 PASS、checks、coverage、identity 均由 packaged Chrome producer 派生，caller 不得自報。
- Layer 1 完整覆蓋 canonical DeckSpec 的每張 slide；content integrity、geometry、static readability、animation interference 皆有 current evidence ref，partial／duplicate coverage fail closed。
- Layer 2 必須明示 AI review 完成、綁定同一 artifact identity、引用 current trusted evidence，finding count 必須與 bounded advisory 一致；無 review、UNKNOWN、任意 score／code 或舊引用不得通過。
- Layer 3 必須由 human 明示確認且綁定同一 identity；artifact／DeckSpec／contract 改變後舊確認失效。`accepted-risk` 必須逐 code 由 Layer 3 涵蓋。
- Sample approval 與 `sampleCount=0` 均沒有 full-deck release authority。Hard issue 沿用 `slideId + code` 的兩次 repair budget；不執行自動改文、拆頁或 renderer mutation。

## Verification evidence

- Focused Slice 4：8/8 PASS。
- WP4 Slice 1～4 compatibility：28/28 PASS。
- Full regression：211/211 PASS。
- Managed local Chrome：static／normal × 1600×900／1280×720；trusted producer lifecycle PASS。
- Visible-content tamper：只對受影響 slide 產生 `content_integrity` repair；兩次既有 action 後 blocked。
- Direct／fresh-installed CLI parity：PASS；fresh ZIP install/smoke/uninstall：PASS。
- ZIP：2,146,485 bytes（低於 20 MiB）；SHA-256 `b324f839df79bbc9ab5d9e8fe0d65130cb531d59225cce6d938598511039dcb6`。
- Syntax、`git diff --check`：PASS。

## Boundaries

- 無 QA service、DB、ledger、workflow engine、任意 AI score、profile write、renderer primitive 或自動內容 mutation。
- 無 WP1～WP3 reopen、EDX、Slice 5、merge、push、deploy。
- 原有 `.DS_Store`、`CLAUDE.md` 與兩份 HANDOFF untracked files 未動。

## Review repair 1

- Finding：CSS 可將非首張 required title 設為 `opacity:0`，舊 geometry 與 global motion gate 仍可能全部 PASS。
- RED：`tests/pgq-wp4-s4-required-visibility.test.mjs` 初次執行為 `Missing expected rejection`。
- Fix：browser producer 逐頁比對 canonical `data-edit-target`，檢查 target 及 ancestor 的 display／visibility／opacity／box，並輸出 `requiredVisibility`；full-deck mapper 分別把 static 與 normal visibility 綁到該頁 hard checks。
- GREEN：同一 hidden `decision` title 使 browser receipt fail，且 full-deck decision 只回該頁 `static_readability`、`animation_interference` issues；Focused 8/8、WP4 28/28、Full 211/211、fresh ZIP lifecycle PASS。

## Review repair 2

- Finding：fully clipped required title 仍有 non-zero box 與 opacity 1，可繞過 property-only visibility。
- RED：同一 browser test 加入 `#guardrails [data-effect-title]{clip-path:inset(0 0 100% 0)!important}`，receipt 未把該 target 判 fail。
- Fix：每張 slide scroll 入 viewport 後，以 3×3 `elementFromPoint` painted-area sampling 驗證 canonical targets；有效 samples <5 或 coverage <50% fail closed。Opacity probe 與 clip-path probe 同時保留。
- GREEN：兩個 targets 分別只使自己的 static readability／normal animation interference 失敗；WP4 28/28 PASS。Full suite 的並行 Chrome 啟動曾出現單一 DevTools port 環境競爭，該檔單獨 7/7 PASS；改用 serial browser lifecycle 後完整 211/211 PASS。

## Independent review request

唯讀 review `e9172136..HEAD`，核對本 receipt 與 task card。重跑必要 focused／WP4 compatibility／full／managed browser／ZIP gates；特別對抗 partial coverage、sample shortcut、caller-authored PASS／identity、stale Layer-2/3 identity、無引用 advisory、accepted-risk 未獲 human 涵蓋，以及 repair budget 被 layer／sample/full-deck 重置。輸出 GO 或可重現 findings；不要 repair、merge、push、deploy，也不要開 EDX／Slice 5。
