# S11 Mainline：拆分 browser 驗收契約

Status: REPLAN / SPLIT_ACCEPTANCE_PENDING
Owner：2026-09-23 互動對話明示只修 acceptance contract / harness，trusted external file drop 與 active gesture cancellation 分開取證；runtime／ZIP 不改，不做第四次相同 retry。
Root question：如何在不冒稱 CDP 能模擬矛盾 ownership 的前提下完成 S11 drop 契約驗收？
Blocker：held CDP mouse gesture + CDP external file drag 的混合路徑未投遞 drop；不是已證明的產品 defect。
Fork：無新產品 fork；放棄混合 CDP 路徑，保留兩項獨立證據。

## 來源與裁決

2026-09-23 Mainline 唯讀核對 [Chromium input_handler.cc](https://chromium.googlesource.com/chromium/src/+/master/content/browser/devtools/protocol/input_handler.cc)：DragController 的 mouse down 建立 initial_state_，註解指出 OS dragging 不可用；mouse up 清除此狀態。DispatchDragEvent 的 drop 先經 DragTargetDragOver 再決定 DragTargetDrop。來源為當日 master，未聲稱與本機 binary 逐版本對應。

本地 host-retry-1／host-retry-2 都觀測 dragenter、dragover、dragenter，drop=0、optimizerCalls=0；retry2 mouseReleased 在 drag commands 之後，沒有排除原 ownership 衝突。Chromium 來源與事件紀錄支持「此 harness choreography 不可用」的高信心分類；不擴張為所有 CDP 版本或任意組合都不可能。rAF timeout 是後续症狀，不足以證明 runtime 缺陷。

## 修訂驗收

1. 正向 external file drop：保留 Input.dispatchDragEvent → isTrusted=true → 真 optimizer → S9/S8 insertion。nativeDrop 開始前必須沒有 active component gesture；無 API 或 synthetic positive fallback。
2. Active gesture cancellation：分 snap=false／true，以真 CDP mouse 建立 Moveable preview；先證明 gesturing=true 且 canonical spec 未變。保持按住，獨立派送明標 isTrusted=false 的 DOM drop，DataTransfer 含真 PNG File，走產品事件入口／真 optimizer。必須在 mouseReleased **之前**看到 gesturing=false；之後 release 不能提交舊 geometry。完整 spec／selection／old-root 斷言仍保留。此屬 synthetic semantic seam，不能算 trusted external drop 或人工 OS dragging。
3. 既有 mounted snap=false／true cancellation tests fresh rerun。雙 viewport 1280×720、1600×900；既有 S10 chooser／negative guards／async／export／offline 全保留，四支 affected PGQ 串行。
4. errors／remote=0、targetClosed、managed readiness／Browser.close／supervisor／owned root／marker cleanup、source4／protected4／ZIP 前後 hash MATCH，才可交 Independent Review。
5. 首三輪 FAIL 不刪、不覆寫、不重設累計。host-split-acceptance 僅跑新契約；禁止再送 held mouse + external CDP file drag。新契約失敗先收完整證據回主線，不盲 retry。

Scope：僅 tools/edx-wp2-s11-browser-cases.mjs 與 Mainline control/evidence。runtime、tests、ZIP 凍結於 1fdb3c275f9e174b7c8d506207c42c758aedb71a；AI Core、capacity/readiness controller 契約不變。bounded 單檔 Mainline 直接實作自驗，0 新 Worker／Reviewer，節省模式不重跑 full646／ZIP build。
Current state：契約已落盤，harness／fresh targeted／正式 host 待執行。最終結果另見 receipt；此文件不宣稱 PASS。
