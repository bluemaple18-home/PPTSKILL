# WP2-S11 Independent Review Handoff

Status: INDEPENDENT_REVIEW_PENDING
Reviewed candidate：`8b0be659ea400862456f4ce0db5a0526d0623ce8`
Runtime product：`1fdb3c275f9e174b7c8d506207c42c758aedb71a`
Diff base：`da6c1229c02b5c0956f5ef6725be5e9216d98acd`（S10已Independent GO closure）
Branch：`codex/edx-wp2-s11-image-drop`
Main/origin-main：`d0b9aa05c50b09596920705bbbf4dd632c9137d4`；S10/S11尚未merge/push/deploy。
Repo：`<repo-root>` = PPTSKILL-canonical；跨機使用此root＋相對路徑。

## 任務

唯讀獨立review S11 file-drop產品與修訂的驗收證據；回GO/NO-GO、P0–P3、reviewed完整SHA。不要修改candidate／ZIP／protected4，不merge/push/deploy，不開S12。這是正式candidate，不沿用舊checkpoint的未完成判定；所有歷史FAIL仍需核對。

先讀tasks/edx-wp2-s11-image-drop.md、tasks/edx-wp2-s11-host-acceptance.md、evidence/edx-wp2-s11/split-acceptance-decision.md與receipt.md。核對source-hashes.json、host-final-verification.json、controller-receipt.json與原始acceptance.json／pgq.log。Candidate後的handoff commit只許control/evidence，runtime/tests/tools/ZIP不得漂移。

## 產品審查範圍

四個source：runtime/deck-editor.js、tests/edx-wp2-s11-image-drop.test.mjs、tools/edx-wp2-s11-browser-cases.mjs、tools/edx-wp1-s4-browser-acceptance.mjs。

特別核對：connected event slide identity／mode guards、dragover zero byte-read／serialization、single-file／unsupported optimizer reject、S10共用ID/defaults、active preview cancel不commit、S6/S10 chooser/busy互斥、S9 async captured target與latest other edits、failure no ID占用／partial commit、export/offline remount listener與old-root preservation。S8/S9 authority／schema／deps／20MiB gate未改。

## 可重現驗證與證據分層

Fresh targeted（本輪Mainline154/154）：
```sh
node --test tests/edx-wp2-s11-image-drop.test.mjs tests/edx-wp2-s10-insert-image-ui.test.mjs tests/edx-wp2-s9-insert-image-file.test.mjs tests/edx-wp2-s6-selected-image-ui.test.mjs tests/edx-wp2-s7-selected-image-fit.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs
```
Full non-browser 68個檔案明列evidence/edx-wp2-s11/nonbrowser-files.txt，既有646/646具名PASS；請照此selection，不用glob混入browser/ZIP。可用：
```sh
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {spawnSync} from 'node:child_process'; const files=readFileSync('evidence/edx-wp2-s11/nonbrowser-files.txt','utf8').trim().split(/\r?\n/); process.exit(spawnSync(process.execPath,['--test',...files],{stdio:'inherit'}).status??1);"
git diff --check
```

Mainline fresh正式browser：host-split-acceptance/image-drop/acceptance.json，兩viewport各59 records（10base＋13S10＋36S11），errors/remote0、targetClosed；PGQ同host單輪16/16，cleanup全部PASS。Reviewer若無正式managed attachment，只核對committed evidence並明示沒有fresh browser rerun，不裸啟Chrome。

Owner明示的新驗收組合：每viewport8筆trusted CDP drop（7成功／1optimizer拒絕），另2筆真CDP pointer＋**synthetic** DOM drop驗active cancellation、snap=false/true。必須核對beforePointerRelease gesturing=false、isTrusted=false、optimizer1、canonical quote未commit。不能把這2筆算native，也不能把6筆native未投遞negative當已觀測drop guard；其guard另有synthetic紀錄。這解決harness ownership衝突的證據方法，沒有改runtime、移除cancellation要求或用直接API替代positive。

ZIP：`dist/PPTSKILL-0.1.0.zip`，2,294,654 bytes，SHA256 `75901fa7a4e32e5c6a4bba84e246772b409a244b5fb0d6743a33b5ce3d4f89a8`；fresh lifecycle為本卡早期已提交證據，本輪harness-only不重建。Source4/protected4/ZIP前後MATCH。Worker192/full646與本輪fresh154不可相加或混稱fresh。

## 歷史／已知限制

host-acceptance、host-retry-1、host-retry-2的FAIL／event arrays／raw gzip／cleanup都保留。原失敗prefix不能當完整PASS；新split測完後續async/busy/chooser/negative/export。Chromium master的來源結論及適用限制見decision，勿擴張成所有版本定律。S8 I/O根因未知、S10 chooser synthetic lifecycle／非人工OS dialog沿用。

4張新截圖已Mainline實看；新image／toolbar可見。asset-other既有title裁切與固定插入圖可能重疊屬保留fixture，並非整頁排版驗收；1280drop圖及source在前三輪與本輪hash一致。若判定具體產品regression，請附最小重現與來源，不以未知環境推定。

## 回報

GO/NO-GO、reviewedSHA、P0/P1/P2/P3；逐finding位置／觸發／影響／bounded修法。列Reviewer-fresh與committed-evidence核對，保持所有邊界。GO後交Mainline closure；此handoff不預先宣稱GO。
