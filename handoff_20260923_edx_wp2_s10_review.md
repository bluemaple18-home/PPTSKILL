# WP2-S10 Independent Review Handoff

Status: CLOSED / INDEPENDENT REVIEW GO
Branch: codex/edx-wp2-s10-insert-image-ui
Reviewed candidate: `7f79b58bdd492c90fd1bf6d510c7692492c94a84`
Base/main/origin-main: `d0b9aa05c50b09596920705bbbf4dd632c9137d4`（S8/S9已GO、closure、整合並push）

先讀tasks/edx-wp2-s10-insert-image-ui.md、evidence/edx-wp2-s10/mainline-receipt.md。範圍只layout插圖chooser，沿S9 adapter/S8 insertion；不新增canonical/schema/optimizer/mutation authority。

Review重點：click捕捉slide與bounded first-free ID、preview取消無commit、blur與顯式intent區別、S6/S10 chooser mutual exclusion與wrong-input ownership、busy與async target／finally、新controls在mode/teardown/export/offline的生命週期。API defaults是UI caller選擇，不擴張S8/S9 contract。

## 重驗與證據

- source-hashes.json：source6、protected4、ZIP 2,294,310 bytes，SHA256 `c8d5d55cb91e23f73d9696c852bbe3c1bbb81f0c805c5e956e63a1baf6af623a`；product→handoff應無runtime/tests/tools/ZIP drift。
- 建議fresh targeted：`node --test tests/edx-wp2-s10-insert-image-ui.test.mjs tests/edx-wp2-s9-insert-image-file.test.mjs tests/edx-wp2-s6-selected-image-ui.test.mjs tests/edx-wp2-s7-selected-image-fit.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs`。不可用glob啟browser。S10本身31cases。
- full nonbrowser-files.txt明列67檔；Mainline617/617具名cases，完整names在nonbrowser-summary.json。Worker scoped181/181含S10當時29，後補S10到31；不可重複相加。
- distribution-lifecycle.json、host-final-verification.json：fresh ZIP lifecycle及兩runtime ZIP byte MATCH。
- host-acceptance/insert-image-ui/acceptance.json：雙viewport各23 check records（base10＋12 chooser＋1 lifecycle），errors0/targetClosed。DOM.setFileInputFiles／fileChooserOpened/backendNodeId、真pointer/inputchange/optimizer、無圖頁／同檔／async／export/offline覆蓋。兩張*-insert-image-ui.png已主線看過。
- host-acceptance/pgq.log：四支affected PGQ串行單輪16/16 unique；controller-receipt.json保存Browser.close/supervisor exit0、owned root/marker absent、before/after source/protected/ZIP。
- 原RED0/1、scoped147/152保留：disabled型別修正，未改舊assertions；fixture-preflight FAIL也保留，runner-only合法無圖頁composition修復後fixture-ready PASS。正式browser/PGQ本S10未retry。

限制：naturalBlurCount兩者0；blur/cancel/focusin synthetic，CDP automation非人工OS dialog。固定geometry不做自動避障、File.name不等於語意alt、3×2 PNG非crop pixel驗收。S8 I/O errno未知，未宣稱修復。缺managed attachment可核對committed evidence並明標非fresh；不可裸啟Chrome或unset sandbox。

請回GO/NO-GO、P0–P3、reviewed SHA與fresh/evidence-only分界。不修改candidate/ZIP/protected，不merge/push/deploy、不開S11。Mainline尚未宣稱Independent GO。

## Independent Review closure

Owner交回GO，P0–P3全0；reviewed SHA `7f79b58bdd492c90fd1bf6d510c7692492c94a84`。Reviewer fresh targeted125/full617 PASS；browser23+23及PGQ單輪16為committed evidence核對。正式紀錄：`evidence/edx-wp2-s10/independent-review.md`。本節取代上文歷史pending狀態；產品與ZIP未變，未merge/push/deploy，S11未開。
