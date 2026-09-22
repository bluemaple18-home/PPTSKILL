# WP2-S6 Host acceptance

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Product SHA: `2ec39715f9c8595d58f084208a91e240cb65189e`
Parent: tasks/edx-wp2-s6-selected-image-ui.md

正式AI Core tmp_session browser，原capacity gate、12秒logical-line readiness、不unset sandbox/裸啟。source/protected4/ZIP前後MATCH。

`node tools/edx-wp1-s4-browser-acceptance.mjs <evidence>/selected-image --selected-image-regression`

雙viewport1280→1600；base10真pointer保持；真pointer選第二image→按鈕rect/hit→CDP intercepted chooser／setFileInputFiles→input change→真optimizer，canonical及DOM第二圖改first保留、alt/fit/geometry、blur pending、cancel/same-file、stale slide/mode/selection、nonimage/multi不提供、export/offline。native dialog為CDP automation非人工OS測試，synthetic cancel/blur明標。errors/remote0/targetClosed。需核對截圖（如runner提供）與實際尺寸。

PASS後既有四支affected PGQ --test-concurrency=1明列檔；Browser.close/supervisor exit0、ownedroot absent、marker absent才cleanup PASS。保留FAIL，同類兩次無進展停triage，不任意重跑。Evidence evidence/edx-wp2-s6/host-acceptance。完成停review candidate、不merge/push/deploy。

結果：初輪host-acceptance teardown FAIL且cleanup PASS；bounded marker修復後host-teardown-retry雙viewport19+19、PGQ單輪16/16、Browser.close/supervisor/root/marker cleanup PASS。詳evidence/edx-wp2-s6/mainline-receipt.md；自然blur未發生，synthetic blur/cancel明標。

## Mainline closure

Independent Review GO，P0–P3全0。Reviewer fresh30/502；browser19+19與PGQ16為committed evidence獨立核對。主線fresh核對source6/protected4/ZIP及product→handoff control-only通過。reviewed code/ZIP未改；詳evidence/edx-wp2-s6/independent-review.md。
