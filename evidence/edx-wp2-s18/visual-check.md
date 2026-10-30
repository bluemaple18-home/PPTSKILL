# S18 視覺核對

Mainline 已直接檢視正式主機 host-acceptance/delete-element 的四張 PNG：1280-s18-before.png、1280-s18-after.png、1600-s18-before.png、1600-s18-after.png。

兩種 viewport 的 before 均可見「S18 獨立文字 😀」及右側新增圖片；after 均已移除這兩個目標。原有標題、副標題、左側兩張圖片與「座標保持一致」文字仍位於原位置，操作列未出現所選文字／圖片專用動作。操作列底下的既有提示隨 selection 清除而變動，不把提示文字差異當作 presentation truth 變更。

此驗收只涵 API 刪除及其既有 context UI 收斂；没有新增刪除按鈕、鍵盤刪除、Undo、auto-fit 或自動重排。截圖中的圖片為 deterministic 測試素材，不是視覺設計提案。canonical 差異、其他 node object identity、故障 rollback、offline reinsert/edit/redelete 以 acceptance.json 中實際 assertions 為準；截圖不取代這些驗證。

本輪兩種 viewport 各21 records（base10＋S18 11）PASS，console/page/network/http/remote全0、targetClosed=true。PNG bytes/hash已由harness列於同一 acceptance.json，最終收尾另核對。
