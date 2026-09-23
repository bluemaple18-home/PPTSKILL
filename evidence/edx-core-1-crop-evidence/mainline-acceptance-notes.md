# Core Crop 主線驗收注意點

這是同一卡的驗收檢查，不新增主卡、schema或流程。

- S18 API delete保持img.src原圖的content-match；成功刪目標後crop observer/callback不能復活style或late submit。
- Crop／reset若projector style mutation前後throw，除了canonical/DOM/revision，也驗owned observer/cache在後续resize仍回正確舊狀態，不能回放未提交candidate。
- Range input preview不能計算whole source SHA或wholeDeckSpec serialize；source/cache比對與commit hash分開，UI draft only。幾何preview/ResizeObserver亦只用已驗snapshot。
- reset保Evidence分類；接著S7 cover／same-source replace fit cover／raw component patch cover須原子拒絕。no-crop Evidence仍contain，legacy未分類不受影響。
- imported/raw cropped intent tuple不匹配reviewDigest時full contain pending；同尺寸source change、crop/protectedRect/classification change皆不沿用確認。保留原圖，沒有source archive/history claim。
- 既有asset async切頁仍寫captured target的語意不直接複製到crop dialog；crop stale/slide switch必取消，晚到decode/submit不變錯頁。
- pixel oracle必來自真CDP screenshot，不能只對同一projection函式的輸出作等式測試；避開抗鋸齒邊緣但明示excluded點。原圖／crop preview分列，原型216checks不混作產品acceptance。
- Evidence重要內容AABB和manual confirm是人工提供；程式只保AABB可見，不驗真假、漏標、語意或OS input。
- GIF/SVG/JPEG/WebP不重編碼／不換src；若只驗PNG須明示格式涵蓋，不由PNG原型推定所有decoder／動畫已驗。
- mounted API shim限真browser能力，不為green改產品能力或放寬exact schemas。
