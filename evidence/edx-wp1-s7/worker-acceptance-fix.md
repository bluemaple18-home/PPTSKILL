# S7 首次 snap SE handle 驗收修復 receipt

狀態：修復 candidate 已 FREEZE；待 Mainline fresh browser 獨立重驗。此文件接續 worker-receipt.md，不宣稱 production PASS。

## 原始失敗與界線

唯讀輸入：mainline-browser/acceptance.json。1280×720 已通過63 checks；首個 snap on resize positive 得到 (803,283,637,477)，要求 (803,283,645,485)。console/page/network/HTTP/remote 各0。未修改原 evidence 或原 canonical assertion。

本輪未啟動／操作 browser、跑 full／ZIP、改 control／dist、commit、切 branch 或安裝。仍為唯一 source writer；Mainline browser 清理不由 Worker 介入。

## 定位與可證偽假說

CodeGraph query：mountComponentInteraction bindVendor runSnapBrowserCases；未命中本卡檔案，後續 bounded source read。套用 root-cause-triage，未做泛化研究。

1. **首次控制點仍 hidden**：pinned croact-moveable 0.9.0 的 MoveableManager.render（ESM12039–12047）以 controlBox／firstRenderState／persistData 決定 visibility。首次 ref 未掛載時為 hidden。componentDidMount（12062–12079）僅在沒有 explicit container、沒有 parentMoveable 且未 persisted 時 updateRect＋forceUpdate。S7 snap 明示 slide container，因此跳過這個重繪；snap off 未指定 container，走原有顯示路徑。若這是缺口，在 constructor 已完成 ref/mount 後量測應讓首次 handle 可見，無須先 drag。
2. **dragTarget 阻止 resize**：source 中 targetGesto 使用 dragTarget，controlGesto 另由 getControlAbleGesto 綁 controlBox（react-moveable MoveableManager.tsx:1050–1069、gesto/getAbleGesto.ts:252 起）。dragTarget 不取代 control listener，不能解釋控制點自身 hidden；未改此路由。
3. **resizeStart 方向設定過晚**：croact setState 為排程更新，確實不是立即 props 更新；但本缺口發生於 handle 尚不能接 pointer 的階段，direction setter 尚無機會執行。原 fresh receipt 未記 resize payload，不能聲稱它已證明或排除所有方向時序問題。本輪保留既有方向設定，讓主線在恢復 handle 後以原645×485 assertion 檢驗。

S6 browser-mapping/decision.md:21 已記錄相同「resize 無事件、命中 slide、control visibility:hidden」，fixture 透過 vendor updateRect 恢復。這只作來源證據，不當本 production candidate 的 PASS。

## RED → GREEN

新增 tests/edx-wp1-s7-first-handle.test.mjs：讀取 vendor metadata 指定的 pinned ESM，先核對 SHA，再執行其原文 render、componentDidMount、updateRect、updateState methods。DOM／矩陣／hit-test 仍是替身；hidden handle 不偽造 resizeStart。測試先確認 off 的既有 mount 可見，再啟用 snap，不經任何 drag，要求 canonical 提交645×485，並檢查重新選取後的新 vendor handle 可見及 teardown。

修前 RED 1/1，確切 actual637×477／expected645×485，與主線症狀一致；不是 import／fixture error。修後 targeted 1/1 GREEN。這證實 source-contract 缺口與修復，不代表真 browser hit-routing 或真 vendor 量化已 PASS。

Production 修正只有 runtime/component-interaction.js:209–210：snap vendor 綁定完成後呼叫一次 vendor.updateRect()。Moveable constructor 的 renderSelf 已執行 ref/mount hooks，故直接量測即可交由 vendor 原有 setState 排程重繪；不加自有 timer／RAF、不強制 CSS visibility、不改 direction／dragTarget／canonical／vendor。每次重新選取的新短生命 vendor 也走同一路徑。Off 不增加量測，pointer update loop 不增加工作。

tools/edx-wp1-s7-browser-cases.mjs:31–35 新增 resize pointer 前的 visibility、elementFromPoint hitHandle 斷言與 snapHandleChecks 欄位。harness 不代呼叫 updateRect，不加重試，不放寬原尺寸 assertion。下次若仍 fail，可區分不可見、被遮擋與實際提交值錯誤。

## 本輪 changed paths

- runtime/component-interaction.js：2行，首次 snap handle 量測。
- tools/edx-wp1-s7-browser-cases.mjs：6行，handle 可見／hit 證據與強斷言。
- tests/edx-wp1-s7-first-handle.test.mjs：新增 source-contract 回歸。
- evidence/edx-wp1-s7/worker-acceptance-fix*：本 receipt、RED／targeted／focused logs 與 hashes。

對照前次 worker-source-hashes.json：其餘6個 source 檔 unchanged；四個既有 untracked 與 vendor hash 亦 unchanged。本輪 source hashes 另存 worker-acceptance-fix-hashes.json，不覆寫舊 freeze snapshot。

## 確切命令與數字

工作目錄：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical；Node v25.9.0。

```sh
node --test tests/edx-wp1-s7-first-handle.test.mjs > evidence/edx-wp1-s7/worker-acceptance-fix-red.log 2>&1
node --test tests/edx-wp1-s7-first-handle.test.mjs > evidence/edx-wp1-s7/worker-acceptance-fix-targeted.log 2>&1
node --test tests/edx-wp1-s3-*.test.mjs tests/edx-wp1-s4-*.test.mjs tests/edx-wp1-s5-*.test.mjs tests/edx-wp1-s7-*.test.mjs > evidence/edx-wp1-s7/worker-acceptance-fix-focused.log 2>&1
node --check tools/edx-wp1-s7-browser-cases.mjs
git diff --check
```

- RED（production 修改前）：1 test／0 pass／1 fail，125.644166 ms。
- Targeted：1 test／1 pass／0 fail，130.691959 ms。
- Focused S3/S4/S5/S7：97 tests／97 pass／0 fail／0 skipped，1283.488417 ms；包含既有 mounted payload 成本 tests。
- syntax／diff-check：exit0。未另跑 CPU perf：只新增 mount 量測，未改 pointer loop；前次 CPU receipt 為歷史資料，不冒稱新 hash 的效能結果。

## Mainline 重驗與 freeze

沿原本 owned browser／profile 的 S4 attach-only harness 執行 --snap-regression，原645×485 assertion 保留。建議仍沿原 flags 完整重跑本 focused browser 矩陣；Worker 不連 browser、不重用舊 fixture／HTML 冒充修復版。

```sh
PPTSKILL_DEVTOOLS_ACTIVE_PORT="<Mainline-owned DevToolsActivePort 絕對路徑>" node tools/edx-wp1-s4-browser-acceptance.mjs evidence/edx-wp1-s7/mainline-browser-recheck --snap-regression --keyboard-regression --motion-regression --perf-regression
```

風險／未完成：主線尚未驗證修復後的 fresh handle visibility、實際 hit、resize direction／payload、後續雙 viewport 與 motion cases。不得把 source-contract GREEN 當 browser PASS。

**FREEZE：本 receipt 與 hashes 完成後停止 source／evidence 寫入，交 Mainline 獨立重驗。**
