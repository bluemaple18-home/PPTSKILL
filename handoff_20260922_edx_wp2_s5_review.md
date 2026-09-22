# WP2-S5 Independent Review Handoff

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Branch: codex/edx-wp2-s5-targeted-image-file
Base: `20c93125edc396513d36324b03e4137c56fdcf4f`
Reviewed product: `3c20f8593307f6661949fdd20cd03eb25ab94937`

## Scope

optional explicit target File adapter，單參數/undefined相容first image；exact target admission先optimizer；snapshot值/async captured identity/完成時重查；仍沿S4replace-asset，無新UI/schema/dependency。重點核對invalid/getter/optimizer0、跨頁/第二image、caller target mutation、export換object、removed/type-change/reject/invalid result原子性、samevalue revision/gesture stale及preservation。

## Evidence

- tasks/edx-wp2-s5-targeted-image-file.md 與 host-acceptance.md
- evidence/edx-wp2-s5/mainline-receipt.md、worker-result.md、source-hashes.json
- Worker targeted-final67/67；S5 mounted20/20；true RED與中間error文案FAIL均保留。
- nonbrowser.log：Mainline477/477，selection見nonbrowser-files.txt。
- distribution-lifecycle.json：PASS。ZIP2,289,608bytes，SHA256 `2913856544c0a678bd32c63ef2842a84f08fb97e6855b5ad296974a4b869398e`。
- host-acceptance/targeted-image-file/acceptance.json：1280×720、1600×900各12checks首輪PASS，errors/remote0、targetClosed。
- host-acceptance/pgq.log、controller-receipt.json：PGQ單輪16/16 unique named PASS，cleanup全部PASS；詳host-final-verification.json。

重驗：`node --test tests/edx-wp2-s5-targeted-image-file.test.mjs tests/edx-wp2-s4-replace-asset.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/p1-r10-asset-size.test.mjs`；full依明列selection，不用tests glob混入browser。缺正式host attachment只核對committed browser evidence，不裸啟Chrome/unset sandbox；fresh與evidence-only分列。

## 限制

browser File/optimizer為API-driven，不宣稱新native picker或OS clipboard；base10仍真pointer。Worker本輪沒有browser/full/ZIP執行偏差。Worker receipt中candidate只是交回標籤，Mainline gates與本handoff才決定ready。

請核對source6/protected4/ZIP，以及product→handoff無runtime/tests/tools/ZIP drift，獨立回GO/NO-GO及P0–P3。不改candidate/ZIP/protected、不merge/push/deploy、不開下一Slice。Mainline acceptance不是Independent GO。

## Mainline closure

WP2-S5 COMPLETE / INDEPENDENT_REVIEW_GO，P0–P3全0。主線fresh核對source6/6、protected4/4、ZIP bytes/hash及product→handoff無delivery drift，reviewed code/ZIP未改。Reviewer fresh targeted67/67、nonbrowser477/477；browser/PGQ僅committed evidence獨立核對。完整verdict見evidence/edx-wp2-s5/independent-review.md。未merge/push/deploy，未開下一Slice。
