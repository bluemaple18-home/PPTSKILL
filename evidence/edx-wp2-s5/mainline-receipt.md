# WP2-S5 Mainline receipt

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Product: `3c20f8593307f6661949fdd20cd03eb25ab94937`
Base: `20c93125edc396513d36324b03e4137c56fdcf4f`（S4已merge/push，remote readback一致）。

## Scope

replaceImageFile(file,target?) 加入explicit stable image target；省略/undefined相容current slide第一image，null及非法target在optimizer前拒絕。共用S4target驗證並snapshot；caller改target/切頁/export換object不改目的地。完成重查image，仍用replace-asset提交，保留result/alt/fit/geometry/motion/typography。無UI/schema/dependency/第二套mutation。runtime只共用validateTarget及adapter。

## Test provenance

開卡1133dcb；一名clean-context Worker、single product writer，先true RED（explicit第二image被忽略而誤改第一image），再GREEN。首輪較廣測試66/67是舊missing-image error文案回歸，恢復原文案後同selection67/67。20個S5 mounted cases完整覆蓋；Worker未跑browser/full/ZIP。Worker receipt的Independent Review candidate用語不作Mainline狀態，正式candidate須本輪host全部通過。

Mainline full nonbrowser477/477 PASS；selection明列nonbrowser-files.txt，排除4支browser PGQ。ZIP build/probe PASS；2,289,608bytes（較S4+91），SHA256 `2913856544c0a678bd32c63ef2842a84f08fb97e6855b5ad296974a4b869398e`；bundled runtime bytes一致。Source6/protected4於source-hashes.json凍結。

正式browser首輪雙viewport各12checks PASS；errors/remote0、targetClosed。PGQ串行單輪16/16 unique named PASS，readiness/browser/PGQ/Browser.close/supervisor全exit0，owned root與isolation marker absent；source6/protected4/ZIP/artifacts前後MATCH。詳host-final-verification.json。S5browser為API-driven File與真optimizer，base10真pointer保留；不宣稱native OS picker/clipboard。最終要求第二image/target snapshot/export/switch/default/invalid admission0calls/DOM decode與geometry/offline。未merge/push/deploy S5、未開下一Slice。

正式host實際AI Core commit為`1d66afe3de4d5974e82ce8af82c0f9d7de5bfeb5`（controller記錄），Mainline本輪未修改AI Core。歷史RED與error文案FAIL原bytes以.gz/hash保留，可讀log只去行尾空白。

封存diff-check抓到final-check.log尾端多餘空行；可讀副本移除EOF空行，原bytes仍存同名.gz及raw-log-hashes.json，沒有改寫測試結果。

## Mainline closure

WP2-S5 COMPLETE / INDEPENDENT_REVIEW_GO，P0–P3全0。主線fresh核對source6/6、protected4/4、ZIP bytes/hash及product→handoff無delivery drift，reviewed code/ZIP未改。Reviewer fresh targeted67/67、nonbrowser477/477；browser/PGQ僅committed evidence獨立核對。完整verdict見evidence/edx-wp2-s5/independent-review.md。未merge/push/deploy，未開下一Slice。
