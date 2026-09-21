# S7 Escape／release 診斷交接

狀態：DIAGNOSTIC READY／FREEZE。尚未修 production、尚未關閉 proxyCount=1 缺口。沿同一 implementation 驗收鏈，不另開 repair agent。

## 證據與共同假設核對

輸入 evidence/edx-wp1-s7/browser-retry/acceptance.json：1280已通過40 checks，包含 on/off drag/resize 正／負／multi／zero／return。第一個 drag Escape cancellation 在 release 後 proxyCount=1，要求0；五類 errors 均0。上一個 hidden handle 缺口已由主線 fresh 關閉，本輪不回頭改 visibility／方向。

CodeGraph query 未命中本卡 source，改 bounded read。取消既有 mounted test 在 Escape 後直接呼叫 vendor end；它沒有驗證真 mouseup 引發的 DOM click。因此不能把其 GREEN 等同於真 release 完整事件鏈。

候選一：Escape 因 activeElement／event target input ownership、IME 或 modifier guard 被略過。候選二：Escape 已取消並清 proxy，但 stopDrag/destroy 結束 vendor 的 click 防護，mouseup 的 click 再走 runtime 的 select(target) 建新 proxy。現有 receipt 只有 release 後結果，不能分辨兩者，也未證明 startGesture 確有進入 gesture。

Source 事實：runtime keydown 先做 S5 guards，普通 Escape 呼叫 cancel/clearSelection；click 對有效 visible component 無條件 select。Gesto onDragEnd 會安排解除 click 防護；_allowClickEvent 移除 window capture listener。這支持候選二的可能性，但不等於本次 browser 已觀察到 click。不得依猜測先加 suppress flag 或改 S5 guard。

## 最小診斷

只改 tools/edx-wp1-s7-browser-cases.mjs，於首個 drag／escape case（ready 之後）安裝 window capture 觀測器。只收 keydown/up、pointerdown/up/cancel、mousedown/up、click；不收 pointermove、不讀 whole DeckSpec、不 log console、不 preventDefault／stopPropagation、不自動點擊或重試。

新增 acceptance.json 的 runs[0].snapCancelDiagnostic，依序包含：

- installed、after-start、after-cancel-before-release、after-release checkpoint。
- state.enabled／target／gesturing、proxies、controls、activeElement 的 tag／elementId／action／chrome／editable／role。
- capture event 的 type／isTrusted、target、key／keyCode／isComposing／modifiers、buttons／detail／pointerId／client座標。
- defaultPreventedAtCapture 僅表示 window capture 當下；不能解讀為 document handler 最終是否取消。capture 的 state 亦為 handler 前狀態，最終效果以 checkpoint 判定。

finally 在原 assertion 前取回診斷並移除 listeners／window handle，所以原 proxyCount=0 fail 仍會產出診斷 receipt。原 canonical／proxy assertions 完整保留，沒有弱化。若 CDP 連線中斷而無法取回，仍由 S4 owned target finally 做原有清理。

## 主線重跑與判讀

使用原 S4 attach-only --snap-regression 命令即可，不需新增 flag。請使用新的 output directory，保留 browser-retry 原 receipt：

```sh
PPTSKILL_DEVTOOLS_ACTIVE_PORT="<Mainline-owned DevToolsActivePort 絕對路徑>" node tools/edx-wp1-s4-browser-acceptance.mjs evidence/edx-wp1-s7/mainline-cancel-diagnostic --snap-regression
```

若 after-start.gesturing=true，after-cancel-before-release 為 target=null／gesturing=false／proxies=0，而 click capture 仍為0、after-release 變1，即支持「真 Escape 成功，release click 重選」。若 Escape checkpoint 仍 gesturing=true／proxies=1，檢查 key event trust／modifiers／target與 active ownership。若 after-start 已false，先定位 gesture 啟動，不能直接歸因 Escape。請交回完整 snapCancelDiagnostic 與 error，Worker 再依實際事件做最小修復。

## 本輪驗證與 changed paths

- tools/edx-wp1-s7-browser-cases.mjs：最小觀測與 finally cleanup；production 未改。
- tests/edx-wp1-s7-cancel-diagnostic.test.mjs：兩種事件次序的 mounted 重播，證明診斷能分辨 ordinary Escape＋晚到 click 與 guarded Escape；驗證觀測器不攔事件、快照不漂移、dispose 可重複。
- evidence/edx-wp1-s7/worker-cancel-diagnostic*：本 receipt、targeted／focused logs、hashes。

```sh
node --test tests/edx-wp1-s7-cancel-diagnostic.test.mjs > evidence/edx-wp1-s7/worker-cancel-diagnostic-targeted.log 2>&1
node --test tests/edx-wp1-s3-*.test.mjs tests/edx-wp1-s4-*.test.mjs tests/edx-wp1-s5-*.test.mjs tests/edx-wp1-s7-*.test.mjs > evidence/edx-wp1-s7/worker-cancel-diagnostic-focused.log 2>&1
node --check tools/edx-wp1-s7-browser-cases.mjs
git diff --check
```

Targeted 2/2 PASS（125.480416ms）；focused 99/99 PASS、0 skipped（1180.538209ms）；syntax／diff-check exit0。這是診斷工具驗證，不是 browser 缺口修復 PASS；沒有宣稱 RED→GREEN 已關閉本產品缺口。

未啟動／操作 browser、跑 full／ZIP、改 control／dist、commit、切 branch、安裝或開 agent。runtime/component-interaction.js 與前次 acceptance fix freeze hash 一致。

**FREEZE：診斷與 hashes 完成後停止寫入。依 Owner 要求先交最小 harness 診斷，等待主線真事件證據再修 production。**
