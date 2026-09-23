# WP2-S15 Independent Review Handoff

Status: INDEPENDENT_REVIEW_PENDING
Candidate: `a181982396eb4f282574f70b93a6c4ef2cfa9c62`
Base: `8dcc3a0db58df98e58f717e106d12c2cf1bb7d42`
Branch: codex/edx-wp2-s15-insert-text-ui
Repo: `<repo-root>` = PPTSKILL-canonical

唯讀讀task/host卡、evidence/edx-wp2-s15/receipt.md、source-hashes.json與mainline-check.md。Candidate→handoff只准control/evidence，runtime/tests/tools/ZIP不得drift。禁止改candidate/ZIP/protected4、merge/push/deploy／開S16。給完整SHA、P0–P3、GO或bounded finding，fresh和committed evidence分開。

## 重點

UI submit只走S13 insert-element，文字精確值／1–500 codepoints／escape；first-free ID從submit時canonical找，不新增counter/registry。Dialog捕捉slide/root，切頁/模式/selection/removed/rebuilt/duplicate失效；showModal失敗回收、重入submit、cancel／invalid無partial。IME keydown保留default，dialog cancel guard阻止組字中關閉。S6/S10 chooser互斥，原gesture preview不commit。Export不含dialog/draft/chrome，offline可再UIinsert／S14APIedit／move/resize。仍非component direct contenteditable。

## Fresh可重現

```sh
node --test tests/edx-wp2-s15-insert-text-ui.test.mjs tests/edx-wp2-s14-edit-text-component.test.mjs tests/edx-wp2-s13-insert-text.test.mjs tests/edx-wp2-s10-insert-image-ui.test.mjs tests/edx-wp2-s6-selected-image-ui.test.mjs tests/edx-wp2-s1-direct-text-edit.test.mjs tests/edx-wp1-s8-vendor.test.mjs tests/edx-wp1-s8-selection.test.mjs tests/edx-wp1-s8-mounted-selection.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs tests/edx-wp1-s7-cancel-click.test.mjs tests/edx-wp2-s12-image-paste.test.mjs
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {spawnSync} from 'node:child_process'; const files=readFileSync('evidence/edx-wp2-s15/nonbrowser-files.txt','utf8').trim().split(/\r?\n/); process.exit(spawnSync(process.execPath,['--test',...files],{stdio:'inherit'}).status??1);"
git diff --check
```

原Worker scoped149，repair1原scoped＋affected252；Mainline full789。ZIP 2,297,769 bytes／SHA256 `98a46007088d1a076f5cea6cacec4b1bc5812ad30f855bc0072a9a4b832ca239`。Source6/protected4 MATCH。不要為review重建ZIP；distribution lifecycle與runtime byte-match已有receipt。

## Browser／PGQ

Mainline正式host雙viewport 48／48 records，各base10＋S15，errors0、targetClosed；PGQ單輪16；cleanup全PASS。host-final-verification.json綁checks/artifact hashes。兩viewport toolbar/dialog截圖已實檢；詳visual-check.md。無managed attachment時可核對committed evidence但必須明示非fresh，禁裸開Chrome/unset sandbox或改AI Core。Synthetic IME/stale/fault/chooser cancel與trusted UI evidence分清楚。

Worker0/22 RED、兩輪144/145、IME25/26及Mainline全量782/789都保留。7fail repair詳receipt，不弱化原assertions。須核對host-triage.md：首輪1280在29records後因collision fixture x40被safeInset80拒絕；第二輪在46records後resize width511≠512；第三輪整數screen-pixel輸入加trusted實收delta證據後48+48 PASS。兩次僅修harness，runtime/tests/ZIP自274183c不變；不把retry洗成一次全綠，也不回填未觀測的首輪pointer delta。Independent GO後回Mainline closure；目前未merge/push/deploy、未開S16。
