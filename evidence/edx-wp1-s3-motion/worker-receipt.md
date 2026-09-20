# EDX-WP1-S3-MOTION Worker receipt

狀態：FROZEN，delivery／browser tool 停止寫入，交 Mainline 驗收。尚非完整驗收 GO。

Source HEAD：a0f5f6fe35b9afee56d285033c484cab8c4b7093；指定 base a5e5d43；HEAD 僅多開卡提交。逐檔及 source-set SHA256 見 worker-source-hashes.json；本次未 commit。

## 修改

- runtime/component-geometry.js
- runtime/deck-editor.js
- tests/edx-wp1-s3-motion.test.mjs
- tests/edx-wp1-s4-managed-browser-attach.test.mjs
- tools/edx-wp1-s3-motion-browser-cases.mjs
- tools/edx-wp1-s4-browser-acceptance.mjs
- tools/edx-wp1-s4-perf-mounted.mjs

geometry 不再輸出 transform/translate/rotate/scale suppression。既有 canonical marker 下僅清除舊 none!important；保留其他 inline style／priority。preview/cancel/commit/export clone 共用 projector；renderer 及 browser renderComponentMarkup 共用 componentGeometryStyle。perf DOM 替身補足 declaration API 與 clone 的 style attribute 同步。沒有修改 motion canonical、schema 或 vendor。

CodeGraph source query 未命中 geometry，依授權限域 rg。四個原 untracked 保留；未啟 browser、未 build dist、未安裝、未 commit/merge/push/deploy、未開 agent。

## 已跑

- RED：node --test tests/edx-wp1-s3-motion.test.mjs；初始三個案例 FAIL，見 worker-red.log。
- 最後 focused：node --test tests/edx-wp1-s3-motion.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs tests/edx-wp1-s4*.test.mjs tests/p0-vq1-motion-baseline.test.mjs tests/p0-vq3-s3-motion-effects.test.mjs；60/60 PASS，見 worker-focused.log（取代較早 57/57）。
- attach failure-path：node --test tests/edx-wp1-s4-managed-browser-attach.test.mjs；4/4 PASS，見 worker-attach.log，亦納入最後 focused。
- PGQ 非 browser 子集：node --test --test-skip-pattern='installed|fresh ZIP' tests/pgq-wp3-s1-motion-numberflow.test.mjs tests/pgq-wp3-s2-e-sweep-text-entrance.test.mjs tests/pgq-wp3-s3-background-effects.test.mjs；15/15 PASS，見 worker-pgq-nonbrowser.log。
- git diff --check：PASS。Node v25.9.0；pnpm 10.28.2。
- 中斷後 focused log 已有完整 60/60 結尾。沒有已知尚在跑的工具 session；ps 被 sandbox 拒絕，未以廣泛 kill 干擾主線程序。

## Mainline 待辦／重現

完整 non-browser、真 browser、PGQ browser、fresh ZIP/lifecycle 尚未跑，由 Mainline 接手。

先設定 PPTSKILL_DEVTOOLS_ACTIVE_PORT 為主線 owned Chrome 的 DevToolsActivePort，再執行：

    node tools/edx-wp1-s4-browser-acceptance.mjs evidence/edx-wp1-s3-motion/mainline-browser --motion-regression

工具先執行既有 S4 real-pointer，再驗三 treatment × 兩 viewport × normal/reduced/static：public move/resize、舊 suppression 清理、inline style 保留、normal 非 identity 起點／canonical 終點、preview export、Escape cancel、pointer commit、export/reopen。listeners 先於 navigate；finally 僅關自己的 target。browser 尚未實跑，工具 ready 不等於驗收 PASS。

完整 non-browser 選檔與排除案清單：worker-nonbrowser-selection.json。可執行 node evidence/edx-wp1-s3-motion/worker-run-nonbrowser.mjs；Worker 僅執行 --manifest-only，未跑全套。exact skip pattern：installed|fresh ZIP|^ZIP install；另整檔排除 distribution 與四個必需 browser producer 的 PGQ 測試，清單逐案列於 JSON。

本次 PGQ 子集省略的三個 ZIP case：
- installed plan-new 與 render-new 穿透 motion；legacy request 維持 null
- browser contract 與 installed plan-new 使用同一 sanitizer/capability truth；legacy 維持 null
- fresh ZIP installed plan-new/render-new 使用同一 truth，且低於 20 MiB

PGQ browser 建議重現（由主線既有受管流程提供上述 port）：

    node --test tests/pgq-wp4-s3-content-integrity.test.mjs tests/pgq-wp4-s3-sample-approval.test.mjs tests/pgq-wp4-s4-required-visibility.test.mjs tests/pgq-wp4-s4-full-deck-qa.test.mjs

相關 motion compatibility 可用當前 producer：tools/build-pgq-wp3-s1-fixture.mjs、tools/build-pgq-wp3-s2-fixture.mjs 的 --output 指向本卡 evidence，再用 node tools/browser-geometry-qa.mjs <fresh-html> --motion normal|reduce|static --output <receipt.json> 分別實跑。完整 ZIP/lifecycle 由主線既定指令執行。

## 風險／限制

三 treatment browser fixture 只在 renderer 輸出的 component opening tag 替換既有 effect token，沒有改 motion CSS；restrained-fade-rise 預設屬 supportingCopy，此 fixture 是 geometry seam probe，不能宣稱自然 Style routing 已全部覆蓋。CSSOM 字串一致化保留所有 declaration、priority 與順序，避免新的逐項 style API 造成字串格式假失敗。

無關 inline transform 保留；legacy 辨識限 canonical marker 與 none!important，該完全相同值無法區分舊 geometry 與人手寫入。尚待真瀏覽器確認幾何及三 treatment，失敗不得以 Node PASS 替代。收到停止後沒有再改 producer 或啟新測試；本 receipt／hash 為最後寫入。
