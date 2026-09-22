# WP2-S6 Independent Review Handoff

Status: INDEPENDENT_REVIEW_PENDING
Branch: codex/edx-wp2-s6-selected-image-ui
Base: `b704a1f50a9022b04a5f2b9f8f3fe67ea3d2a4c0`
Reviewed product: `2ec39715f9c8595d58f084208a91e240cb65189e`

## 契約與重點

先讀tasks/edx-wp2-s6-selected-image-ui.md與evidence/edx-wp2-s6/mainline-receipt.md。單選image contextual replacement UI沿既有selection→S5 File adapter→S4 operation；無新schema/vendor/crop/insert。

重點：picker capture identity、blur保留與明示selection/slide/mode失效、每次change先snapshot再await、cancel/value reset/same-file、gesture不誤提交、nonimage/multi、export/offline。原first-image API不變；檢查permanent toolbar與transient overlay marker分離而export仍清理。

## 可重驗證據

- source-hashes.json：6 sources、4 protected、ZIP。Product→handoff僅control/evidence，核對無runtime/tests/tools/ZIP drift。
- Worker初版scoped100/100；repair fresh30/30（S6 25＋export cleanup5）；repair後full502/502，selection見nonbrowser-files.txt。
- 重驗targeted：`node --test tests/edx-wp2-s6-selected-image-ui.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs`。full依明列selection，不用glob混入browser。
- teardown-lifecycle.json：fresh ZIP lifecycle PASS；2,290,270 bytes，SHA256 `68364d634ab96859c1a493de26deed0bec30c874134a46da37a589fc1f129ab1`。
- host-teardown-retry/selected-image/acceptance.json：雙viewport各19 checks（base10＋7 chooser紀錄＋2聚合），errors/remote0、targetClosed。
- host-teardown-retry/pgq.log：四支串行單輪16/16 unique PASS；controller-receipt.json及host-final-verification.json：source/protected/ZIP/artifacts及cleanup PASS。
- host-acceptance保留首輪teardown FAIL；teardown-red/green保留bounded repair，原assertion未弱化。Worker擴充fixture失敗亦保留。

CDP intercepted chooser與setFileInputFiles產生trusted change，屬browser automation，非人工OS dialog。naturalBlurCount=0；blur/cancel為synthetic。selected.png為base selection截圖，新UI靠rect/hit/event evidence驗收。缺managed attachment可只核對committed browser evidence，禁止裸啟/unset sandbox；fresh與evidence-only分列。

獨立回GO/NO-GO、P0–P3及reviewed SHA。不改candidate/ZIP/protected、不merge/push/deploy、不開下一Slice。主線尚未宣稱Independent GO。
