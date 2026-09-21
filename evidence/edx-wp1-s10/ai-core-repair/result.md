# AI Core S10 scan-window repair receipt

結論：獨立 review GO，原 P2 文件延遲低估已 targeted re-review 關閉，無已確認 P0/P1/P2/P3。實測100ms觀測窗在123.794ms處拒絕小型browser profile；registered browser改用既有5秒bounded scanner窗，一般sandbox仍100ms。完整112 tests PASS，後續新增跨掃描mutation targeted1 PASS；不混稱113項單輪full。Reviewer另15targeted及adversarial probes PASS；P2 closure fresh targeted PASS。

Runtime只改時間窗選擇與scan-limit診斷；容量/file/TTL/entry/depth/Rule24/Foundation/ownership/special-entry/cleanup程式不變。較長同步掃描會增加偵測與TTL/KILL升級延遲；跨兩輪約11秒加排程，阻塞syscall不具硬上限。這不是磁碟配額，也不保證所有主機永不逾5秒。

最終三檔diff SHA256：ead62efbf7da509762ed7a95333cc77ed488b339a8282946f73b784eb8471a18。只提交三個reviewed paths；既有dirty logs與其他.work不納入。PPTSKILL source/ZIP未改，S10 PGQ須以修復後正式host重新驗證；AI Core GO不等於產品PGQ GO。
