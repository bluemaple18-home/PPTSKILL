# PGQ-WP4 Slice 4 Candidate Receipt

**Status:** READY FOR INDEPENDENT REVIEW
**Range:** `e9172136..807f805`（另含本 receipt closure commit）

## Delivered contract

- `qa-full-deck` 只接受 portable artifact 與 bounded request；Layer-1 PASS、checks、coverage、identity 均由 packaged Chrome producer 派生，caller 不得自報。
- Layer 1 完整覆蓋 canonical DeckSpec 的每張 slide；content integrity、geometry、static readability、animation interference 皆有 current evidence ref，partial／duplicate coverage fail closed。
- Layer 2 必須明示 AI review 完成、綁定同一 artifact identity、引用 current trusted evidence，finding count 必須與 bounded advisory 一致；無 review、UNKNOWN、任意 score／code 或舊引用不得通過。
- Layer 3 必須由 human 明示確認且綁定同一 identity；artifact／DeckSpec／contract 改變後舊確認失效。`accepted-risk` 必須逐 code 由 Layer 3 涵蓋。
- Sample approval 與 `sampleCount=0` 均沒有 full-deck release authority。Hard issue 沿用 `slideId + code` 的兩次 repair budget；不執行自動改文、拆頁或 renderer mutation。

## Verification evidence

- Focused Slice 4：7/7 PASS。
- WP4 Slice 1～4 compatibility：27/27 PASS。
- Full regression：210/210 PASS。
- Managed local Chrome：static／normal × 1600×900／1280×720；trusted producer lifecycle PASS。
- Visible-content tamper：只對受影響 slide 產生 `content_integrity` repair；兩次既有 action 後 blocked。
- Direct／fresh-installed CLI parity：PASS；fresh ZIP install/smoke/uninstall：PASS。
- ZIP：2,145,775 bytes（低於 20 MiB）；SHA-256 `91e82099911ecdc8608827e65c5e85d097eca15300024397a64e90ae9018c904`。
- Syntax、`git diff --check`：PASS。

## Boundaries

- 無 QA service、DB、ledger、workflow engine、任意 AI score、profile write、renderer primitive 或自動內容 mutation。
- 無 WP1～WP3 reopen、EDX、Slice 5、merge、push、deploy。
- 原有 `.DS_Store`、`CLAUDE.md` 與兩份 HANDOFF untracked files 未動。

## Independent review request

唯讀 review `e9172136..HEAD`，核對本 receipt 與 task card。重跑必要 focused／WP4 compatibility／full／managed browser／ZIP gates；特別對抗 partial coverage、sample shortcut、caller-authored PASS／identity、stale Layer-2/3 identity、無引用 advisory、accepted-risk 未獲 human 涵蓋，以及 repair budget 被 layer／sample/full-deck 重置。輸出 GO 或可重現 findings；不要 repair、merge、push、deploy，也不要開 EDX／Slice 5。
