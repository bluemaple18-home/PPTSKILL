# S8 Independent Review Handoff

你是 PPTSKILL 的獨立 Reviewer。唯讀審查下列候選，回覆 GO／NO-GO 與 P0–P3 findings；不得修改 candidate、ZIP、四個 protected untracked，不 merge／push／deploy，不開 S9。這是完整 S8 review，不能只把 Mainline PASS 當成獨立結論。

- Repo：`<repo-root>` = `PPTSKILL-canonical`。
- Branch：`codex/edx-wp1-s8`。
- **Product/evidence candidate：`fd7fc9ae2c94d393d570550bf4292972910d3160`**。
- S8 base：`9188b787ad964b92a129a5cff8f7067b08c0f4ea`。
- 舊 checkpoint：`a58cdfa5e963d7842aa7dfcf07dde181002c223d`，已被本候選取代；不能沿用舊 ZIP hash。
- 本 handoff 後續只增加 control docs，不改 candidate code／ZIP。

先讀 task `tasks/edx-wp1-s8-selecto-multiselect-input.md`、適用 AGENTS／task 規則、`evidence/edx-wp1-s8/mainline-receipt.md`、`host-repair-history.md`。核對 branch/worktree 與 source freeze；source decision 前查 CodeGraph，無命中才 bounded rg。節省模式，只審 S8 及其受影響 seam，不重做已關閉 S3–S7。

## 審查重點

1. Selecto 1.26.3 exact pin、MIT/integrity、portable vendor；selection 僅 editor-local identity，不寫 canonical spec/history/storage。
2. plain/Shift click、marquee replace/Shift toggle 去重、current-slide/component-only 與 input ownership；0/1/>1 lifecycle、單選 Moveable 回接、duplicate toggle 邊界。
3. 多選 export clone 清理與 live state preservation、offline reopen 空 selection；Selecto class ID 對應 style 的 bounded 修復是否精確保留無關 styles。
4. mounted fixture 改成 vendor 真實 class 形狀；browser fixture 改用 rendered canonical spec，是否仍有有效 before/after canonical assertions。
5. marquee payload read／whole DeckSpec serialization 0，沒有新增多選 mutation、history 或第二份 canonical authority。

## Evidence 與 fresh verification

- `evidence/edx-wp1-s8/final-source-hashes.json`：20 sources、4 protected、最終 ZIP；自行比對實檔。
- `export-style-focused.log`：172/172；`final-nonbrowser.log`：377/377。命令見 Mainline receipt；full non-browser 選 `tests/*.test.mjs` 排除下列四支真正 browser-backed PGQ。
- `canonical-fixture-host-recheck/selection/acceptance.json`：1280×720、1600×900 各 15 checks（10 base + 5 S8 aggregated），所有 errors／remote 0、targetClosed=true；相關 HTML artifacts SHA 可重算。
- `canonical-fixture-host-recheck/affected-pgq.log`：`pgq-wp4-s3-content-integrity`、`pgq-wp4-s3-sample-approval`、`pgq-wp4-s4-full-deck-qa`、`pgq-wp4-s4-required-visibility` 四檔使用 `--test-concurrency=1`，fresh 16/16 named PASS。
- `canonical-fixture-host-recheck/controller-receipt.json`：正式 host、readiness／Browser.close／managed cleanup 全 PASS。
- `export-style-distribution-lifecycle.json`：fresh lifecycle PASS；Gemini CLI missing 僅 host capability partial。
- ZIP：`dist/PPTSKILL-0.1.0.zip`，2,280,185 bytes；SHA-256 `f81efc729f17257a36802faa94c186742a07596dc7f36e90b75de6edab5e89c5`。
- `git diff --check 9188b787ad964b92a129a5cff8f7067b08c0f4ea fd7fc9ae2c94d393d570550bf4292972910d3160`。

Browser evidence 可獨立核對，不必機械重跑。若沒有 managed host attachment，清楚標記「已提交 evidence 核對」，不能宣稱 fresh browser rerun，也不能 unset CODEX_SANDBOX／裸啟 Chrome。歷史兩次 FAIL 均保留：第一輪產品 style 殘留、第二輪 pre-action fixture baseline mismatch，之後第三輪才 PASS。

回覆 reviewed SHA、P0–P3、fresh tests 與 evidence-only 項目、source/ZIP/protected hashes、GO／NO-GO。GO 後回 Mainline closure；本候選尚未 closure，沒有授權整合／push／deploy。
