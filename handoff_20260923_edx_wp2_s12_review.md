# WP2-S12 Independent Review Handoff

Status: INDEPENDENT_REVIEW_PENDING
Reviewed candidate：`09c7d29253a5235b12ac58b5fef3f13cd5c70acb`
Diff base：`8b9ee5bceb1ab6d762f3f370f95f9f248943e446`（S10/S11已GO、已push main）
Branch：codex/edx-wp2-s12-image-paste
Repo：`<repo-root>` = PPTSKILL-canonical。

## 唯讀審查任務

先讀tasks/edx-wp2-s12-image-paste.md、host-acceptance卡與evidence/edx-wp2-s12/receipt.md。四個source在source-hashes.json；比candidate→handoff必須runtime/tests/tools/ZIP無drift，protected4不動。不要改candidate、ZIP或既有untracked；不要merge/push/deploy或開S13。

核心：pasteInputOwned/editable繼承、target/active ownership、IME/defaultPrevented；scope/body/currentID/cross/duplicate/connected；不getData或讀OSclipboard；FileList唯一來源；busy/chooser與drop互斥；gesturecancel不commit；S9捕捉identity與latest其他state；failure零partial/ID占用；export/offline/reparse/remount/oldroots。

## 可重現

本卡full69檔明列、Mainlinefresh 712 named PASS：
```sh
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {spawnSync} from 'node:child_process'; const files=readFileSync('evidence/edx-wp2-s12/nonbrowser-files.txt','utf8').trim().split(/\r?\n/); process.exit(spawnSync(process.execPath,['--test',...files],{stdio:'inherit'}).status??1);"
```
Worker scoped236（含S12 final66）；可重播精確九檔：
```sh
node --test tests/edx-wp2-s12-image-paste.test.mjs tests/edx-wp2-s11-image-drop.test.mjs tests/edx-wp2-s10-insert-image-ui.test.mjs tests/edx-wp2-s9-insert-image-file.test.mjs tests/edx-wp2-s6-selected-image-ui.test.mjs tests/edx-wp2-s7-selected-image-fit.test.mjs tests/edx-wp2-s1-direct-text-edit.test.mjs tests/edx-wp1-s5-keyboard.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs
git diff --check
```

ZIP：2,295,103 bytes，SHA256 `96daa683bb24ffe300a14c7a2cc63ec99dc27ec9d80ad0c4e26b050eff534eb7`；source4/protected4/ZIP前後MATCH，archive runtime byte-match。Mainlinefresh build/probe lifecycle有receipt，禁止為review任意重建改掉ZIP。

## Browser／PGQ證據

Mainlinefresh正式host：1280×720：111 records、1600×900：111 records PASS。host-acceptance/image-paste/acceptance.json完整arrays／exports／screens，host-final-verification.json逐record檢核。PGQ單輪16/16，rawlog／unique names與managed cleanup全PASS。

所有S12paste入口是 **synthetic ClipboardEvent + 真DataTransfer/File/optimizer**，isTrusted=false；本卡開卡前明示只驗事件adapter，沒有OSclipboard／Cmd/Ctrl+V驗收，也未讀寫Owner系統clipboard。S11另有真正trusted drop；S10另有CDPchooser，不能混算到S12。若Reviewer無managedattachment，核對committed evidence並明示未fresh browser/PGQ，不裸開Chrome。

snap=false/true：真CDP pointer建立preview、canonical不變，synthetic paste立刻取消，mouse release後舊geometry不commit。unsupported file的optimizer拒絕與text/HTML/URI未讀、input/IME預設保留要獨立核對。fixture固定位置允許既有內容重疊，不是auto-layout或crop品質驗收。

## 失敗與限制

Worker RED34/59、中間GREEN57/59兩個fixture前置失敗、後GREEN59與增補到66原始log全部保留。不得把fixture前置改動當runtime修復或隱藏FAIL。S11混合CDP歷史FAIL、S8 I/O根因未知、S10 chooser synthetic lifecycle界線沿舊receipt保留。四個protected untracked均原hash。詳visual-check.md的實際截圖結論，不擴張成整頁視覺PASS。

## 回報

GO/NO-GO；reviewed完整SHA；P0/P1/P2/P3；finding位置/重現/影響/最小修法。區分Reviewer-fresh與committed evidence，清楚保留OSclipboard未驗邊界。GO後交Mainline closure，本handoff不預先宣稱GO。
