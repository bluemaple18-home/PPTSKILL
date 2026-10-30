# 主線先行程式裁決

Product: 0b88f60eed5011050eca517a32bd641d2149eca2
2026-09-24，獨立 Reviewer 派出前保存。

CODE_REVIEW: GO；目前未定位阻塞 finding。這不是完整 browser acceptance／Independent GO。

已核對 shared contract、Node／portable sanitizer、registry、runtime 投影與 export clone、dialog decode／stale guard、S18 cleanup 相容性、SHA256 vendor 與 ZIP 內容。Mainline fresh focused19、scoped331、nonbrowser964全部PASS；source20、protected4、ZIP內容9項一致。

Failure-state 審查：request／sanitizer失敗不發布 candidate；CSS setProperty before/after throw 回復canonical、img/frame style、revision及observer snapshot；async decode用source/revision/slide/selected target/node相等檢查，失效關閉dialog；reset保留Evidence safety，pending保持完整原圖contain；刪除/刪頁清投影owned state，pagehide teardown；clone清transient crop UI/CSS後由canonical重建。現有測試覆蓋這些路徑；正式browser將補真pixel／offline／ResizeObserver再投影，不以mounted替代。

證據限制：Worker19個新cases包含迴圈，不能把迴圈assertion另外冒算成具名tests。PNG為本卡browser格式fixture；不擴張GIF動畫/SVG/JPEG/WebP實測claim。分類/保護框/確認為人工語意輸入，digest僅stale偵測，不是來源認證。

正式host正在執行，browser/PGQ狀態仍PENDING；任何新finding與FAIL須追加保留，本文件不覆寫歷史。

## 獨立finding後修正裁決

Reviewer於b364cd8以fresh probes找到5個P2（review-initial/initial-verdict.md）。本主線先行GO現被CHANGES_REQUESTED取代；進同一卡Repair1，原判斷保留以示審查漏失。
