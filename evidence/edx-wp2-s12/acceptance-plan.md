# S12 驗收準備

Status: WAITING_FOR_WORKER_STOP
Current accepted state：S10/S11 main8b9ee5b已push，readback MATCH。Worker單一product writer；主線不重疊改code。

## 測試層級與停損

1. Worker scoped只明列，保留RED與中間FAIL；Mainline先讀report、diff與語意邊界，不能把Worker done當驗收。
2. Mainline syntax/fixture-only，69檔nonbrowser-files.txt，build:dist及probe:dist installed ZIP lifecycle；源檔與archive runtime byte-match、protected4/hash/bytesdelta。
3. source freeze/product commit後，唯一正式managed host controller。host-acceptance卡指定兩viewport、S10/S11回歸＋S12synthetic paste、4支PGQ串行。新失敗先收error/traceback、console/network/page，回主線分產品／fixture／harness；不盲目重跑。同類兩次無進展/第三次停損沿rule01，禁止改名洗計數。
4. finally Browser.close→supervisor wait→只處理owned process；exactowned root與isolation marker實測absent。維持AI Core原capacity/readiness，不改權限或環境旗標。
5. 交Independent Review時列source與protected MATCH、candidate→handoff無runtime/tests/tools/ZIP drift、full具名數字、每viewportrecords與各路徑isTrusted，PGQsingle/unique精確；不把synthetic paste當OSclipboard實測。

## 契約來源

W3C Clipboard API事件接口將clipboardData定為DataTransfer；File/items提供非文字payload。synthetic event只能帶程式指定資料，不代表system clipboard delivery。WHATWG DataTransfer files為FileList。Mainline在開卡前核對：https://w3c.github.io/clipboard-apis/#clipboard-event-paste 與 https://html.spec.whatwg.org/multipage/dnd.html#dom-datatransfer-files-dev（2026-09-23）。未導入vendor或第二套clipboard authority。

本輪不測人工OS paste，故不觸碰現有clipboard、不授權read/write clipboard、不呼叫navigator.clipboard／execCommand。本輪只證明事件File adapter可處理符合web標準的FileList；真clipboard formats/platform差異保留未驗證。
