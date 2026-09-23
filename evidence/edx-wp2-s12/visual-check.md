# S12 截圖實際檢視

Mainline已實際查看host-acceptance/image-paste下1280／1600的image-paste-new-image.png與image-paste-toolbar.png，共4張。
新插入的黑色3×2測試圖可見；黑色來自harness canvas預設fillStyle，並非decode失敗。真optimizer/自然寬高3×2/computed fit/canonical geometry由acceptance assertions驗證。Layout toolbar與插入圖片、刪除、另存HTML均可辨識，兩viewport未見toolbar clipping。貼上成功清selection，圖中無selection框符合契約。
同位置連續插入會重疊，屬固定geometry既有邊界，不宣稱自動避障。兩viewport的new-image截圖呈現asset-other標題第二行暫時裁切；稍後的toolbar截圖同標題皆完整可見。這支持取樣時間／呈現狀態差異，未據此斷言精確根因或整頁visual PASS。本卡未修改renderer/樣式/原motion與title，且export/canonical斷言通過；若後續要驗全頁視覺需另切measured範圍。
這4張只輔助File adapter驗收，不代表原生OS clipboard、Cmd/Ctrl+V、crop pixels或語意alt實測。
