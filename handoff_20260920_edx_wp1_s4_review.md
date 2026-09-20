# PPTSKILL Mainline — EDX-WP1-S4 review handoff

## Root question

單一 component 的真 pointer drag／右下 resize，能否只透過 S3 operation 保存 canonical geometry，且 preview／cancel／export／offline reopen 不另建 layout truth？

## Current state

REVIEW CANDIDATE，Independent Review pending。branch `codex/edx-wp1-s4`；review base `20b54ac64c99682a20c0af1a71ceb7b4fa6de406`。本文件首次加入的 commit 為本輪 candidate；開始 review 先鎖定 SHA。`main` 仍為 `b43def29751fa8d964a5fa59d90c77df1fadc729`，沒有 merge／push／deploy。

先讀 `AGENTS.md`（若 repo 無檔，使用 Owner 提供的 bootstrap）、`tasks/edx-wp1-s4-single-component-interaction.md`、指定規則與 `evidence/edx-wp1-s4/mainline-receipt.md`。只 review S4 對 base 的差異，不修改 candidate。

## Scope／candidate fork

- Moveable0.53.0 single component drag／SE resize；legacy 需明示套用預設手動位置尺寸；一 gesture 至多一次既有 operation。
- selection/preview不寫spec；cancel/stale/invalid原子復原；export清掉handles、selection與精確vendor styles；離線重開仍可編輯。
- Selecto僅存在Moveable上游unused install/lock closure；正式esbuild16 inputs中Selecto/Floating UI為0。沒有多選、snap、history、AI bridge。S3 motion transform P2不在本卡修復。
- croact pinned package缺獨立LICENSE：保留實際source notice/hash並明示標準MIT permission來源；css-styled兩個package取官方repo pinned LICENSE。詳vendor metadata與worker receipt。

## Evidence／重現

從 `<repo-root>` 執行：

```sh
shasum -a 256 -c evidence/edx-wp1-s4/verification-source.sha256
node --test tests/edx-wp1-s4-*.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs
```

- focused25/25、compatibility53/53、non-browser225/225 PASS；清單與logs在 `evidence/edx-wp1-s4/`。
- `browser-attempt-1/acceptance.json`：1280×720與1600×900，真pointer drag/SE resize、Escape/no-op/invalid、preview export、offline reopen再drag、文字模式互斥PASS，console/page/network/HTTP/remote requests全0。
- `geometry-static.json`／`geometry-normal.json` 對最終真匯出 `browser-attempt-1/1600-reopen-export.html` 驗證，兩viewport全部gates PASS；截圖含 `browser-attempt-1/1280-selected.png`、`geometry-static.png`。
- PGQ首輪 `pgq-browser.log` 26/28：owned Chrome被resource scan limit中止，最後2個case失敗。來源不變、新owned profile只重驗受影響case，`pgq-browser-retry1.log` 3/3 PASS（pattern另匹配一個已通過coverage case）。因此28 unique cases已覆蓋，不是單輪28/28。中止與cleanup evidence均保留。
- ZIP `dist/PPTSKILL-0.1.0.zip`：2,248,891 bytes，SHA-256 `4aa7fa8a683b57b49a1d6a3ad2ea87b77f0312f1731b724abfb240d9ac47402c`；distribution lifecycle/smoke PASS。Gemini CLI缺席，不能聲稱該host已實測。

Fresh browser重驗需自行建立受管owned Chrome並設定 `PPTSKILL_DEVTOOLS_ACTIVE_PORT`；本輪profiles均已清理，不能重用evidence裡的舊port。保留原lifecycle限制，勿用其他使用者browser。範例：

```sh
node tools/edx-wp1-s4-browser-acceptance.mjs <new-evidence-dir>
node tools/browser-geometry-qa.mjs <new-evidence-dir>/1600-reopen-export.html --motion static --output <new-evidence-dir>/geometry-static.json
node tools/browser-geometry-qa.mjs <new-evidence-dir>/1600-reopen-export.html --motion normal --output <new-evidence-dir>/geometry-normal.json
node --test --test-concurrency=1 tests/pgq-wp4-s*.test.mjs
```

## Blocker／waiting conditions

無未解實作blocker；等待獨立review verdict。環境掃描中止已以相同來源bounded retry確認通過，不更動lifecycle規則。不得把主線candidate自行升為Independent GO。

## Next step／limits

Owner交Claude Code／Gemini獨立review，回報reviewed SHA、P0/P1/P2/P3與可重現證據。Mainline收到後裁決bounded repair或closure；不自動merge／push／deploy、不開S5。四個既有untracked `.DS_Store`、`CLAUDE.md`、`HANDOFF-20260914-P0-R11-R1-S3.md`、`HANDOFF-20260914-PGQ-WP1.md` 均保留，hash baseline見receipt目錄。
