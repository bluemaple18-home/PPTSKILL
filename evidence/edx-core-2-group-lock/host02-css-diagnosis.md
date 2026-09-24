# Host02 具體根因與修復

1280 trusted marquee可選2項。事件trace證明group button hidden=false、disabled=false，但所有pointer/mouse事件當下rect=0×0，click target不是group action；before-group截圖只有原align controls。既有CSS預設隱藏editor直接子元素，layout-mode明示顯示清單缺data-pptskill-group-toolbar。原host02仍NOT_PASS，10scans0errors、Browser.close/supervisor0、root/marker absent。

本次修runtime CSS加入既有白名單與同樣gap/flex-wrap，不改group canonical contract或重造toolbar。harness加入pointer前visible/disabled/hit-test assertions，不用synthetic click補通過。這是本卡產品UI缺漏，不是環境或AI Core問題；下一輪驗已修CSS與原group transform assertions，不重複無資訊重試。
