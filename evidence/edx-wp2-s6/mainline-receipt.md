# WP2-S6 Mainline acceptance receipt

Status: READY_FOR_INDEPENDENT_REVIEW
Product: `2ec39715f9c8595d58f084208a91e240cb65189e`
Base: `b704a1f50a9022b04a5f2b9f8f3fe67ea3d2a4c0`
Branch: codex/edx-wp2-s6-selected-image-ui

## 範圍與派工

S5 closure已fast-forward整合並push main與S5 branch，remote readback一致。其後開S6卡，單一clean-context Worker、shared sequential writer；Worker停止寫入後主線接手驗收及bounded repair。dispatch.md與worker-result.md保留派工及執行來源。主線／Worker都未新增dependency、schema或另一套selection authority。

layout單選既有image提供「替換所選圖片」，capture stable identity→專用native input→既有S5 File adapter／optimizer→S4 replace-asset。blur保留pending，明示selection／slide／mode意圖取消pending；change先消耗snapshot再await，保留原first-image API。export移除UI，offline bootstrap可再使用。

## 測試與失敗歷史

- Worker true RED 0/3→GREEN 3/3；擴充20/22的兩個失敗來自gesture stub缺event.set，改用既有helper後98/98→100/100。這是初版scoped結果，不冒稱repair後fresh 100。
- 初版product `bfe91abad7a8b7474bd1642dfda8bf87c939ef5d`：full non-browser501/501、ZIP lifecycle PASS。source-hashes-initial.json保留初版freeze。
- 首輪正式browser在1280第8項play teardown失敗，已完成7項。新增常駐toolbar誤用transient `[data-pptskill-editor-chrome]` marker，count 1≠0。host-acceptance保留FAIL與cleanup；PGQ未開始。
- bounded repair true RED→GREEN：常駐toolbar使用自身marker，export cleanup仍明列移除；原browser teardown assertion不變。teardown-red.log／teardown-green.log：30/30 PASS（S6 25＋export cleanup5）。
- repair後full non-browser **502/502 PASS**，明列檔案selection見nonbrowser-files.txt／teardown-nonbrowser.log；未混算browser或ZIP。
- teardown-lifecycle.json：fresh ZIP lifecycle PASS。hostCapability partial僅Gemini CLI缺席，不是ZIP安裝／保存／移除測試失敗。
- 產品repair commit `2ec3971`；其後code/tests/tools/ZIP frozen。

## 正式host retry

AI Core `1d66afe3de4d5974e82ce8af82c0f9d7de5bfeb5`，host實際CODEX_SANDBOX=None，沿正式tmp_session browser、12秒logical-line readiness／capacity／managed lifecycle；未改AI Core或放寬閘門。

host-teardown-retry/selected-image/acceptance.json：1280×720、1600×900各 **19 checks PASS**。每viewport為base10＋7次chooser-open紀錄＋2個聚合檢查，不宣稱19種獨立新功能。真pointer選圖與按鈕、mousedown→click rect穩定與hit、CDP intercepted chooser對原input setFileInputFiles，trusted change=true。第二image canonical/DOM更新、first保留、geometry/alt/fit、同檔重選、stale intent optimizer0、nonimage/multi、export/offline均PASS。console/page/network/HTTP/remote arrays全0，targetClosed=true。

PGQ四支明列串行（content-integrity／sample-approval／full-deck-qa／required-visibility），**單輪16/16 unique named PASS**，見host-teardown-retry/pgq.log及host-final-verification.json。未用兩輪合計冒充單輪。Browser.close／supervisor exit0、owned root實際absent、isolation marker absent；初輪與retry cleanup均PASS。

## 完整性與限制

Source6/6、protected4/4 MATCH；20份browser artifact bytes/hash及source.html hash MATCH。ZIP **2,290,270 bytes**，SHA256 `68364d634ab96859c1a493de26deed0bec30c874134a46da37a589fc1f129ab1`；比S5 +662 bytes，兩份修改runtime的ZIP entry逐位元等同repo來源。

CDP攔截chooser沒有產生自然blur（兩viewport naturalBlurCount=0）；blur／cancel是synthetic lifecycle，**不是人工OS dialog／自然OS blur驗證**。截圖1280-selected.png／1600-selected.png已檢視，為base component selection，非新action視覺截圖；新action依rect/hit及trusted input事件驗收。不宣稱OS clipboard。

raw log原文gzip與hash保留；可讀log只正規化行尾空白。主線接受不等於Independent GO。S6未merge/push/deploy、未開下一Slice；候選交獨立review。
