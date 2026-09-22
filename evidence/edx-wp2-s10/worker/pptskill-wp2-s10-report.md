# WP2-S10 Worker — STOP WRITING

狀態：bounded 實作完成，交主線驗收；不宣稱 candidate／GO。

## 契約與結果

僅新增 layout 原生插圖入口，重用 S9 insertImageFile／S8 mutation。固定 560/288/480/320、contain、File.name alt、slide-local first-free ID；pending kind 隔離兩個 chooser；未 change 的 intent 失效、blur 保留 capture、async settlement 釋放 busy，既有 selection authority 未另造。export clone 清理永久 toolbar，bootstrap 補回入口。S8/S9 helper／API 契約未改。

## Changed paths

- runtime/deck-editor.js
- tests/edx-wp2-s10-insert-image-ui.test.mjs
- tools/edx-wp2-s10-browser-cases.mjs
- tools/edx-wp1-s4-browser-acceptance.mjs
- runtime/component-interaction.js
- tools/edx-wp1-s4-perf-mounted.mjs

Optional 必要性：mounted double 手工建立 chrome（原 harness 無新 input/button，也不解析完整 nav），只補四行 controls；component-interaction 在更新 mode 前 clearSelection，原 callback 看見舊 enabled 值，因此加 mode 後 callback。插圖 click 與 pointerdown 接既有 picker cancel，避免 gesture commit 或新 click 被當空白選取。沒有新增 selection/gesture authority。

## 驗證與原 FAIL

逐命令、exit、counts、log：/private/tmp/pptskill-wp2-s10-commands.json。
- public RED：1 test，0 pass／1 fail；原碼尚無 UI handler，layout 按鈕狀態未更新。
- 最小 GREEN：1/1。
- S10 邊界：29/29。
- scoped 首輪：147/152，5 FAIL；原 assertions 完整保留。原因為 chooser kind null/'replace' 直接流入 disabled，mounted double 暴露非 boolean。修正為 Boolean(imagePickerOpen)，沒有修改 S6/S7 assertions。
- 修正後明列 scoped：181/181（含當時 S10 29）。
- 最後補 ID change 前碰撞及 export canonical remount：S10 31/31。最後 production source 已經通過 scoped；之後僅增加 tests/browser cases。唯一案例合計 183（31 S10＋152 相鄰），非再跑 full。
- 六個 changed paths 各自 node --check，git diff --check 結果見 commands.json。

所有原 RED／FAIL logs 保留，不覆寫：/private/tmp/pptskill-wp2-s10-01-red.log、/private/tmp/pptskill-wp2-s10-04-scoped.log。來源 SHA-256：/private/tmp/pptskill-wp2-s10-sourcehash.json。

## 未驗範圍與主線交接

Browser cases 只寫與 syntax，未執行；新增 --insert-image-ui-regression 沿 base10／S4 fixture／S6 CDP chooser seam。真 pointer、input backendNodeId、3×2 PNG、geometry/alt/fit/ID、舊 roots/spec、無圖頁、同檔、合成 blur/cancel/focusin（明標）、trusted change/naturalBlurCount、busy/async/export/切頁、雙向 S6 互斥與 replacement、鍵盤 focus、rect/hit/無 clipping、offline remount、新 controls screenshot 仍須主線在 1280×720 與 1600×900 執行。CDP 失敗有明確 assertion，不 fallback API。mounted 並非 real browser，未證明 native OS dialog、排版、pointer 或 bootstrap HTML 真實回載。

未執行 full/glob/browser/Chrome/attach/ZIP/build/probe／四支 PGQ／AI Core write／commit/branch/subagent；未改 control/protected。主線同步新增的 evidence/edx-wp2-s10/ 與 tasks/edx-wp2-s10-host-acceptance.md 不屬 Worker changed paths，未修改。20MiB export gate 保持既有實作。正式 host、四支 PGQ、full 明列、ZIP lifecycle/source/protected4/hash/delta、cleanup 與 Independent Review 交主線。

回退範圍限上述六個 paths 的本輪 diff；不可覆蓋主線 control/evidence。所有寫入在本報告與來源 hash 完成後停止。
