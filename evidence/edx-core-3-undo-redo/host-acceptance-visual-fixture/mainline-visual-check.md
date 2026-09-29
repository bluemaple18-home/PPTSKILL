# Mainline 正式雙viewport視覺核對

2026-09-29。主線以view_image直接查看本輪四張原始PNG，非僅讀JSON。

兩個selected GREEN PNG均清楚顯示「成果，不鎖在工具裡」；測試A/B留在左下可見範圍，沒有覆蓋標題或右側「座標保持一致」。右側選取框仍完整，兩viewport同比例。兩個fixture-red PNG均重現A疊於「成果」、B疊於「在工具」附近；該疊字外觀正是先前被認作BI的問題。

本次明確裁決為固定fixture遮擋修復通過，不宣稱通用glyph ink／OCR／任意遮罩保證。原字體與tracking不改；產品ZIP不改。PGQ與最終cleanup當時仍執行中，本紀錄只作visual GO。

| viewport | RED相交面積A/B | GREEN相交面積A/B | 原功能＋visual |
|---|---|---|---|
| 1280×720 | 7215.75/6868.1162109375 | 0/0 | 12 PASS |
| 1600×900 | 11272.5/10729.423828125 | 0/0 | 12 PASS |

四PNG SHA由acceptance.json保存，主線重算一致；source與全部measurement見同目錄undo-redo/acceptance.json。
