# S4-PERF Mainline review handoff

## Root question／current state

pointer stale guard能否避免whole-DeckSpec serialization，同時保留semantic mutation、readonly/export、cancel與portable契約？本輪已完成Mainline驗收，停在REVIEW CANDIDATE，Independent Review pending。

Branch `codex/edx-wp1-s4-perf`，review base `5ae8bb806cef7a3b11916daabb4b7b8bcc3ebece`（S4 GO closure）。本文件首次加入的commit為本輪candidate；review前先鎖SHA。S4 reviewed code `05295d3` 已獨立GO，原新增P2在本卡處理，S3 motion P2保留。

## Scope／fork

讀 `tasks/edx-wp1-s4-perf-bounded-revision.md`、`evidence/edx-wp1-s4-perf/mainline-receipt.md` 及task指定規則。CodeGraph→bounded rg，review diff相對base。

核心2檔：component-interaction.js resolver只讀getRevision；deck-editor.js在成功canonical語意改變時更新local counter，cold comparison不入pointer。補legacy noop/invalid patch原子性；async image optimizer await後依captured stable identity重找live component，避免export换spec後寫detached object。無新schema/operation/dependency/authority/history，多選/motion不在範圍。

## Evidence／重現

從 `<repo-root>`：

```sh
shasum -a 256 -c evidence/edx-wp1-s4-perf/verification-source.sha256
node --test tests/edx-wp1-s4-*.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs
node tools/edx-wp1-s4-perf-probe.mjs <new-evidence-dir>/mounted.json
```

- focused45/45，non-browser245具名cases全覆蓋PASS。Worker221＋主線補ZIP24，原始222/51摘要有filter後empty-file PASS，不可相加；nonbrowser-coverage.json明列case名及分工。
- source8/8前後一致。正式RED每20updates讀payload/序列化40次，after的1/6/12MiB各101updates均0。mounted DOM/vendor為double，不等於browser FPS；baseline/after timing範圍不同不可當倍率。
- `mainline-browser/acceptance.json` fresh Chrome：1280×720/1600×900，17項original S4 real pointer與新增stale/readonly/asset檢查全PASS；console/page/network/HTTP/remote全0。視覺證據1280-selected.png。
- 真browser重驗：自行建立新的受管owned Chrome，export `PPTSKILL_DEVTOOLS_ACTIVE_PORT`，執行 `node tools/edx-wp1-s4-browser-acceptance.mjs <new-evidence-dir> --perf-regression`。工具attach-only且自行關owned target；舊profile已清不可重用。
- ZIP 2,249,243 bytes，SHA `eca0af886794934f3d862a9ad0e140226b693e007c361dfc2218fda9ac4dde85`；distribution lifecycle/smoke PASS，Gemini CLI未裝，host capability partial。
- PGQ-WP4 authority/geometry/vendor未改，沿用S4 GO的28unique證據，本卡未fresh重跑，不可改寫成fresh PASS。

## Blocker／waiting conditions

無未解實作blocker；等待獨立review。來源與ZIP是新candidate，不使用S4 GO冒充本卡GO。仍存在的cold commit/export資料成本不在hot-path改善宣稱內。

## Next step／limits

Owner交獨立review，回報reviewed SHA、severity與可重現證據；Mainline再裁決follow-up closure。無merge/push/deploy，不開S5。owned browser清理PASS，4原untracked hashes保持。只可唯讀review，不修改candidate；不得順手修S3 motion。
