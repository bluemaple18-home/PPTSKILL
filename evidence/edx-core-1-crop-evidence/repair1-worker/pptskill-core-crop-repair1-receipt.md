# 核心1/6 Crop Repair1 Worker 交回

**已停止 repo write。** 2026-09-24；基準產品 b364cd8923dcb6382e7a60432c7849dc5071af30。同一卡、同一固定canonical契約；交Mainline接續full／ZIP／正式host＋PGQ／原Reviewer targeted複審。

Repo：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical

## 實際修改（6個既有檔；無新增repo檔）
- runtime/crop-hash-vendor.js
- runtime/deck-editor.js
- runtime/image-crop.js
- tests/edx-core-crop-ui.test.mjs
- tests/edx-core-crop.test.mjs
- tools/edx-core-crop-browser-cases.mjs

source-hashes.json：/private/tmp/pptskill-core-crop-repair1-source-hashes.json。未修改package／schema／dependency／vendor raw bundle或metadata／control／evidence／S18／AI Core／protected／dist；原先Mainline的task/routing變更保留。未install、commit、push、merge。

## 五項修補與副作用回復

- F1：pagehide清理既有owned投影，persisted pageshow從canonical重建CSS與observer/load；fresh synthetic事件測試含後續resize/load與S18刪除。這不是實際BFCache命中證據。
- F2：raw applyLocalPatch→replaceComponent先暫置新node；成功前不clear selection/dialog、不永久释放舊ownership。新投影render／observe失敗，清半建observer/listener，換回原node及原位置/style。舊ownership在新投影成功後才清；舊teardown本身style throw亦由checkpoint＋原style attributes回復ownership。canonical/revision沿原patch catch回退。fresh tests覆蓋新observe、新style、舊teardown throw、selection/dialog、CSS priority及後續S18。
- F3：checkpoint保存既有record及committed projection；rollback reconcile observer/listener。sync先render＋建立observer/listener才發布candidate snapshot；半建record未發布。reset成功sync後refresh throw能恢復observer與load/error，後續resize不能回放failed candidate。observe/addEventListener部分成功再throw亦清理。仍使用既有Map ownership，沒有新registry/FSM/controller。
- F4：完整noble MIT採獨立application/json script；JSON編碼後escape小於號。正常render有授權，portable boot必要時補回，export/reopen保存。build helper核對license SHA256。metadata.bundleBytes/SHA仍只指原始4903-byte vendor bundle；測試直接讀raw bytes驗證，並逐一還原render/export/reopen license比對全文與hash。單一executable runtime-script介面不變。
- F5：結果frame縮入既有170px預覽stage，保持選定target frame比例。純幾何render用縮放後精確尺寸，避免clientWidth取整改變cover範圍；observer只對stage/target尺寸更新。原圖完整preview與Evidenceoverlay保留，不變更digest/schema。fresh mounted測試比較portrait/landscape的實際CSS可見source範圍與commit預期；不是browser像素證據。

## Fresh驗證

- focused：27/27 PASS（3 files），/private/tmp/pptskill-core-crop-repair1-focused-final.log。
- scoped：339/339 PASS（指定17 files），/private/tmp/pptskill-core-crop-repair1-scoped-final.log。含focused，兩者不可相加當唯一case總数。
- 比原19/331增加8個Repair1測試。中途26/338也是PASS；最後增加同一F2舊ownership teardown style throw，成為27/339，沒有擴到其他scope。
- 原Reviewer九組adversarial probes復驗：同一注入方式；副本只改輸出位置與四項缺陷的預期結果為修復後條件，其他安全／legacy／成本檢查保留。9/9 FIX_VERIFIED_OR_CHECKED，0 PROBE_ERROR：/private/tmp/pptskill-core-crop-repair1-recheck-final.log；可重播副本 /private/tmp/pptskill-core-crop-repair1-recheck/adversarial.mjs。
- 原preview-probe硬編330×170，是舊設計負例，原始重現保留；修後使用實際mounted UI CSS測試F5及新增browser preview-vs-final cases，不將純math負例改稱production proof。
- node --check：runtime/image-crop.js、runtime/deck-editor.js、runtime/crop-hash-vendor.js、tools/edx-core-crop-browser-cases.mjs PASS。
- 19個產生的page expression只做vm.Script語法檢查：/private/tmp/pptskill-core-crop-repair1-browser-expression-syntax.log；未啟動browser。
- git diff --check -- runtime tests tools PASS。

## 重播命令

所有命令cwd均為上列repo。精確argv亦存於focused-argv.json、scoped-argv.json。

```sh
node --test --test-concurrency=1 tests/edx-core-crop.test.mjs tests/edx-core-crop-ui.test.mjs tests/edx-core-crop-fixture.test.mjs
node --test --test-concurrency=1 tests/edx-core-crop-fixture.test.mjs tests/edx-core-crop-ui.test.mjs tests/edx-core-crop.test.mjs tests/edx-wp2-s4-replace-asset.test.mjs tests/edx-wp1-s2-stable-identity-operation-path.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs tests/edx-wp2-s6-selected-image-ui.test.mjs tests/edx-wp2-s7-selected-image-fit.test.mjs tests/edx-wp2-s15-insert-text-ui.test.mjs tests/edx-wp2-s16-edit-text-ui.test.mjs tests/edx-wp2-s17-text-double-click.test.mjs tests/edx-wp2-s18-delete-element.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs tests/p0-r1-deck-spec.test.mjs tests/p0-r5-full-deck-renderer.test.mjs tests/p0-r7-editor-export.test.mjs
node /private/tmp/pptskill-core-crop-repair1-recheck/adversarial.mjs
node tools/edx-wp1-s4-browser-acceptance.mjs /private/tmp/pptskill-core-crop-repair1-fixture-final --crop-regression --fixture-only
```

## Browser交付／能力界線

fixture-only已產生 /private/tmp/pptskill-core-crop-repair1-fixture-final/source.html，605054 bytes；log：/private/tmp/pptskill-core-crop-repair1-fixture-final.log。fixture幾何位置未改，不引入新的重疊；補充案例重新navigate隔離fixture。

原26 records與原pixel assertions保留；追加portrait/landscape target-aspect的preview＋committed兩端screenshot pixel oracle與實際CSS可見source範圍比對、dialog開啟與actions截圖（沿既有1280×720／1600×900雙尺寸）、synthetic persisted、raw observe/reset refresh故障後resize/load像素與S18。新增synthetic lifecycle明標非真BFCache。上述cases只有語法／fixture檢查，**本Worker沒有跑browser**，新增records數與pixels數須由Mainline實跑取得。

主線沿既有managed attach入口使用 --crop-regression；例如：
```sh
PPTSKILL_DEVTOOLS_ACTIVE_PORT='<Mainline-owned DevToolsActivePort>' node tools/edx-wp1-s4-browser-acceptance.mjs '<Mainline output dir>' --crop-regression
```

沒有full／ZIP／browser／PGQ／Independent GO。修前host03 26records、705+710pixels、PGQ16僅歷史，不算修後。PNG以外decoder與真BFCache命中仍未驗。最終production/visual acceptance由Mainline與原Reviewer裁決；目前無未解failing test。

## RED與中間失敗歸因（全部保留）

1. red.log：24 tests，19 PASS／5 FAIL；F1投影遺失、F2換成candidate DOM、F3observer丟失、F4缺授權、F5固定dialog aspect，五項均實際重現。
2. original-red.log及preview-original-red.log：原Reviewer九組及F5硬編math負例重現，原probes副本在/private/tmp/pptskill-core-crop-repair1-original/；成功代表重現缺陷，非產品PASS。
3. focused-01.log：7 PASS／17 FAIL。初稿將JSON license script併進單一runtime-script回傳，舊mounted VM剝首尾script後遇到HTML標籤SyntaxError。修成markup獨立授權＋portable boot補回，保留單一executable script；沒有放寬VM或改perf-mounted。
4. focused-02.log：23 PASS／1 FAIL。F4測試regex未涵DOM序列化boolean attribute為空字串；改接受等價HTML属性序列化，完整license全文/hash assertions保留。
5. edit-fail.log：自有tmp批次修改script的巢狀template literal未escape，Node parse失敗（沒有執行任何repo mutation）；改以獨立字串檔讀入，browser source syntax通過。
6. focused-03/04＝26 PASS；focused-05/final＝27 PASS。scoped-01＝338 PASS；scoped-final＝339 PASS。沒有其他尚未歸因的產品FAIL。

## Log清單
- /private/tmp/pptskill-core-crop-repair1-browser-expression-syntax.log
- /private/tmp/pptskill-core-crop-repair1-edit-fail.log
- /private/tmp/pptskill-core-crop-repair1-fixture-final.log
- /private/tmp/pptskill-core-crop-repair1-fixture.log
- /private/tmp/pptskill-core-crop-repair1-focused-01.log
- /private/tmp/pptskill-core-crop-repair1-focused-02.log
- /private/tmp/pptskill-core-crop-repair1-focused-03.log
- /private/tmp/pptskill-core-crop-repair1-focused-04.log
- /private/tmp/pptskill-core-crop-repair1-focused-05.log
- /private/tmp/pptskill-core-crop-repair1-focused-final.log
- /private/tmp/pptskill-core-crop-repair1-original-red.log
- /private/tmp/pptskill-core-crop-repair1-preview-original-red.log
- /private/tmp/pptskill-core-crop-repair1-recheck-final.log
- /private/tmp/pptskill-core-crop-repair1-recheck.log
- /private/tmp/pptskill-core-crop-repair1-red.log
- /private/tmp/pptskill-core-crop-repair1-scoped-01.log
- /private/tmp/pptskill-core-crop-repair1-scoped-final.log
