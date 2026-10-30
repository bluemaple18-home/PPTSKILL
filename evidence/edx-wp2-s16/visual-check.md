# S16 視覺核對

Mainline實際檢視最終host-snap-repair/edit-text-ui的1280/1600各toolbar/dialog四張PNG。
「編輯所選文字」與既有role「編輯文字」可區分；選取框、resize handle、插入/圖片/存檔按鈕完整。Dialog預填文字、focus outline、取消/儲存清楚可見，兩viewport無toolbar或modal clipping。
沿既有頁面/控制列密度與原生dialog材料，未新增hero/cards/icon或無關美化。固定geometry下文字換行與HTML-like純文字展示符合原renderer；此檢查不宣稱自動縮字／避障，也不擴張為mobile驗收。
Runtime records已檢查controls rect bounds、targetClosed及errors；截圖僅補充可辨識性。IME為synthetic CompositionEvent，未作OS IME宣稱。
