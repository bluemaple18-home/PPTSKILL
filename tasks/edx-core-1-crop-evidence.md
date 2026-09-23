# 核心完整版 1/6：Crop＋Evidence 圖片安全裁切

Status: CLOSED_WITH_P2_RESIDUAL / INDEPENDENT_GO_WITH_RESIDUAL
Branch: codex/edx-core-crop-evidence
Base: 01e89d1（S18 主線 closure＋證據格式補正；尚未merge/push）
Owner scope: tasks/edx-core-six-card-closure-plan.md 第1項；原六張計數不增減，不開S19。
Traces to: BACKLOG.md §10.1 Replace-first + Safe Insert、§10.2 Cropper.js prior art、§10.3 EDX-WP2 Content/Asset Editing；working-spec.md FR-003 deterministic validation、FR-005 portable editor safety、SC-002 offline雙尺寸、SC-004 claim來源可定位。

## 本卡完整交付

人手可選單一圖片，開裁切介面、預覽、取消或確認，重設完整原圖；保存／離線重開仍能調整或還原。沿現有executeOperation／stable identity／asset authority，不另造editor model或永久DOM authority。Evidence圖片的來源完整性與重要上下文必須有明確guard；保留完整原圖，不以裁切結果取代唯一Evidence。
原圖dataUri不可因crop重採樣／覆寫；同一geometry／motion與其他內容保留。crop既不是resize，也不能把vendor transformed viewport payload直接寫canonical。
本張包含必要schema/sanitizer、共用Node/portable contract、renderer、UI、export/reopen、測試、vendor及驗收；Mapping/Implementation/Acceptance只是本卡內階段，不能拆新主卡。

## 已測得缺口及最小研究

2026-09-24 Mainline CodeGraph查crop/image只回無關symbols，限域rg確認：image component只有id/type/alt/dataUri/fit；沒有crop或Evidence image分類。claims/sourceRefs是deck/slide層級，不能自動當圖片provenance。既有replace-asset只投影img src/alt/object-fit；normal renderer與portable各有markup seam，必須同一純投影契約。
官方Cropper.js API提供selection與image transform；目前docs顯示2.2.0，但尚未核registry pin／license／bundle，不能宣稱已採用。參考 https://fengyuanchen.github.io/cropperjs/api/cropper-selection.html 與 https://fengyuanchen.github.io/cropperjs/api/cropper-image.html 。

先完成同一卡mapping：
1. cropper selection→原始像素／normalized rect的轉換，非方圖、縮放／位移／兩viewport；與canonical component geometry分離。實測前不得直接採vendor event。
2. 比較保留原圖的最小投影方法，說明與replace/fit/geometry/motion的相容性及export尺寸成本。禁第二份全DeckSpec或per-pointer whole payload serialize。
3. Evidence guard：不得把「原圖還在」等同「裁切沒遮標籤」，也不能虛構OCR／自動語意驗證。比較既有分類缺口下的保守policy、顯式人手確認與必要的protected region；選最小足夠方案並明示能力界線。
4. runtime-native優先；若native control不能滿足互動需求，採exact-pinned MIT Cropper.js薄adapter。核原始授權／integrity／dependency與portable成本，不採CDN或latest。
主線先裁決mapping再實作；不把研究artifact當production驗收。

## 驗收契約

- 原圖保留、合法crop/reset、非法範圍／NaN／零尺寸／wrong target原子拒絕；Node/portable一致。
- 使用多色且含軸／標籤的非方image fixture，正確比對裁切內容，不能再用1×1白圖冒稱像素驗收。
- Evidence guard對缺少分類／確認、保護區被裁掉、換圖後舊確認、原圖取回有具名驗證；語意人工確認與程式幾何檢查分列。
- Cancel/Escape、stale identity、slide switch、async decode、busy chooser/dialog／gesture、失敗rollback、單次revision與selection清理均沿既有契約。
- Replace預设保存既有geometry與crop意圖；若原圖變更導致Evidence確認失效，必須明示且重新驗證，不能默默沿用舊來源確認或移除原Evidence。
- schema/sanitizer/renderer/editor/export/recipient reparse一起保存，舊deck不受影響；20MiB不放寬，export無cropper chrome／transient state。
- scoped與full nonbrowser、fresh ZIP lifecycle；正式managed browser雙viewport 1280×720/1600×900，真pointer與pixel／computed assertions、errors0、targetClosed；四支affected PGQ串行16與完整cleanup。
- Review依實際風險；不默認新增每個子階段Reviewer。主線驗收後停獨立candidate，未授權merge/push/deploy。

## 範圍及回退

不做Group/Lock、Undo/Redo、draft/recovery、Recompose、video、AI bridge、任意rotate/skew／image filter。原始image不可被不可逆替代。單branch順序writer；source/ZIP/protected基準沿S18記錄，開始實作前另存本卡baseline。
初始委派只做唯讀mapping與自有隔離probe，輸出 /private/tmp/pptskill-core-crop-mapping.md；禁改repo/AI Core、禁browser launch／install／build／git mutation。主線同時收尾S18證據，不重複Worker研究。

## 主線 mapping 裁決與固定實作契約（2026-09-24）

Math-only16組120assertions主線重播PASS；不採vendor座標直寫。改採已fresh browser驗證的native CSS projection：projection-host-01 8案例/216pixel checks PASS，src原字串不變，readiness/Browser.close/supervisor/owned cleanup PASS。此為PNG primitive prototype，不是production adapter／全部格式驗收。
原Worker SVG dataURI提案保留在mapping.md，未採用：原img＋CSS width/height/left/top/inset clip即可工作，沒有nested SVG／二次解碼、encoded src增量或canonical sourceSize需求。純projection吃natural dimensions＋frame size，所有永久crop只有normalized source rect；不碰figure motion transform。

### Canonical與operation

- 兩個optional欄位：image.crop = {x,y,width,height}；image.imageSafety = {classification:'decorative'|'evidence', protectedRect?:{x,y,width,height}, reviewDigest}。crop存在必須有imageSafety；reset後imageSafety仍保留。reviewDigest=SHA256(UTF8(JSON.stringify([dataUri,crop??null,classification,protectedRect??null])))，固定tuple/欄位順序；它綁source＋裁切意圖＋保護資料，不是簽章。無sourceSize、第二份original dataUri、provenance/history registry。
- `crop-image`為既有registry的一個operation：value包含rect欄位、classification、Evidence必需protectedRect、confirm:true；reviewDigest由authority對目前source/rect/safety tuple計算，不讓payload自行宣稱。exact plain data／finite normalized／right-bottom≤1。Evidence crop須包住protectedRect，且同一次commit將fit設為contain；decorative保留fit。只有原圖/最終preview的人工確認，不宣稱自動語意驗證。
- `reset-image-crop` value={confirm:true}，只移除crop但保留imageSafety／Evidence分類；對新null-crop tuple重算reviewDigest，恢復完整原圖，不冒充Undo/Redo。無crop時no-op不增revision。仍沿同一registry，descriptor準確列mutates/preserves與QA invalidation。Node/portable同一純contract。
- 換圖是既有明示replace行為，無需本卡新增舊來源歷史。保留crop rect/人工意圖，但來源digest不匹配時active crop不生效、以完整原圖contain安全展示，UI明示「裁切待重新確認」。重新確認產生新digest。即使source同尺寸也失效；未分類/未確認不可建立active crop。既有raw component patch/reparse也必須經同一shape/active-state邊界。
- Crop不能覆寫dataUri／永久丟棄原圖；真正replace仍依原契約替换。這修正本卡前文「換圖不可移除原Evidence」的過度解讀，不發展history。
- review digest供stale辨識，不是認證、簽章或PKI。源字串只在來源或crop/safety變更／確認時hash並cache；pointer preview／ResizeObserver不得重hash或wholeDeckSpec serialize。未授權的raw crop/分類/保護框變更也會使digest失配，pending full-image contain。Evidence任何fit=cover均拒絕，包含S7/replace/patch/import；不能藉reset抹分類後繞過。decorative的fit可改，因不在tuple而不額外失效；Evidence固定contain，geometry不改來源可見範圍。

### 最小hash採入

現有Node SHA256 helper依node:crypto，不可直接序列化到portable；native WebCrypto digest為async，現有executeOperation/clean contract為sync。為保持同一契約，僅vendor synchronous sha256：@noble/hashes 2.0.1，MIT，registry integrity sha512-XlOlEbQcE9fmuXxrVTXCTlG2nlRXa9Rj3rr5Ue/+tX+nmkgbX720YHh0VR3hBF9xDvwnb8D2shVGOwNx+ulArw==。root package/lock只加exact devDependency；isolated pnpm --ignore-scripts source在工作區.tools/pptskill-crop-hash/node_modules/@noble/hashes，下載/store均.tools。
沿既有esbuild/vendor metadata/license pattern，只bundle sha256必要inputs，不帶其他crypto、network/storage/entropy API。Node可用native createHash，同一UTF8 known vectors/large data與portable parity必驗。build tool可接受--package-root作本次隔離source，fresh pnpm install後預設root node_modules；不改全域node_modules。記錄完整input hash/size/registry pin，ZIP增量實測。Why not less：不自寫crypto、不把async帶入既有sync operation；why not more：不引入Cropper或crypto registry。

### UI／projection／lifecycle

採addition/operate，繼承S16 native dialog與既有editor視覺；不新增SGDS套件或全頁visual route。
Visual route: compact editor dialog；audience簡報編輯者；layout原圖/結果雙preview，上方用途選擇，rect為成對原生number/range欄位，下方確認/取消/還原；density中等；type/palette沿既有dialog；asset只用真選取圖；避免新brand/cards、夾雜implementation文字。
Evidence另顯示一個保護矩形欄位群與原圖overlay，預設完整原圖（保守）；可手動縮為重要上下文的AABB；人工確認未勾不可套用。數字/原生range可keyboard與真pointer操作，不承諾drag-cropper primitive。單張image才有裁切入口，toolbar不溢出1280。
preview只在dialog內，不寫canonical；confirm一次revision。Cancel/Escape/slide切換/stale/source換掉/selection變更/async decode錯誤/busy皆不partial commit；沿既有dialog/chooser互斥与gesture取消語意。S18刪除失效目標也不讓晚到confirm復活。
可攜live、normal renderer、export clone/reopen都由同一crop投影契約；原圖img.src保持，decode尚未完成／無能力時先完整原圖，不假稱裁切已投影。ready後套naturalWidth/Height；geometry／viewport變動用既有接點或有owned cleanup的ResizeObserver更新純CSS。export不攜preview observer/dialog/cache；reopen重新投影。legacy no-crop不加listener或改style。

### Worker write-set / 驗證

同一卡原Worker接續：runtime/image-crop.js、必要vendor builder/helper/metadata/license/bundle、deck-editor.js、deck-spec.js、full-deck-renderer.js、schema、tests/edx-core-crop*.test.mjs、tools/edx-core-crop-browser-cases.mjs與既有acceptance harness一個--crop-regression分支；工具mounted double必要時薄補browser API。不改S18 evidence/protected/dist/package pin/AI Core/control docs。只有必要精確operation allowlist測試可增literal，不放寬assertions。
先RED→GREEN，fresh focused/scoped（列實體files）；不跑browser/ZIP/full，交主線正式驗收。browser harness需以真多色含軸標籤fixture與pixel oracle驗confirm/reset/Evidence拒絕/換圖pending/export/offline/不同frame比例，不能只驗數字；既有S18 deletion與crop dialog競態要測。
不commit或push。疑似既有外部host根因不處理；有本卡bounded明確failure直接修，兩次無進展帶證據交回。

Implementation啟動前發現reset/fit繞保護seam，Mainline暫停同一Worker後修正為上述imageSafety分離／review tuple契約；Worker當時僅新增39行RED test，尚未runtime mutation。RED原log保留，不算Repair第二代或新主卡。

## 首次獨立產品審查與 Repair 1

固定候選b364cd8（runtime/ZIP=0b88f60），clean Reviewer完整bounded source review＋fresh scoped331，CHANGES_REQUESTED，P2=5，P0/P1/P3=0。此裁決取代主線先行code GO；不新增主卡。
F1 persisted pagehide/pageshow恢復投影；F2 raw patch投影失敗回復原DOM與ownership；F3 reset提交尾段失敗回復observer/load ownership；F4 standalone HTML攜完整noble MIT授權並驗hash；F5 decorative cover preview維持target frame比例，人工所見與commit一致。
同一Worker Repair1只處理上述5項及相應regression/browser evidence；不改canonical schema/authority、不重開mapping、不加新dependency。不修改S18/AI Core/protected/control，主線仍負責full/ZIP/正式browser/PGQ與同一Reviewer targeted複審。
原host03正常路徑PASS不能抵銷這5項具體重現；修復後產品SHA/ZIP須重新凍結，host與PGQ不得把修前結果冒算修後。

## 最終 closure

Product：2db6185d13a6713700d0186758b1261ff23b9d85。原Reviewer整卡GO with residual；P0/P1/P3=0，F2仍OPEN/P2（舊teardown先完成副作用再throw，ownership flag可能失真），其餘F1/F3/F4/F5 CLOSED。沒有普通browser自然觸發證據，保留至原第6張Final Closure，不啟Repair2或另增主卡。

Mainline fresh27/339/972 PASS；Reviewer fresh27/339 PASS，11probes9PASS/2FAIL明列同一P2。修後browser45+45 records／2475pixels PASS；PGQ16unique=15+1，非單輪16；Evidence dialog雙viewport visual PASS。host04真NOT_PASS、host05 raw總結NOT_PASS/exit1完整保留；host05實際steps全0，獨立34fixtures與實檔核對確認舊欄位false-negative。

完整裁決：evidence/edx-core-1-crop-evidence/mainline-closure.md；獨立審查：review-repair1/final-whole-card-addendum.md。產品／ZIP固定、20source/4protected MATCH。未merge/push/deploy，Group尚未開工。
