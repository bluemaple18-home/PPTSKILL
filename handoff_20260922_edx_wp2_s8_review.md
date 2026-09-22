# WP2-S8 Independent Review Handoff

Status: INDEPENDENT_REVIEW_PENDING
Branch: codex/edx-wp2-s8-insert-image-operation
Base/main: `74d63cc99e745b373adbcc3a56e9228576e74b22`
Reviewed candidate: `0b4c7bdf95211d0bb0587034cb899593e6b64d90`

先讀tasks/edx-wp2-s8-insert-image-operation.md、evidence/edx-wp2-s8/mainline-receipt.md。image-only insert-element，API caller明示完整component與geometry，不新增picker/UI/auto-ID。review重點：共用Node/portable驗證、全scope與stable identity保留、append/detached failure原子性、成功／失敗時revision/selection/gesture、舊DOM node保留、跨頁target、export/offline新root唯一。

## 重驗範圍

- source-hashes.json：source9、protected4、ZIP 2,293,334 bytes，SHA-256 `82a16b7d962972df28d558dbfecc1d198858f686abe49e5acf4ce19d27795cf1`。candidate→handoff應僅control/evidence；核對runtime/tests/tools/ZIP無drift。
- Worker scoped150/150（10次命令加總）、S8新20；Mainline65檔full **551/551**，nonbrowser-files.txt為明列selection，勿glob啟browser。
- 建議fresh targeted：`node --test tests/edx-wp2-s8-insert-image.test.mjs tests/edx-wp1-s2-stable-identity-operation-path.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs tests/edx-wp2-s4-replace-asset.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs tests/pgq-wp3-s1-motion-numberflow.test.mjs`。共70個具名cases；先確認實體檔名，完整scoped命令見worker-result.md。
- distribution-lifecycle.json：fresh ZIP lifecycle PASS；新image-insertion與deck-editor ZIP runtime entry byte MATCH。
- host-acceptance/insert-image/acceptance.json：雙viewport各50checks，base10＋S8 40紀錄；含重複decode/interaction，不稱50個獨立功能。API insert＋真pointer後續操作、3×2 PNGdecode、全spec／DOM preservation、invalid-zero-effect、export/offline、errors0、targetClosed。
- host-pgq-retry/pgq.log：四支串行單輪 **16 unique PASS**；controller-receipt.json／host-final-verification.json含source/protected/ZIP／artifact hash／managed cleanup。
- 歷史保留：Worker RED5/18及接線工具語法FAIL；Mainline full550/551舊變數名assertion→只同步斷言→551/551；首輪PGQ I/O fail-closed，cleanup完成但supervisor exit2。PGQ-only retry完整PASS，沒有聲稱I/O底層根因修復，沒有AI Core變更。

新圖插入無native chooser；不宣稱crop像素、自動避障、20MiB per-insert admission。mounted成功insert取消gesture與真browser invalid insert保持gesture的證據分開。缺managed attachment可核對committed browser evidence並明標非fresh；不得裸啟Chrome或unset sandbox。

請回GO/NO-GO、P0–P3、reviewed SHA，fresh/evidence-only分列。不改candidate/ZIP/protected、不merge/push/deploy、不開下一Slice。Mainline尚未宣稱Independent GO。
