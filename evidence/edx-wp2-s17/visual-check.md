# S17 視覺核對

Mainline 已直接檢視 host-pointer-repair/text-double-click 下四張實際 browser PNG：1280-s17-dialog.png、1280-s17-offline-dialog.png、1600-s17-dialog.png、1600-s17-offline-dialog.png。

1280×720 與 1600×900 的既有 dialog 均在 viewport 內；標籤、textarea、focus ring、取消／儲存完整可見。原文預填與 offline reopen 的已保存文字均以純文字顯示，HTML-like 字串沒有被當成標記渲染。兩個尺寸沿用相同視窗與既有操作列。

此核對只涵本卡編輯視窗。背景是固定 geometry 的壓力 fixture，未驗收 auto-fit／避障或整份簡報視覺品質；S17 也未新增這些能力。互動、canonical 保存、錯誤通道與 cleanup 以 acceptance.json 及 controller-receipt.json 為準，截圖不取代 runtime evidence。

空白雙擊修復後的 probe 已證實：原固定右下點在1280命中 NAV、1600命中 SPAN，均非合格空白；改採實測 (.04,.5) 命中 SECTION，再送真 pointer。原 hit-test／trusted／單一 dblclick／空白 elementId 斷言全部保留。
