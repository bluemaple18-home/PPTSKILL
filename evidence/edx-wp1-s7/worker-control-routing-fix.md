# S7 gesture control capture routing 修復 receipt

狀態：IMPLEMENTATION FROZEN／待 Mainline fresh browser 重驗。同一 implementation 驗收接續；未另開 agent。

## 本輪確定證據

輸入 toggle-diagnostic/acceptance.json：window capture 收到 untrusted click、detail0、button snap-layout；after-cancel-before-release 仍 gesturing=true，release 提交816,296。先前 escape／pointercancel 與尾隨 click 修復已由主線 fresh 關閉，本輪保留。

主線已將 browser harness 的 diagnostic 條件擴為 kind=drag 且 reason∈['escape','toggle']。開工讀到的 harness SHA256 為 5e79573c5ddef464b833215489daaf8b95da7947c1c4ddb867a035691f5a1b49；此條件完整保留，未覆蓋回舊版本。

CodeGraph query 未命中本卡 source，改 bounded read。Pinned Gesto1.19.4 的 onDragStart 在 window 註冊 capture click listener（ESM299–300）；_onClick（436起）先解除 listener，再於 condition 沒回 true 時無條件 stopPropagation／preventDefault。Moveable getAbleGesto 對 drag 的 preventClickEventByCondition 固定 null（react-moveable source306–309／croact-moveable ESM11698–11704）；不是產品 document handler 的取消操作失效，而是原 event 被攔在 window。

Pinned Gesto source SHA256：d6ac62f94e54527df5fa89f35c2d625426ffddf90208a779186d7edbde66954e。測試從現有 vendor manifest 解析來源並核對 SHA，執行其 _onClick 原文，未改／重建 vendor。

## 最小產品修正

mount 時註冊 window capture routeGestureControl，早於 gesture 才加入的 vendor blocker。僅 active gesture 且目標為 layout／snap-layout／edit control，或非 editor/vendor chrome 的 slide selection surface，才呼叫既有 cancel。既有 stopDrag/destroy 解除 vendor listener，使**原 event**繼續抵達既有 document handler；不 clone/re-dispatch event，不重複執行 toggle／setEdit，不全域放行所有 clicks。

以單一 routedControlClick reference 區別當下明確 control activation 與後續取消尾隨 click：只有同一個 routed event 可略過 suppressPointerClick，且不消耗 pending 防護。之後 mouseup 的 trusted pointer click 仍被前輪防護擋掉。Reference 在 document click 消費、下一次有效 pointerdown、destroy 時清除；window capture listener 在 destroy 移除。沒有 timer／RAF／新 schema 或 vendor 私有 API。

非本卡 action、外部頁面 surface、vendor chrome 不走此入口，仍保留 vendor 原路由。

## Synthetic 與真正 user path

原 synthetic toggle/text/selection cases 全數保留，canonical／proxy assertions 未弱化。它們證明程式 activation 在 gesture 中的取消契約，不冒充人類用同一左鍵按住拖曳時又點第二個按鈕。

可達 user path：保持 pointer 按住，透過鍵盤 Tab 將焦點移至工具列按鈕，再按 Enter；原生 button activation 產生 trusted、detail0 click。新增 browser cases 在 drag／resize 中分別測 snap-layout、edit，共4組／viewport。Harness **以程式 focus 定位按鈕，再用 CDP 真 Enter 啟用**，不宣稱 focus 是真 Tab；明確驗證 activation={trusted:true,detail:0,action}、release 前已取消、toggle／text mode 實際切換，以及 release 後 canonical 不變／proxy0。觀測 listener 在 finally 清除。

Selection case 仍明確是 programmatic slide selection activation；不虛構 heading 有現成鍵盤選取行為，也不降低該 synthetic 契約。

## RED → GREEN 與 changed paths

- runtime/component-interaction.js：限域 window capture cancellation、同 event routing marker、cleanup；保留尾隨 click 防護。
- tools/edx-wp1-s7-browser-cases.mjs：保留主線診斷，增加 Enter鍵碼與4組真 Enter activation cases；原 assertions 不變。
- tests/edx-wp1-s7-control-routing.test.mjs：13項，pinned capture blocker＋DOM傳播／listener removal 重播。覆蓋3種 action×programmatic／keyboard／pointer event欄位、非本卡路由、teardown。
- tests/edx-wp1-s7-cancel-diagnostic.test.mjs：1個精確快照 assertion 改為0，因新增較早的 product window capture 會在後註冊的 diagnostic capture 前取消 guarded Escape 後的 selection click。原 guarded Escape checkpoint 仍要求 gesture保留；這是校準事件觀測順序，並未放寬產品 assertion。
- evidence/edx-wp1-s7/worker-control-routing-*：本 receipt、RED／GREEN／targeted／focused logs、hashes。

初始 RED 為3/3，均因 gesture仍true≠false（與主線阻擋症狀相同），不是 fixture/import 失敗。Production 修後初版3/3 GREEN。第一次 focused 為124/125，唯一失敗是上段已說明的 diagnostic snapshot舊預期；修正觀測順序後全部通過，未更改 browser canonical/proxy assertions。

## 確切命令與具名數字

工作目錄：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical；Node v25.9.0。

```sh
node --test tests/edx-wp1-s7-control-routing.test.mjs > evidence/edx-wp1-s7/worker-control-routing-red.log 2>&1
node --test tests/edx-wp1-s7-control-routing.test.mjs > evidence/edx-wp1-s7/worker-control-routing-green-initial.log 2>&1
node --test tests/edx-wp1-s7-control-routing.test.mjs tests/edx-wp1-s7-cancel-click.test.mjs > evidence/edx-wp1-s7/worker-control-routing-targeted.log 2>&1
node --test tests/edx-wp1-s3-*.test.mjs tests/edx-wp1-s4-*.test.mjs tests/edx-wp1-s5-*.test.mjs tests/edx-wp1-s7-*.test.mjs > evidence/edx-wp1-s7/worker-control-routing-focused.log 2>&1
node --check tools/edx-wp1-s7-browser-cases.mjs
git diff --check
```

- RED：3 tests／0 pass／3 fail，122.195167ms。
- 初版 GREEN：3/3，122.407583ms。
- 最終 targeted（routing13＋cancel-click23）：36/36 PASS，192.522042ms。
- Focused S3/S4/S5/S7：135/135 PASS、0 skipped，1169.499ms。
- Syntax／diff-check exit0。

這些是 source／mounted 重播，不是 browser production PASS；真 Enter cases 只完成語法與既有 managed attach檢查，未執行 fresh browser。

## 主線重驗與 freeze

沿原 owned browser 的 --snap-regression 入口即可（保留主線原有 keyboard/motion/perf flags），建議使用新 output directory。需實測 synthetic toggle/text/selection 在 release前取消，以及新真 Enter control cases；其餘雙 viewport／motion契約不降級。

未啟動／操作 browser、跑 full／ZIP、改 control／dist、commit、切 branch、安裝或開 agent。Vendor與四個既有 untracked hash 保持不變。主線 browser 清理由主線負責。

**FREEZE：receipt／worker-control-routing-hashes.json 完成後停止所有寫入；交 Mainline fresh browser 獨立重驗。**
