# PGQ-WP2 Slice 2 — Semantic-to-Composition Planning Receipt

**Date:** 2026-09-15

**Status:** COMPLETE / READY FOR INDEPENDENT REVIEW

**Base:** `0fd101707308c69f97d6156c85af525bd25c6cc9`

## Delivered contract

- `plan-new` 接受每頁一筆 allowlisted `semanticSignals`；未提供 signals 的舊 request 維持相容並回傳空 proposal 陣列。
- `comparison`、`sequence`、`evidence`、`explanation`、`asset-led` 會產生 bounded、deterministic、非一對一固定 mapping 的既有 primitive candidates。
- `cover`／`section-break` 只由 slide role 選擇；重要 component 可提出 `component-focus`。
- 每個 candidate 都保留 structured reason codes、排序分數、人類可讀 reason 與 Slice 1 capability verdict；available candidates 每頁最多三個。
- Capability gate 是最後硬 filter。Unavailable candidate 留在 `consideredCandidates`，asset-led 無合法 component presentation 時 blocked，不偷換 primitive。
- 只有與 approved outline component inventory 同 ID／type 的 existing user-provided component 不需要 generation opt-in；semantic signal 自報 origin 無法建立信任。Generated image／chart 仍受各自明確授權與 truthful renderer capability 限制。
- Top candidate 只產生 CompositionSpec proposal；approved title、subtitle、keyPoints 的 before／after SHA-256 一致。
- Packaged Skill 與 Codex／Claude Code／Gemini thin adapters 要求 allowlisted semantic signal，不得夾帶 prompt、私密 metadata 或 raw asset bytes。

## Evidence

- RED：新 public-interface tests 初次執行 `0/5 PASS`，缺少 `compositionProposals` 與 installed Skill contract。
- Slice 2 public tests：`7/7 PASS`。
- Targeted（Slice 2 + Slice 1 + R4 generation + R5 renderer + R8 distribution + R11 entry）：`43/43 PASS`。
- Full regression：`151/151 PASS`。
- Browser acceptance：本 slice 未修改 browser/editor/renderer runtime，因此不新增 browser rerun；既有 R5／Slice 1 renderer/editor regression 已包含在 targeted 與 full suite。

## Explicit deferrals

- Slice 3：Golden reference routing；本 slice 不讀或複製 Golden 圖片／資產。
- Slice 4：deck-level rhythm planning；本 slice 不做跨頁局部最優協調。
- 不新增 primitive、renderer、schema、workflow engine、Evidence DB 或 Agent。

## Repair 1 — spoofed existing-component origin

- Review finding：不存在的 image 可自報 `componentOrigin: user-provided`，繞過 `image:false`。
- RED：最小 direct planner reproduction `0/1 PASS`，ghost component 實際回傳 `ready`。
- Root cause：generic capability evaluator 信任 caller-controlled candidate origin；semantic planner 未把 existing claim 綁到 approved content inventory。
- Fix：generic candidate 恢復預設 generation opt-in；semantic planner 只有在 approved outline 同頁 inventory 找到相同 ID／type 時，才以 existing-component path 評估。找不到時保留 `existing_component_not_found` unavailable verdict 並 blocked。
- Regression：spoofed-origin direct semantic planner、generic candidate 與 installed `plan-new` 均已覆蓋；真實 inventory match 路徑仍為 available。
