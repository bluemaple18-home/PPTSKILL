# WP2-S10 — layout image insertion chooser

Status: COMPLETE / INDEPENDENT REVIEW GO
Base/main/origin-main: d0b9aa05c50b09596920705bbbf4dd632c9137d4（S8/S9 Independent GO closure已FF整合／push並遠端readback）
Branch: codex/edx-wp2-s10-insert-image-ui
traces_to: BACKLOG §10.1 decisions3/4/8、§10.3 WP2、§10.4 insert-element。
Dependencies/frontier: S6 chooser、S7 fit、S8 canonical image insertion、S9 File adapter均GO；剩缺口是人手UI入口。無新canonical/schema/policy/history/crop/drop/clipboard。

## Objective / design

layout toolbar增加「插入圖片」與專用native file input，走S9 insertImageFile，讓沒有image的slide也可插入。不直接append DOM或另寫optimizer／mutation path。
Prior Art DIRECT_REUSE：S6 selected chooser/native button/input、S9 adapter、S8 insertion、既有layout selection/mode callback與export chrome cleanup。CodeGraph未找到相关symbol，rg定位實碼。新增dependency0、license/pin沿base；ZIP量delta。Why not less：API無法供人手直接選檔插入；why not more：不擴張asset editing/crop/drag-in/autolayout。無取代。
Frontend change mode=addition，surface=operate；沿現有toolbar tokens/native controls/keyboard/flex-wrap，不另建visual world或design system。新按鈕清楚label、focus可見，1280與1600均無clipping；不得在mousedown→click間因focus導致toolbar縮移而丟click。

## Contract

1. layout enabled且目前canonical slide與唯一DOM存在時可用「插入圖片」；empty/nonimage/single/multi selection都可用。不在play/edit提供；tear-down/disabled mode不能留可用入口。既有replace-selected-image／fit／legacy first-image input不改語意。
2. 點擊當下捕捉slideId與新componentId，取消active drag/resize preview但不commit。新ID只在該slide content.components集合用最小未占用 `inserted-image-N`（N从1開始，bounded最多components.length+1次），不寫counter/reservation／registry。既有S8 preflight仍是identity authority，碰撞/invalid拒絕，不rename。chooser/cancel/invalid不新增component或geometry。
3. 初始geometry固定 `{x:560,y:288,width:480,height:320}`（1600×900內、8px grid、安全區），fit明示contain；這是UI caller預設，不改S8/S9 API契約，不宣稱自動避障／最佳排版／natural-aspect自動尺寸。alt採File.name字串（無可用name則空字串），僅檔名標籤，不假稱語意描述。成功仍沿S8 clear selection一次，不加新auto-select authority；使用者可再真pointer選新image/fit/drag。
4. 專用input change只消耗自己pending insertion snapshot，reset value可同檔重選；呼叫S9 insertImageFile一次，成功/失敗都釋放UI busy。缺file/cancel/click拋錯清pending/value與busy。無pending的change不能optimizer/fallback当前slide。同檔連續成功兩次必須兩個不同ID；失败／cancel不永久占用ID。
5. chooser blur清selection但不能丟pending insertion；顯式slide/mode/新selection intent取消尚未change的pending，沿既有callback理由，不建第二個event bus。mode與slide的focusin path也必須覆蓋。S6 replacement與S10 insertion chooser互斥；不允許晚到/錯input的change或cancel把另一個active picker的intent清掉／跨送。只需薄UI pending kind/flags，不造通用FSM／controller。
6. S10從chooser open到File optimization settlement保持插入button忙碌/disabled，防同UI多次啟動；選檔後先consumed snapshot，再await。optimizer開始後沿S9 stable target policy：切頁/mode/export不重定向或取消已接收File，其他修改保留；target刪除／ID被別的operation占用／invalid/optimizer reject則原子拒絕、不換ID重試。busy解除要finally，但不得覆寫其後新picker狀態。既有S6 optimizer語意不變。
7. Export clone清新input/chrome/pending UI marker，offline boot可以恢復此入口。永久toolbar不得標成可被live selection teardown刪掉的transient root。沿現有markup+bootstrap兼容舊HTML，無input duplicate、export不洩UI state。20MiB既有export gate不變。

## Acceptance

Worker public mounted true RED→GREEN。明列cases：play/edit/layout、empty/nonimage/multi/no-image slide、active gesture open無commit、capture→blur→change、cancel/empty/clickthrow/reset同檔、stale slide/focusin/mode/newselection、無pending／wrong input／兩種chooser互斥、busy重入、async捕捉與export/其他修改、removed target/IDcollision／optimizer reject零partial、uniqueID首個空缺、defaultgeom/alt/fit、revision/selection一次、teardown不刪永久toolbar、export cleanup/remount。不得改既有assertions掩蓋regression；need callback薄擴充可但不改gesture/selection authority。
Worker scoped明列：新S10 tests、S9 file insertion、S8 insert、S6 selected-image UI、S7 fit、S5 targeted File、S1 export、WP1-S8 selection與WP1-S5 keyboard（確認現存檔名）；必要相鄰bounded但禁full glob/browser/ZIP。

新增tools/edx-wp2-s10-browser-cases.mjs與 --insert-image-ui-regression：沿runner base10、S4 fixture與S6 CDP chooser seam；真pointer點插圖button，捕捉fileChooserOpened/backendNodeId必須專用input，DOM.setFileInputFiles使用小3×2非方形PNG走真change/optimizer。不得改成直接API冒稱UI。兩viewport驗default geometry/alt/fit/新ID、old spec/root保留、default/no-image slide、同檔重選、blur/cancel/切頁失效、busy與deferred/File target capture、S6互斥與replacement regression、export/offline再插新圖、真pointer選圖/fit、button rect/hit/focus/無clipping、新control screenshot。blur/cancel可synthetic明標，記naturalBlurCount／trusted change；CDP chooser非人工OS dialog。

Mainline負責正式host雙viewport1280×720→1600×900、errors/HTTP/remote0/targetClosed、四支affected PGQ串行、full明列nonbrowser、ZIP lifecycle/source/protected4/hash／delta、Browser.close/supervisor與exactowned cleanup。Worker禁上述。S8歷史I/O根因未知，本卡不修AI Core；FAIL完整保留，無證據不盲retry。全部通過才交Independent Review，非自封GO。

## Worker / boundaries

standard固定UI glue；1 clean native Worker/medium/shared sequential product writer，主線平行只control/evidence。native runtime模型繼承（未獲Owner指定model override），不改主對話設定；1 planned Independent Review沿Owner現有外部review交回，非本輪另spawn。1 bounded implementation loop；同類兩次無進展/contract fork即回主線；不自行第二代repair或加subagent。
允許：runtime/deck-editor.js、新tests/edx-wp2-s10-insert-image-ui.test.mjs、新tools/edx-wp2-s10-browser-cases.mjs、tools/edx-wp1-s4-browser-acceptance.mjs；證明必要才動runtime/component-interaction.js、tools/edx-wp1-s4-perf-mounted.mjs。禁止S8/S9契約/helper、schema/dependency、其他runtime、control/BACKLOG/task/evidence/protected/AI Core、commit/branch、full/browser/Chrome/attach/ZIP/build/probe、merge/push/deploy。先CodeGraph無相關則rg；讀Ownerbootstrap與rules05/11/24，Node /opt/homebrew/bin/node。logs/report寫/private/tmp/pptskill-wp2-s10-*，保留RED/FAIL與逐命令counts/sourcehash。完成STOP WRITING交主線，未宣稱candidate/GO。

## Mainline acceptance

Candidate `7f79b58bdd492c90fd1bf6d510c7692492c94a84`。S10 31/scoped181（重疊不相加）/full617，browser23+23、PGQ單輪16、source6/protected4/ZIP/cleanup PASS。歷史FAIL保留，詳receipt。Independent Review pending；S10未merge/push/deploy、未開S11。

## Independent Review closure

Owner交回GO，P0–P3全0；reviewed SHA `7f79b58bdd492c90fd1bf6d510c7692492c94a84`。Reviewer fresh targeted125/full617 PASS；browser23+23及PGQ單輪16為committed evidence核對。正式紀錄：`evidence/edx-wp2-s10/independent-review.md`。本節取代上文歷史pending狀態；產品與ZIP未變，未merge/push/deploy，S11未開。
