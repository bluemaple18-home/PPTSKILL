# S7 已取消 gesture 尾隨 click 修復 receipt

狀態：IMPLEMENTATION FROZEN，待 Mainline fresh browser 重驗。本輪為同一 implementation 驗收接續，未另開 repair agent。

## 已確認原因

輸入 cancel-diagnostic/acceptance.json 的 snapCancelDiagnostic：Escape keyup／after-cancel-before-release 已 target=null、gesturing=false、proxies=0；接著 pointerup→mouseup→trusted click（detail1、pointerId1、component target）；after-release 重建 selection／proxies=1。這排除了本次 Escape guard 未取消的假說。

共同假設缺口：既有 mounted cancellation 測試只重播 vendor end，不涵蓋 mouseup 後 DOM click。Vendor stop/destroy 移除 click 防護後，layout click handler 把取消尾隨 click 當普通 selection。不能永久停用元件點擊，亦不能改弱 proxyCount=0 assertion。

CodeGraph query 未命中本卡，已 bounded read controller／mount click/cancel 路徑及上述真事件證據。

## 最小修正

runtime/component-interaction.js：createComponentInteraction 新增 optional onCancel callback（預設空函式，不改既有呼叫者）。僅在 active gesture 被 cancel、stale finish 或 validator 拒絕時通知 mounted adapter；空 cancel、一般 no-op finish、成功 finish 均不啟動防護。這使 Escape、pointercancel、blur、viewport、selection/mode/text、toggle、replacement、stale 共用同一策略，避免逐入口複製抑制邏輯。

Mounted adapter 只保留一個暫態 suppressPointerClick 布林。取消後，layout click handler 消耗一次 isTrusted 且 detail>0 的 click，preventDefault 並 return，不重新 select。新的 trusted primary 左鍵 pointerdown（document capture）立即解除；即使 pointercancel 後沒有 click，也不會攔住下次有效操作。不使用 timer、固定延遲、持久 storage 或第二套 gesture state machine。

Keyboard click 的 detail=0、programmatic click 的 isTrusted=false 保持原語意，且不誤消耗待處理的真 pointer 尾隨 click。Destroy 清旗標並移除新增 pointerdown listener，重複 teardown 安全。Canonical authority、vendor／direction／proxy geometry 均未改。

## 本輪 changed paths

- runtime/component-interaction.js：共用 cancellation notification、一次性 layout click 防護及 pointerdown reset／cleanup。
- tests/edx-wp1-s7-cancel-click.test.mjs：新增23項精準 mounted regression。
- evidence/edx-wp1-s7/worker-cancel-click-*：RED／GREEN／targeted／focused logs、receipt、hashes。

Browser harness／原 assertions／前輪診斷保留不變；沒有再交 diagnostic-only。未啟動或操作 browser、跑 full／ZIP、改 control／dist、commit、切 branch、安裝或開 agent。仍唯一 source writer。

## RED → GREEN 與精確命令

工作目錄：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical；Node v25.9.0。

```sh
node --test tests/edx-wp1-s7-cancel-click.test.mjs > evidence/edx-wp1-s7/worker-cancel-click-red.log 2>&1
node --test tests/edx-wp1-s7-cancel-click.test.mjs > evidence/edx-wp1-s7/worker-cancel-click-green-initial.log 2>&1
node --test tests/edx-wp1-s7-cancel-click.test.mjs > evidence/edx-wp1-s7/worker-cancel-click-targeted.log 2>&1
node --test tests/edx-wp1-s3-*.test.mjs tests/edx-wp1-s4-*.test.mjs tests/edx-wp1-s5-*.test.mjs tests/edx-wp1-s7-*.test.mjs > evidence/edx-wp1-s7/worker-cancel-click-focused.log 2>&1
node --check runtime/component-interaction.js
git diff --check
```

- Production 修前 RED：2 tests／0 pass／2 fail（118.970209ms），drag與resize均重現 release-click 後 proxy1≠0。
- 初版 GREEN：2/2（122.121333ms）。
- 最終 targeted：23 tests／23 pass／0 fail／0 skipped（205.78325ms）。
- Focused S3/S4/S5/S7：122 tests／122 pass／0 fail／0 skipped（1221.949834ms）。既有 pointer adapter 與 mounted payload 成本測試一併通過。
- Syntax／diff-check：exit0。

Mounted event 的 trusted/detail/pointerId 為依真 browser 證據重播的替身欄位，並非本輪又跑真 browser。23 tests 涵蓋 cancel→release-click→fresh pointerdown/click；共用取消／stale update/release／invalid；没有尾隨 click 時的新 pointer；普通 selection／no-op；鍵盤／programmatic controls；programmatic component selection；非有效 pointerdown 不提前解除；destroy listener cleanup。

## 主線重驗與風險

沿原 S4 attach-only harness 的 --snap-regression（以及主線原有 focused flags）重跑，不需新增參數。保留原 proxyCount=0 與 geometry assertions；snapCancelDiagnostic 應在 after-release 仍為 target=null／gesturing=false／proxies0。後續取消迴圈的 ready 真 pointerdown/click 亦應正常重選，不可因防護卡住。建議新 output directory 保存此前失敗證據。

```sh
PPTSKILL_DEVTOOLS_ACTIVE_PORT="<Mainline-owned DevToolsActivePort 絕對路徑>" node tools/edx-wp1-s4-browser-acceptance.mjs evidence/edx-wp1-s7/mainline-cancel-fix-recheck --snap-regression --keyboard-regression --motion-regression --perf-regression
```

尚未取得修復 candidate 的 fresh browser PASS；真事件 ordering、後續取消路徑、雙 viewport 與 motion 最終結果由 Mainline 重驗。Full／ZIP 繼續留 Mainline。本輪只改取消／release 接縫，未另跑 CPU perf；不得將前輪 CPU receipt 當本 hash 的新效能量測。

**FREEZE：本 receipt 與 worker-cancel-click-hashes.json 完成後停止所有寫入，交 Mainline 獨立重驗。**
