# S6 browser mapping decision

狀態：24-case採集完成；直接payload→canonical方案 REJECT。Moveable能力仍conditional ADAPT，不宣布production snap GO。

## 實測與限制

兩viewport(1280×720/1600×900) × grid0/8 × drag/SE resize × none/scale(.8)/translateY(20px)，共24組真CDP pointer。fixture把container/snapContainer設為slide、rootContainer設body；canonical樣板(803,283,637,477)，單次move，不投影vendor結果、不提交DeckSpec。console/page/network/HTTP/remote全0、owned targetClosed=true、Browser.close後supervisor exit0與root absent。

requestedCanonicalDelta=7只是指令意圖。receipt另記事件start/client與observedCanonicalDelta：1280大多6.25，scale resize y=7.5；1600為7。這是pointer像素取整，**不可據此單獨宣稱相同實際delta有viewport regression**。

確定可重現的mapping差異：
- 1600/no-transform/grid8/drag：left811/top291，並非左上角8px格點；vendor預設多邊吸附不能當左上角量化器。
- 1600/no-transform/grid8/resize：645×485、left803/top283；off-grid起始尺寸仍可能得到非8倍數尺寸。
- 1600/scale(.8)/grid8/resize：646.625×486.625，內嵌drag left802.0375/top282.0375；不符合現有SE resize只改width/height且固定canonical左上角的直接映射假設。
- 1600/translateY(20px)/grid8/resize：645×481，對照none為645×485；同viewport/同actual7位移，transform改變snap結果。

此處scale/translate是**靜態transform probe**，不是三種motion treatment正常播放的驗收。只採單次正向move與固定box；沒有負向、多次preview、real full-deck、export/reopen、bounds或效能PASS宣稱。

## fixture失敗與修正

first-receipt.json／diagnostic-receipt.json保留resize無事件的歷史失敗。diagnostic命中slide且control visibility:hidden，來源croact-moveable ESM12039–12047顯示首次controlBox尚未就緒。fixture在兩frame後呼叫vendor updateRect，再等兩frame；無CSS強制顯示。之後24組完整採集。initial-complete-receipt.json只有requested7（舊欄位名rawCanonicalDelta），最終receipt增加實際事件位移，前者不能當實際7的證明。

## 主線裁決與唯一下一步

不把event.width/height或translate直接提交，不以額外round/clamp掩蓋問題，不復活永久transform suppression。
下一個最小實驗：同一fixture限制drag只吸附left/top、resize只吸附right/bottom，檢查vendor是否能表達產品grid定義；並先驗證無presentation transform的editor geometry target是否隔離motion，而非暫停/改寫motion。後者僅允許短生命editor-only投影，不能成第二canonical authority；若需擴runtime再另開卡，未量測前不實作。
這是有測量缺口支持的adapter研究，不表示同意新dependency、history、多選或schema。Production與ZIP不變；S5 GO不變。未merge/push/deploy。
