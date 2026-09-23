# WP2-S11 — 單張圖片 file drop

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Base: da6c1229c02b5c0956f5ef6725be5e9216d98acd（S10 Independent GO closure，尚未merge/push）
Branch: codex/edx-wp2-s11-image-drop
Main/origin-main: d0b9aa05c50b09596920705bbbf4dd632c9137d4
traces_to: BACKLOG §10.1 decision3圖片拖入、decision7 identity、decision8單一operation；§10.3 WP2；§10.4 insert-element。
Dependencies: S8 canonical insertion、S9 File adapter、S10 chooser/defaults全部GO。Frontier gap：只有picker，沒有file-drop listener；CodeGraph未命中相關symbol，rg確認deck-editor無dragover/drop handler。

## 範圍與契約

1. 新增document dragover/drop薄adapter，只有發生於本deck `.slide` 內的file transfer由editor接管。`types`含Files或items有kind=file可辨識；純text/html/URI、不在slide內的事件不preventDefault、不讀getData、不fetch、不當圖片URL。以事件目標的唯一connected slide DOM＋canonical ID驗證，巢狀子節點同樣定位slide；重複／不存在identity不插入。
2. Slide內file dragover/drop一律preventDefault避免檔案取代目前頁面；play/edit模式、chooser開啟／insertionBusy、多檔/空file、非法target都不提交。layout可接受時dragover設dropEffect=copy，其他為none。dragover不能讀File bytes、optimizer、DeckSpec payload或serialize；不寫pending，不改selection/geometry/revision。不新增hover FSM/overlay；沿既有status/原生cursor提示，addition/operate，沿原toolbar視覺authority。
3. 真正drop只接收一個File。多檔／directory空files拒絕並顯示既有status，不截第一張、不遞迴。不要自行定MIME政策，單檔沿既有optimizer處理與錯誤；不支援的單檔可交optimizer拒絕一次，零canonical mutation。文字/URL不得fallback。
4. layout且可接受drop後，透過既有select(slideId)切到drop頁；捕捉slideId與首個空缺inserted-image-N。把S10同一ID/defaults計算提成局部薄helper重用，不能再造counter/registry。初始geometry仍560/288/480/320、contain、File.name alt；不按滑鼠定位、不自動避障。image drop是在新slot插入，即使drop在既有image上也不替換。
5. 接受File前取消active preview而不提交gesture；insertionBusy鎖住drop與S10插圖直到finally。S6/S10 chooser開啟時drop不得清其pending/input/value；drop pending時插圖picker不可開。沿既有S6 async語意，不擴大替換鎖政策。Single drop只呼叫insertImageFile一次，成功仍S8清selection。失敗不占ID、沒有partial component/geometry/DOM。
6. File已接受後沿S9 stable captured target：mode/slide/export/other edits不取消或重定向，latest spec的其他內容保留；target刪除或ID後占用拒絕、無自動rename/retry。finally釋放insertionBusy但不清其後其他picker狀態。
7. export不含drop transient/pending資料，offline boot恢復drop能力且無重複listener。S10 picker、S6 replacement、S7 fit、component pointer gestures仍通過。不得動S8/S9 helper/API契約、schema/dependencies/asset policy/20MiB gate；不做clipboard、多檔、crop、history、OS integration。

## 驗收／分工

Worker public mounted RED→GREEN；S11 cases含mode、nested/cross-slide target、同檔連續ID、default/oldroot preservation、dragover payload-read0/serialization0、text/URI/default保留、外部target不攔截、multi/empty、busy/chooser互斥、gesture無commit、async other edit/export/mode/removed/ID race、optimizer reject、成功revision/selection、export/remount。測試應走事件入口，不直接helper自證。
Worker scoped只明列：新S11、S10 image UI、S9 File、S8 insert、S6 selected-image UI、S7 selected-image-fit、S1 export cleanup、WP1 keyboard/selection必要相鄰。不得改既有assertions掩蓋regression。所有RED/FAIL logs與逐命令counts保留。
Worker新增tools/edx-wp2-s11-browser-cases.mjs及runner --image-drop-regression，沿S10合法三頁fixture（含無圖頁）。先S10 chooser regression證明共用helper未破，再S11事件驗收。正式browser用Input.dispatchDragEvent {type:dragEnter/dragOver/drop,data:{items:[],files:[localPNG],dragOperationsMask:1},x,y}→trusted drop→真optimizer，不可API fallback。主要正常/同檔/無圖頁/跨頁/deferred/busy/multi/reject/export-offline使用CDP；無法CDP觸發的negative可synthetic但明標，不可冒稱native。雙viewport新截圖、errors/remote0、targetClosed，記isTrusted與optimizerCalls，3×2 PNG驗decode/geometry/fit；不宣稱Finder人工拖檔或crop pixel。CDP官方schema：https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Input.pdl（2026-09-23唯讀核對）。缺方法必須回報不fake fallback。
Mainline平行只control/evidence/驗收準備；Worker STOP後審diff、full明列nonbrowser、build/ZIP lifecycle/source/protected4/hash/delta、正式host雙viewport與四支affected PGQ串行、managed cleanup；全部通過才Independent Review candidate。

## 路由與邊界

standard / clean native Worker / medium，單一shared sequential product writer；tool要求model繼承，未改Owner主對話設定。1 planned Owner外部Independent Review、0新Reviewer agent、1 implementation loop；同類兩次無進展或contract fork回主線，不自行加repair generation。
允許：runtime/deck-editor.js、新tests/edx-wp2-s11-image-drop.test.mjs、新tools/edx-wp2-s11-browser-cases.mjs、tools/edx-wp1-s4-browser-acceptance.mjs；證明必要才改tools/edx-wp1-s4-perf-mounted.mjs。禁止其他runtime/helper/schema/vendor/control/evidence/AI Core/protected、branch/commit、full/glob/browser/Chrome/ZIP/build/probe/PGQ、merge/push/deploy/subagent。log/report：/private/tmp/pptskill-wp2-s11-*。完成STOP WRITING交主線。
Prior art DIRECT_REUSE內部S9/S10/S6/browser file primitives；無新dependency、無取代。Why not less：卡片明列圖片拖入尚無入口；why not more：單檔事件adapter足夠，不需要新asset pipeline或交互模型。回退本卡明列source與ZIP即可，不修改S10 closure。

## Mainline checkpoint

詳evidence/edx-wp2-s11/mainline-checkpoint.md。scoped192/S11 29/full646/ZIP PASS；三輪1280 gesture+drop驗收未完成，1600及PGQ未跑，三輪cleanup PASS。runtime1fdb3c2，harness checkpoint6c9c02f；不做第4次盲重跑，不宣稱Independent Review candidate。

## Owner 裁決後的新驗收

2026-09-23：依 evidence/edx-wp2-s11/split-acceptance-decision.md 拆開 trusted external drop 與 synthetic active-gesture semantic seam（snap=false/true）。產品第5項契約不變；此段取代混合 CDP choreography，其他驗收不放寬。歷史 STOP／FAIL 保留，未重設失敗計數。

## 最終接續狀態

Candidate 8b0be659ea400862456f4ce0db5a0526d0623ce8；runtime1fdb3c2未改。依Owner核定split acceptance，fresh targeted154/154、雙viewport59+59、PGQ單輪16/16、managed cleanup/source4/protected4/ZIP PASS。Full646與ZIP lifecycle為同卡既有證據，未混稱本輪fresh。詳evidence/edx-wp2-s11/receipt.md與handoff_20260923_edx_wp2_s11_review.md。前三輪FAIL保留，Independent Review pending；未merge/push/deploy，未開S12。

## Closure

Owner交回Independent GO，reviewed8b0be659ea400862456f4ce0db5a0526d0623ce8，P0–P3全0。Reviewer fresh154/646；browser59+59、PGQ16為committed evidence核對。reviewed code/ZIP/protected不改；詳evidence/edx-wp2-s11/independent-review.md。已授權主線FF整合及push，實際結果另記integration-receipt。
