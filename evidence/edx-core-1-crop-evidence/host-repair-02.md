# 第二輪 browser FAIL 與 fixture 隔離

host-acceptance-02：1280 base10已通過，Crop original、UI-confirm像素亦PASS，13 records後於rollback-crop-image-before失敗。4個錯誤pixel均為y419，恰在直圖y520×0.8=416以下；已直接檢視1280-crop-rollback-crop-image-before.png，直圖覆蓋resize後橫圖底部。這次有實際raster證據，不是產品rollback錯位的證明。

將直圖移至(1260,100,250,400)，與橫圖所有測試frame分離，避開base no-op中心與drag/resize起點。fixture regression同時檢查base pointer位置、兩圖隔離及safe bounds，fresh3/3 PASS。所有原pixel assertion保持；runtime/ZIP不變。

第二輪targetClosed、errors0、Browser.close/supervisor0、owned root/marker absent；scanner11次無I/O錯誤。PGQ及1600未跑。兩輪FAIL均保留；第三輪為新host-acceptance-03，不覆写。
