# WP2-S7 — 所選圖片顯示方式

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Base: `659e68489b1fee23101499ee25599eb300a40cb4`（S6已closure／merge／push，remote main及branch MATCH）
Branch: codex/edx-wp2-s7-selected-image-fit
traces_to: BACKLOG §10.1 decisions3/7/8、§10.3 WP2、§10.4 replace-asset。
Dependencies: S4 image fit canonical/render/export、S6 selected-image toolbar已GO。Frontier選fit UI；crop/insert/group/lock為後續未開scope。

## Objective / minimum

目前schema／replace-asset接受contain/cover且renderer已有object-fit，但S6工具列只提供替換檔案，使用者不能調整目前圖片顯示方式。只讓layout單選既有image在同一context toolbar切換「完整顯示」contain／「填滿」cover，fill title或說明明示可能裁去邊緣。此為既有fit控制，不實作crop metadata、cropper、zoom/position。
Prior Art: DIRECT_REUSE既有S6 native controls、CSS object-fit、S4 replace-asset。Classification: existing seam＋bounded UI glue。License/Pin: 無新增vendor，沿base既有鎖定。Bundle/portable: 新dependency0，主線量測ZIP delta。Why custom: 僅串接PPTSKILL selection/operation，無通用primitive。Why not less: API已可fit但user缺入口。Why not more: crop/insert有額外policy與schema邊界。無取代，原S6 picker/舊first-image不變。

## Contract

1. 使用既有selectedImageTarget／selection callback，layout恰一image才顯示。empty/nonimage/multi/edit/play／slide switch／clear／delete／destroy均隱藏或disable，不保留跨slide target。新增UI建議兩個native button的緊密group，aria-label及aria-pressed反映effective fit（缺省contain）。繼承原toolbar tokens，addition/operate，不加dependency或新視覺系統。
2. click時即取得current stable target及live component.dataUri，透過既有executeOperation replace-asset `{dataUri: existing, fit}`；不呼叫optimizer、不decode/reencode、不直接改canonical/DOM、不建立新operation/schema。保留alt/dataUri、其他component/slide、geometry/composition/typography/motion/style/background。拒絕未知fit／無有效target，不能fallback第一圖。相同effective fit為no-op（缺省contain點contain不補寫欄位、不加revision）。
3. UI refresh只讀selection、type與fit，不讀dataUri／serialize DeckSpec，selection熱路徑維持bounded。操作後投影與revision沿既有operation authority，UI反映更新後值。S6 picker開啟期間fit action disabled且不得失效其pending；picker change/cancel之後恢復與selection相符的狀態。
4. active drag/resize時pointerdown到fit control先取消preview，保留selection與control位置，click只寫fit，不提交geometry；keyboard啟動亦不得把preview寫入canonical。Ctrl/Meta/Alt/IME／文字input ownership原contract不變，native button keyboard Enter/Space要可用且arrow不能nudge被工具列focus擁有的輸入意圖（沿既有guard，不另造keyboard framework）。不要讓data-action被component-interaction通用click branch先清selection。
5. export移除新controls（沿S6 toolbar marker），offline reopen重新由bootstrap建立並可切fit；序列化只保留既有component.fit。source.png不改、selection/chrome不出檔。DOM object-fit與canonical一致。

## Acceptance

Worker true RED→最小GREEN。mounted cases：單選第二image、contain/cover往返/default/no-op、invalid/no-target、same-image clicked、nonimage/multi/clear/slide/mode/delete/destroy、picker pending disable/cancel/change、gesture cancel與fit-only commit、preservation、UI refresh payload reads0/wholeDeck serialization0、export/reopen。明列scoped tests：新S7＋S6＋S5＋S4＋S5 keyboard＋S4 perf＋S1 export cleanup（按必要新增相鄰檔，不glob）。
新增 --image-fit-regression 到既有browser runner，獨立tools/edx-wp2-s7-browser-cases.mjs；沿既有兩張image可render fixture、base10及listener前置。真正pointer選第二圖→點cover/contain，canonical／computed object-fit、first image/geometry/alt/dataUri保留；buttons rect/hit與pressed state；真keyboard啟動一個fit action；nonimage/multi/切頁／模式；active gesture cancel無geometry提交；export/offline reopen仍可切。保存新fit UI screenshot（不是base screenshot冒稱新UI），1280×720與1600×900，errors/HTTP/remote0、targetClosed。S6 picker browser回歸可與S7同run呼叫既有runSelectedImageBrowserCases，不改其語意、不宣稱人工OS dialog；blur/cancel synthetic照標。
主線跑full明列nonbrowser、build/probe ZIP、source/protected/hash、雙viewport正式host、四支affected PGQ串行、Browser.close/supervisor/root/marker cleanup；首輪FAIL保留。兩次同類無進展停triage，不盲重跑。全部PASS才交Independent Review，不自行GO。

## Worker / ownership

standard、單一clean Worker/medium/shared sequential writer，runtime限制繼承目前model（未另指定模型）。主線在Worker期間只寫control/evidence，不碰產品。Worker允許runtime/deck-editor.js、runtime/component-interaction.js（必要時）、新tests S7、tools mounted helper／browser runner／新browser cases；其餘需要先帶measured原因回主線。
禁止browser啟動/attach/runner或fixture runner、full tests glob、ZIP/build/probe、commit/branch、control/evidence/protected、AI Core、schema/vendor/API擴張、merge/push/deploy。只跑明列scoped node tests與node --check。log與report寫/private/tmp/pptskill-wp2-s7-*，保留RED及中間FAIL。改前CodeGraph query；無相關結果限域rg，不索引/安裝。讀使用者bootstrap／rules05/11/24。
Worker完成stop writing，交changed paths、scoped counts、指令、失敗歷史、未驗範圍；Mainline讀diff並驗收。Independent reviewer另由Owner交付，未開下一Slice。

## Mainline acceptance

Candidate501da1b（runtime c2ba9e5；harness-only Enter修補）。Worker196/196、Mainline full531/531、browser雙viewport35+35、PGQ單輪16/16、ZIP/source/protected/cleanup PASS。首輪FAIL保留；限制見receipt。handoff_20260922_edx_wp2_s7_review.md待Independent Review，未merge/push/deploy。

## Mainline closure

Independent Review GO，P0–P3全0；Reviewer fresh59/531，browser35+35／PGQ16為committed evidence核對。主線fresh source6/protected4/ZIP／control-only核對通過，reviewed code/ZIP未改；詳evidence/edx-wp2-s7/independent-review.md。
