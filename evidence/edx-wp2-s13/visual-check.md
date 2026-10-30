# S13 Screenshot 實際檢視

Mainline 透過 view_image 實際打開 host-harness-repair/insert-text/1280-s13-inserted-text-controls.png 與1600同名圖。

兩 viewport 新文字首行「文字 😀」、escaped `<script>` 字面文字、selection box／resize handle 與底部 editor controls 可見，toolbar 未見 clipping。這是長 injection fixture，不是展示用文案：後續字串在固定框內裁切，並與原「座標保持一致」元件重疊。沒有自動縮字／自動避障／完整文案可讀性驗收宣稱；S13只交付API explicit geometry insertion。canonical全文與escape安全性依 DOM／spec／export reopen assertions，不能用截圖單獨證明。

沿用既有 text renderer/type styling；text component direct editing 仍排除，沒有新文字按鈕。圖片既有回歸另有S8 checks；不把這兩張文字圖當image pixel驗收。
