# Core3 主標題混排碰撞：有界修復

Status：FUNCTIONAL_PASS / VISUAL_NO_GO。Owner指出正式1280/1600截圖BI與中文碰撞，原各11項與PGQ16/16不能作clean visual GO。Mainline已直接看兩張原PNG，接受此P1；a3c93c8不推送，核心退回2/6，Core3重開。

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
