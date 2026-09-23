# 首輪 browser FAIL 與 fixture 修正

首輪 host-acceptance-01 1280 base 通過6 checks，invalid drag 未見「未套用」訊息即停，Crop cases/1600/PGQ 尚未執行。errors0、targetClosed，Browser.close/supervisor0，owned root/marker absent，scanner6次無I/O錯誤。

根據 fixture 與 base pointer 座標核對：原直圖 x1000–1250、y220–620 包住 base no-op 中心 (1140,500)，該click可選錯圖片；後續原文字左側drag first press先選回文字，而非有效gesture。將直圖移到左側且與横圖分開，全部Crop fixture右邊界<800，保留原assertion。這是具體 fixture遮擋判讀；首輪沒有elementFromPoint instrumentation，故不聲稱已逐事件錄到點擊鏈。

第一次位置修正的 unit fixture因bottom840超出safe area820而2/3 FAIL；調整height280後3/3 PASS。兩份log均保留。runtime/ZIP與0b88f60完全不變，僅tools fixture和對應test改動。正式retry另存host-acceptance-02，source-hashes-01保留首輪身份。
