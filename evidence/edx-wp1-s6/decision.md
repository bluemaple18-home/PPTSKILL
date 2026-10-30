# S6 decision — CONDITIONAL ADAPT / RESEARCH COMPLETE

Root question：現有Moveable可否承接8px canonical grid而不建立第二geometry authority？
裁決：保留pinned Moveable0.53.0，已有Snappable且license/hash gate通過；不新增dependency、不手刻通用snap。Production integration尚未核准為已驗收功能。

Measured gap：first-party listener只轉raw pointer，public probe在scale0.8/1各drag/resize均採7px，不採假設snap8。來源確認vendor payload早已套snap與矩陣，原點/box sizing/transform未必等於canonical。直接開snappable或再除scale都有未解mapping風險。

why_not_less：只開flag不能改canonical提交；why_not_more：既有Snappable已收錄，沒有證據需要新套件或custom quantizer。無取代。現有S5 runtime/ZIP不變。

證據：vendor-findings.md、vendor-verification.json、operation-probe.json、authority-map.md。全屬source/file/controller probe；沒有fresh browser snap，不稱runtime snap GO。Trace preflight見task；research不新增持久化schema、UI或operation。

下一frontier：sandbox/fixture-only真browser映射probe，固定slide容器與8px grid，記錄raw client、beforeTranslate、translate、width/height、bounding size、drag payload；覆蓋0.8/1、off-grid初值、drag/SE、motion transform。以實測決定唯一adapter後才開production implementation，不憑source推定單位。

本卡研究驗收完成，無需把純研究當production Independent Review候選；不回寫S5 GO或既有PGQ證據。未merge/push/deploy。

派工紀錄：dispatch.txt為705 UTF-8 bytes（不含檔末newline）；開工前preflight採1800保守上限，完成後context-preflight-exact.json補核實值，兩者PASS；shared唯一writer為Mainline，Worker唯讀。無新visible task。

## Fresh browser follow-up

24組採集完成；直接vendor payload→canonical接法REJECT，詳 `browser-mapping/decision.md`。靜態transform會改變snap尺寸/錨點，多邊吸附不等同左上角8px格點。Pointer要求值與實際取整值分開記錄。下一步限定vendor方向設定／editor-only geometry target的fixture測量，不直接接production。
