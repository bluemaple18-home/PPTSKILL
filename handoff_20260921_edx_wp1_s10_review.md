# S10 Independent Review Handoff

結案更新（2026-09-22）：**Independent Review GO / S10 COMPLETE**；verdict 見 `evidence/edx-wp1-s10/independent-review.md`。以下保留原 review 委託與證據範圍。

你是 PPTSKILL 獨立 Reviewer。請唯讀審查 S10 bounded multi-selection distribution，回覆 reviewed SHA、GO／NO-GO、P0–P3 findings、具體重現證據與限制。不得修改 candidate、ZIP、四個 protected untracked，不 merge／push／deploy，不開 S11。

- Repo：`<repo-root>` = `PPTSKILL-canonical`。
- Branch：`codex/edx-wp1-s10-distribute-selection`。
- **Product SHA：`902671238980941b321179a4df37e4d867733f14`**。
- Base：`cbe12a62a749d1c7cca67e3acb8de1b832995924`（S9 closure）。
- Host evidence commit：`70caf4e1b385502e354b38d022539053f3880aef`；其後 handoff/receipt commit 只應包含 control docs。
- Task：`tasks/edx-wp1-s10-distribute-selection.md`。
- Mainline receipt：`evidence/edx-wp1-s10/mainline-receipt.md`。
- Host final receipt：`evidence/edx-wp1-s10/host-final-receipt.md`。

先核對 worktree、適用 AGENTS、Product SHA 與 source hashes；source decision 前 CodeGraph，無命中才 bounded `rg`。範圍只含 S10 及直接受影響的 selection／operation／geometry／export seam，不重審已關閉的 S3–S9，也不把 AI Core 修復重新當產品功能 review。

## 審查重點

1. `distribute-selection` 僅接受同頁 3+ unique stable component identities；`horizontal-centers` / `vertical-centers` 依 canonical centers 排序，同中心以 **stable element identity** tie-break，頭尾 box 完全不動，中間用 deterministic `Math.round` 投影。
2. Canonical authority 只能是 `composition.geometryOverrides`。確認沒有 DOM rect truth、missing geometry auto-init、第二套 geometry/state model 或新 dependency。
3. 所有 next boxes 必須先驗證後一次 atomic commit；missing/foreign/duplicate/<3/extra-field/invalid distribution/safe-area failure 不能部分寫入。Canonical no-op 不應造成 semantic mutation。
4. Contextual UI：2-selection 只能 align；3+ 才顯示 distribute。成功／失敗均保留 live selection；export clone/offline reopen 不洩漏 contextual toolbar、selection marker 或 editor chrome。
5. S9 align、S8 selection、S7 snap、S5 keyboard、portable runtime / ZIP 不回歸；equal-gap、group transform、history、WP2 都不應被偷偷帶入。

## Mainline evidence

- Fresh focused：**198/198 PASS**；full non-browser：**403/403 PASS**。Reviewer 請自行 fresh 跑適當 subset，不可把 Mainline 數字當獨立重驗。
- Browser evidence：`host-acceptance/distribution/acceptance.json`，1280×720、1600×900 各 **13 checks PASS**；errors/remote 全 0、targetClosed=true。這是 fresh browser run，但發生於 AI Core scan-window 修復前；產品來源 hashes 與修復後驗收一致。
- 修復後 affected PGQ：`repaired-host-pgq/affected-pgq.log`，四支串行 **單輪 16/16 named PASS**；controller readiness／PGQ／Browser.close／supervisor exit 0，owned root 回收。
- 歷史 FAIL 不得隱藏：先前 PGQ 因 scanner 100ms observation window 在 `123.794ms` 停損；AI Core `e155b3a` 調整 registered browser bounded observation window後獨立 review GO，容量／檔案數等 hard limits 未變。舊 FAIL evidence 仍在 `host-acceptance/`、`pgq-only-retry/`、`scan-diagnostic-observation/`。
- `host-final-verification.json`：source 11/11、protected 4/4 MATCH。ZIP **2,282,450 bytes**；SHA-256 `664bc72f696e21d1d5ca891506411c737ff7f114c891658d7d5670e8b06ebd64`。

```sh
node --test tests/edx-wp1-s10-*.test.mjs
node --test tests/edx-wp1-s3-*.test.mjs tests/edx-wp1-s4-*.test.mjs tests/edx-wp1-s5-*.test.mjs tests/edx-wp1-s7-*.test.mjs tests/edx-wp1-s8-*.test.mjs tests/edx-wp1-s9-*.test.mjs tests/edx-wp1-s10-*.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs
git diff --check cbe12a62a749d1c7cca67e3acb8de1b832995924 902671238980941b321179a4df37e4d867733f14
```

若 Reviewer 當前沒有合法 managed host browser，可 evidence-only 核對已提交 browser／PGQ artifacts，但必須明示哪些是 fresh verification、哪些只是 committed evidence review；不得 unset `CODEX_SANDBOX` 或裸啟 Chrome。

原 handoff 不自動 closure；現已由獨立 GO 與 Mainline 結案更新為 COMPLETE。未 merge／push／deploy，未開 S11。
