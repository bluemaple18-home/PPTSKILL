# WP2-S9 — explicit File image insertion adapter

Status: IN_PROGRESS
Base: 7c614603dc11b9276e73f3b916d25ad046118571（S8 closure，Independent GO；未merge/push）
Main/origin-main: 74d63cc99e745b373adbcc3a56e9228576e74b22
Branch: codex/edx-wp2-s9-insert-image-file
traces_to: BACKLOG §10.3 WP2 Content / Asset Editing；§10.4 insert-element。
Blocking edges: S8 canonical image insertion GO、S5 File optimizer adapter與S6/S7既有圖片controls GO，均已解除。Frontier是File→S8 operation→live/export/reopen；picker/drop/clipboard/auto-ID另卡。

## Objective / minimum

S8僅dataUri operation，現有optimizer可處理File但只有replaceImageFile對外adapter。新增portable `window.PPTSKILLEditor.insertImageFile(file, options)`，不新增Node File API。Prior art DIRECT_REUSE：S5 replaceImageFile、既有PPTSKILLAssets.optimizeFile、S8 imageInsertion與executeOperation。CodeGraph query未找到相關source，限域rg讀實碼確認。無新dependency／schema／registry／writer；why not less：呼叫者不需另接optimizer且必須固定async target；why not more：不擴大picker/UI/自動ID/geometry配置/crop。無取代。

## Contract

options精確為 `{slideId, componentId, alt, fit?, geometry:{x,y,width,height}}`。明示slideId與componentId，alt required string，fit optional contain/cover。所有record採S8相同own-data exact keys/prototype/symbol/getter邊界；完整safe geometry不clamp/default。null-prototype、frozen／non-enumerable合法own data可用；非法getter在讀取前拒絕。

1. `file` falsy時比照S5回null、optimizer0、無mutation；其餘file驗證完全沿既有optimizer，不新增File type/policy authority。optimizer missing fail loud。
2. 在optimizer前驗options、target slide存在、component ID未存在、geometry與既有identity不改名。snapshot成自有plain records，caller後續改options／nested geometry不能改實際target與payload。可在runtime/image-insertion.js將S8既有metadata驗證／identity-preflight作最小共用抽取，勿另寫第二套asset MIME/bytes/SVG／geometry／resolver；禁假PNG或fake dataUri占位繞前置驗證。
3. 僅呼叫既有optimizeFile一次；await後走現有S8 executeOperation一次，使用捕捉metadata＋optimizer.dataUri，回傳同一optimizer result物件。必要message/result結構檢查要在mutation前，不能已插入才因warnings格式throw。optimizer拒絕／malformed result／invalid dataURI／missing target／duplicate ID／identity collision／DOM prepare或append throw，均不得留下本次component/geometry/new DOM/revision/selection變動。錯誤沿Promise reject，沒有silent fallback。
4. await期間切頁／mode／export（會clone spec）不重定向、不以物件reference判stale；保留進行中的其他content/geometry修改，使用完成時最新spec驗證與提交。target當時不存在即拒絕；不建ABA registry/history。兩個pending同slide+componentId競爭：第一個完成成功，第二個duplicate拒絕，不覆蓋。不同ID可各成功；跨頁同componentId可用。
5. 沒有UI pending manager／新input/button。只在S8成功commit後沿既有cancel/clear/revision一次；invalid／optimizer pending/reject不能主動取消既有gesture。既有S5replace/S6picker/S7fit/S8operation不改語意。S8直接dataURI允許set完整source；S9新圖source必經現有optimizer。20MiB沿既有export guard，無per-insert aggregate admission。

## Acceptance / red → green

新tests/edx-wp2-s9-insert-image-file.test.mjs：一個public API true RED；成功default/explicit fit／cross-slide/null-proto/frozen/non-enumerable、invalid options/getterCalls0/optimizerCalls0、caller mutation、deferred真async＋切頁/export＋其他edit preservation、removed target、競爭同ID與不同ID、optimizer reject/malformed/policyinvalid、missingDOM與append-after throw、結果object identity、revision/selection/gesture、export/reparse/remount恰一新root。沿mountedEditor既有double，不冒稱File decode/browser evidence。只能必要時擴充既有double，不能改原測試預期來掩蓋行為。

Worker scoped commands（各明列，不用glob）：新S9、S8 insert-image、S5 targeted-image-file、S6 selected-image-ui、S7 selected-image-fit、S4 replace-asset、S1 export-cleanup。每次test只指定檔案，禁止full、browser/Chrome/attach、ZIP/build/probe。

新增tools/edx-wp2-s9-browser-cases.mjs、runner --insert-image-file-regression（保留base10及listener/target cleanup）。沿S4 fixture與S8 browser seam，至少一張非方形3×2 PNG建立真File，呼叫真optimizer（可外包deferred gate但內部必真optimizer），驗decoded尺寸／src／alt／fit／geometry／唯一root、async captured identity＋切頁/export、invalid preflight optimizer0、optimizer失敗零sideeffect、duplicate競爭。新圖後續既有true pointer選取／fit可用，export與offline reopen可用。回報API-driven File/optimizer，非native picker/OS clipboard；新圖＋controls截圖兩viewport。不要因沒有UI而假造插入按鈕。

Mainline：明列full non-browser、build/probe ZIP／delta、source/protected4/hash、正式managed host雙viewport1280×720→1600×900＋四支affected PGQ串行；cleanup与歷史FAIL保留。S8環境I/O errno未知不在S9修AI Core；同故障再現按停損triage，不盲重試。全部通過才交Independent Review，非自封GO。

## Worker / routing

strict/core-bounded：固定async adapter契約與零部分提交。單一clean native Worker/high，shared sequential product writer；主線只control/evidence直到Worker STOP。runtime限制未明示模型不可override，因此沿runtime inherited model，不降低主對話設定。1 Worker／1 planned Independent Review（Owner現有external review handoff，非本輪額外開Reviewer）／0 Repair。最大一個bounded實作循環，第二代Repair須Owner成本核准。

允許product：runtime/deck-editor.js、runtime/image-insertion.js、新S9tests、新S9browser-cases、tools/edx-wp1-s4-browser-acceptance.mjs；只有證明必要才動tools/edx-wp1-s4-perf-mounted.mjs。禁止其他production、schema/dependency、control/evidence/task/BACKLOG、commit/branch、protected、AI Core、merge/push/deploy、subagent。Node /opt/homebrew/bin/node；先CodeGraph query，無結果rg。讀Owner bootstrap與rules05/11/24。logs/report寫/private/tmp/pptskill-wp2-s9-*；保留RED/中間FAIL、逐命令counts、changed paths/sourceSHA。STOP WRITING後交主線，不宣稱browser/candidate/GO。
