# S11 browser 首輪 FAIL 與 bounded harness repair

首輪candidate1fdb3c2、1280 acceptance在tools/edx-wp2-s11-browser-cases.mjs:119斷言gesturing=true失敗，實際false。此前S10 cases及S11正常／同檔／無圖頁／跨頁／offline共5次positive trusted drops通過；不是整輪PASS。PGQ未開始，1600未跑。errors0/targetClosed；Browser.close/supervisor0、ownedroot/marker absent。首輪host-acceptance保留。

假說：reset重新載入legacy fixture，portable-quote尚無geometryOverrides，不能建立gesture。反證條件：補既有公開初始化按鈕後仍gesturing=false，則此假說不足，停止同類盲改。Fresh實檔extractDeckSpec確認quoteGeometry=null、asset-first geometry存在；base10 runner明示先initialize-layout才startGesture。

Mainline minimal修改只tools/edx-wp2-s11-browser-cases.mjs：先assert未初始化、按既有initialize-layout、核對精確geometry並重取expected，再保留原gesturing=true及drop後cancel斷言。沒有削弱assertion、改runtime/ZIP、重新寫gesture authority；原S10 helper流程未自行新增修補。S10本身的startGesture未assert active，本S11新增這個前置斷言才暴露fixture缺口；不冒稱S10該步已證明active gesture。原base10另有fresh drag/cancel驗證。

裁決CONTINUE：這是首個可定位harness blocker，已有前五個positive drop證據；一次bounded retry補兩viewport完整gesture及其後的必要驗收，不重置失敗次數。先syntax與fixture-only，正式host仍走AI Core原入口。source-hashes-initial.json保存首輪manifest；最終source manifest只更新該harness與candidate SHA。full646及ZIP沿未改runtime證據，不重跑無關測試。

## Retry1：新的混合CDP時序 blocker／主線重判

3ddc838在1280已通過初始化及gesturing=true；gesture-cancel發出三個CDP命令後，settle的Runtime.evaluate（兩次rAF）逾時。finally immediate snapshot仍成功，事件只有dragenter/dragover/dragenter、無drop，optimizerCalls=0。errors0、targetClosed/Browser.close/supervisor/root/marker cleanup全PASS；1600/PGQ仍未跑。本輪是實際補到active gesture前置證據，沒有把逾時判產品FAIL或declared PASS。

共同假設重判：harness同時持有Input.dispatchMouseEvent的按下狀態並注入外部file drag，卻把mouseReleased排在nativeDrop內rAF等待之後；其間可能形成拖放時序等待。這是可證偽假說，不宣稱Chrome/AI Core根因已定。官方Input handler區分mouse與drag通道：https://chromium.googlesource.com/chromium/src/+/master/content/browser/devtools/protocol/input_handler.cc 。

CONTINUE一次bounded retry2：只針對gesture-cancel，在CDP drop命令後立即記snapshot並release合成held mouse，再等rAF。仍要求active gesture=true、實際trusted drop=1、optimizerCalls=1、gesture取消及whole-spec等於未提交preview加新圖，不能放寬成API或synthetic正向fallback。其餘15個CDP attempts路徑不變。若同一路徑再FAIL即停止，不再第4次browser launch修這個blocker。runtime/tests/ZIP未改，不增Worker／Repair agent。
