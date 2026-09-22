# WP2-S7 Mainline acceptance

Status: READY_FOR_INDEPENDENT_REVIEW
Branch: codex/edx-wp2-s7-selected-image-fit
Base: `659e68489b1fee23101499ee25599eb300a40cb4`
Runtime product: `c2ba9e565e18405ebd652fdf5786765c37e09f87`
Reviewed candidate: `501da1b701f253d943c2879cd32e5108f583cfa1`

## 結果／範圍

S6依Owner授權closure、fast-forward整合並push；remote main與S6 branch readback均659e684。S7只新增layout單選圖片contain／cover controls，沿S6 toolbar／selection與S4 replace-asset。native button group、aria-pressed、cover裁邊title；existing dataUri不經optimizer，缺省contain／相同fit不寫revision；保留原檔／alt／geometry／composition／motion與其他內容。selection refresh payload reads及whole DeckSpec serialization皆0。

無crop metadata、insert、schema、dependency或另一套selection authority。UI為addition／operate，沿既有tokens。S6 chooser待回傳期間disabled，pending target不失效。active gesture先cancel preview，fit單獨提交；尾隨已取消vendor End不再清selection。export移除controls，offline reopen沿bootstrap復原。

## 派工與驗證來源

單一clean-context Worker Boyle／medium，shared sequential writer；主線只在Worker停止後接手產品。runtime不允許自行覆寫model，繼承既有model；未用多線fanout。見dispatch.md、worker-result.md。CodeGraph無相關symbols後限域rg確認既有seams。

Worker初始RED 0/26→22/26：兩個snap drag尾隨End清selection、兩個resize fixture缺setFixedDirection。補cancelled End guard與既有helper vendor seam後119/119；再加入markup/default no-op與受End影響的既有相鄰tests，最終 **196/196 PASS**（S7新檔29）。所有原始FAIL保留，無browser／full／ZIP越界執行。

主線明列64個nonbrowser檔，**531/531 PASS**，見nonbrowser-files.txt／nonbrowser.log。build/probe fresh ZIP lifecycle PASS；hostCapability partial只表示Gemini CLI缺席，非lifecycle失敗。Runtime product c2ba9e5在此凍結。其後501da1b只改browser harness，runtime/tests/ZIP無變；沒有因純harness修補再重跑同一full而混報fresh輪次。

## Browser FAIL → bounded retry

首輪host-acceptance在1280完成base10＋5次pointer-fit後，native Enter assertion actual contain／expected cover失敗；Space之前assertion已通過。errors arrays為0；PGQ未開始。Browser.close／supervisor exit0，ownedroot／marker absent。

keyboard-triage.md保留假說與來源：新helper漏CDP Enter的text/unmodifiedText carriage return；repo既有WP1-S7 helper已有此欄位，Playwright Chromium implementation也傳text。主線只補此欄位與第二次Tab focus assertion（單檔minimal修復），原fit／trusted click assertion未弱化，runtime/ZIP未改。初版source-hashes-initial.json留存。

host-keyboard-retry使用同一正式AI Core tmp_session browser，實際CODEX_SANDBOX=None，AI Core commit1d66afe3de4d5974e82ce8af82c0f9d7de5bfeb5；12秒logical-line readiness、capacity與managed cleanup不變。S7＋S6雙flags、1280×720／1600×900各 **35 checks PASS**：base10＋S7 16項紀錄＋S6 9項紀錄，含重複pointer與chooser事件，非35個獨立新功能。

S7真pointer／Tab／ArrowRight／Space／Enter、trusted native click、pressed state、button rect/hit、fit-only whole DeckSpec preservation、computed object-fit、drag/resize×snap on/off cancel、selection/mode、export/offline均PASS。Retry通過原Enter assertion，支持首輪為harness事件不完整而非產品Enter handler缺陷。
S6原chooser regression unchanged，7次chooser event／viewport、trusted input change、same-file／stale target／cancel／export reopen保留。console/page/network/HTTP/remote全0，targetClosed=true。

四支affected PGQ明列 --test-concurrency=1，**單輪16/16 unique named PASS**，沒有首輪PGQ結果可合計。Browser.close／supervisor exit0，exact owned root及isolation marker fresh核對absent；兩輪cleanup均PASS。

## 完整性與視覺

Source6/6、protected4/4 MATCH。ZIP **2,290,712 bytes**，SHA256 `e29170ba98ec706ef53bfa19d67cf4fb7d91afae4565857397a6638d353ea40d`，比S6 +442 bytes，兩份runtime ZIP entry與repo byte MATCH。browser source／HTML artifact hash已核對，新UI截圖另記bytes/hash及1280×720／1600×900尺寸於host-final-verification.json。

已看兩viewport的s7-selected-image-fit.png：完整顯示／填滿label、pressed/focus可辨，toolbar未出viewport、沒有新controls clipping；截圖是新control真runtime畫面。fixture圖片沿既有1×1 PNG，fit contract以canonical／computed object-fit與preservation驗證，沒有宣稱crop pixel／Evidence裁切正確性驗收。

S6 CDP chooser仍為browser automation，naturalBlurCount=0、blur/cancel synthetic；不是人工OS dialog或OS clipboard。Raw logs以gzip保留原文與hash，可讀log僅正規化行尾空白。所有歷史FAIL未覆寫。

主線acceptance不是Independent GO。S7未merge/push/deploy，未開下一Slice；工作樹最後只保留原四個protected untracked。
