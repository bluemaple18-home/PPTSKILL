# 主線直接檢視畫面

已直接開啟：host-acceptance-03/crop/1280-crop-ui-confirm.png、1600-crop-offline-reopen.png、1280-crop-reset.png。

- 裁切確認後選取框及resize handle可見，底部裁切／替換／fit控制列在1280未超出viewport。
- 離線重開與圖片裁切/原src保存的pixel驗證一致；play mode未殘留選取chrome。
- reset圖可見完整原圖AXIS與底部座標軸。此時source已是明示replace後的variant，並非虛構歷史原圖Undo。
- fixture固定geometry會覆蓋簡報既有subtitle，這是驗證fixture配置，沒有宣稱自動避障／重排。

另直接開啟host-acceptance-02/crop/1280-crop-rollback-crop-image-before.png，確認直圖遮擋橫圖resize底部；FAIL保持原樣。

正式26 records內無dialog開啟截圖，因此不能據此宣稱dialog visual已驗。補充dialog visual gate待獨立evidence完成；不重跑已PASS的產品/PGQ assertions。

Repair1 的正式harness已增加dialog截圖；先前dialog-visual-probe.mjs與dialog-visual-controller.py僅prepared，從未執行，已被修後host04驗收取代。

## 修後畫面核對

已直接檢視host-acceptance-04/crop/1280-crop-preview-portrait-open.png及1600-crop-preview-landscape-actions.png。對話框位於viewport內，用途/數值/滑桿/checkbox/狀態/取消確認可辨識，開啟有focus ring，直/橫結果frame依target比例，action screenshot按鈕都可見。這兩張是decorative分類，不能代表Evidence追加欄位已視覺核對。

因此將先前未執行的dialog visual probe重用為Evidence分類補充（source改指修後host04），待本輪PGQ完整cleanup後串行執行；不改產品、SHA或ZIP，不重跑PGQ。此前「已取代」只描述當時計畫，非聲稱該probe曾執行。

## Host05 Evidence 畫面實測完成

實際只在 host05 同一 managed lifecycle 內，PGQ 單一失敗 case 重驗後串行執行 dialogVisual。獨立的 dialog-visual-controller.py 從未執行。直接檢視 1280-dialog-top.png、1280-dialog-actions.png、1600-dialog-actions.png：Evidence 分類、完整原圖、紅色保護區、裁切及重要內容範圍數值／滑桿、人工確認、提示、取消／確認均可辨。1280 action screenshot 捲至底部後三個按鈕完整可見；未確認時禁用確認符合契約。未見橫向裁切，鍵盤 focus ring 可見。程式 geometry/focus/21-controls 記錄與四張 PNG hash 另存 host-acceptance-05/dialog/acceptance.json。這不代表 OCR、人工語意審核或原生 OS dialog 實測。
