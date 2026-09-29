# Core3 驗收 fixture 遮擋：有界修復

Status：CLOSED / FUNCTIONAL_PASS / VISUAL_PASS。fixture有界修復完成，雙viewport各12/12、PGQ16/16、兩審實圖與收尾GO；產品／ZIP保持。最終裁決見 `evidence/edx-core-3-undo-redo/visual-fixture-closure.md`。

已完成契約：只移驗收用A/B至y600並補遮擋gate，產品／字體／ZIP不改；新雙viewport、四PGQ及PNG人工核對通過，Core3關閉。下方保留假說、因果診斷與Owner接續歷史。

## 原始假說與提案（已由因果證據及Owner接續取代，不再執行font／ZIP修法）

目標：只修主標題字體／tracking／Latin-CJK間距，維持文字內容、既有視覺identity、版面geometry與Undo/Redo行為。change_mode=refinement；surface=read；沿用既有米色畫布、黑色粗標題、原type scale／配置，禁止全頁redesign、新字體下載、vendor/runtime/scanner/policy修改。

假說：負tracking導致字形ink越界（改tracking應讓mixed-script邊界留白）；替代假說是fallback字體metrics與glyph ink不一致（tracking不足時才檢查實際font與ink）。先從原render source確認；不調viewport或選取框掩蓋碰撞。

範圍：最小標題CSS或既有typography seam、對應回歸測試、現有browser harness加入mixed Latin/CJK文字bounding-box與正式截圖gate。不得以非重疊advance rect單独保證glyph ink，需截圖人工核對；gate須對原壞樣式有RED證據。現有host controller沿唯一canonical入口重用，新本輪output/manifest固定新產品hash，不覆寫原host evidence。產品與ZIP身分必須更新，不能沿用原產品未變closure。

驗收：原壞樣式RED→最小修復→1280×720與1600×900標題可辨識且無Latin/CJK碰撞；原Undo/Redo功能回歸與四affected PGQ串行，browser error arrays、close、root/marker/group cleanup有效；更新產品來源與ZIP內容／SHA256；有界code＋visual證據review。既有AI Core71b774d3／R2 recovery證據保留，無scanner repair；receipt I/O P2與Crop F2/P2保留。若host observation contract再失敗按原停止規則，不自開R3。未授權push/deploy/Core4。

分工：Worker僅寫產品最小修復、tests及現有browser harness；不buildZIP/launch/commit。Mainline寫控制／新manifest／收據、build與正式host。兩者不交叉寫檔；frozen候選再review，原a3c93c8收據保留但在本卡與上層明示已撤回clean closure。


## 根因反證與診斷接續

原fixture與三份原始HTML的role-title textContent都是「成果，不鎖在工具裡」，沒有Latin BI。harness另外為Undo測試注入A/B，geometry為(120,120)/(360,120)、180×120；renderer會補render非slot手動geometry元件，且selected.png拍於Undo專項之前。這支持fixture疊到標題的替代假說，負tracking尚不能當成已證實根因；Worker未改產品或原harness，先前自行新增的CSS條件RED不作因果證據。

下一步僅一次受管唯讀paired診斷：同一原export檔、雙viewport，原樣／只tracking=0／只把A/B的top移600，保存PNG和DOM文字、computed styles、intersection。此為暫態頁面診斷，不改產品或fixture檔；若A/B位置是根因，font-only修法及新ZIP需求須向Owner說明並改判，不能為迎合原假說而改產品。a3c93c8仍不推，Core3保持VISUAL_NO_GO。

## 因果結果

正式雙viewport三組對照已完成；只改tracking無法消除遮擋，只移A/B至top600即消除，title與rightquote完整snapshot不變。根因為test fixture覆蓋，詳evidence/edx-core-3-undo-redo/visual-title-root-cause.md/json。產品與ZIP未改；已向Owner提出改修fixture與遮擋gate，回覆前停留FUNCTIONAL_PASS / VISUAL_NO_GO、不套用font或fixture修法。


## Owner「繼續？」：採用fixture修復方案

Owner在主線以白話說明「測試A/B文字放錯位置、應移開並補遮擋檢查，產品ZIP不用改」後指示繼續。本輪據此採用唯一已辨識的fixture修復scope，取代最初font-only／新ZIP假說；不再重問相同授權。

只將harness history-a/b的y120改600，x／尺寸／原標題／產品CSS不動；新增標題vs可見fixture bounding-box遮擋gate，舊120位置必須在真browser被拒，恢復600後通過。測試元件必須可見且留在viewport內，不能靠隱藏或移出畫面過關。正式選取截圖處保存gate量測＋RED/綠PNG，主線直接看兩viewport。維持原Undo/Redo 11項及4支PGQ串行，不用新fixture取代產品測試。

Worker是唯一delivery writer：harness、小型gate helper／針對測試；另從已審owned-group client/controller作最小copy，只換本輪輸出路徑與manifest/audit身分，原流程／group／cleanup authority不改。保留舊檔案及歷史raw不覆寫。Mainline寫control artifacts、凍結manifest、核对hash後正式host；產品75／protected4／ZIP與AI Core71b774d3必須全保持。原I/O P2保留，本輪不push／deploy／開Core4。新gate與copied seam有界review，host全部PASS與PNG檢查通過才重新裁決closure。

## 最終驗收

2026-09-29唯一正式host通過，兩位Reviewer分開code／實圖／host收尾均GO；詳visual-fixture-closure.md及本輪host mainline receipt。705 scans全COMPLETE、RECOVERY_NOT_OBSERVED，root/marker/PID清理與固定身分核對通過。既有兩項P2保留；六卡恢復3/6，本輪僅local checkpoint，沒有push/deploy/Core4。
