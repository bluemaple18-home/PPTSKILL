# Repair1主線驗收

原candidate b364cd8 CHANGES_REQUESTED，5 P2已給原Worker修復；本輪同一Reviewer targeted rereview。host03修前26/26 each、705/710pixels、PGQ16、scanner698、cleanup PASS保留不可混用。

Worker停筆後：讀diff及修復focused/scoped；獨立重放五項修後expectations（不可執行原probe把缺陷reproduced當PASS），fresh full78+新增manifest、ZIP build/lifecycle；freeze source20及新增test/tool; source-hashes03已留。host04雙viewport新增preview匹配/dialog screenshots/頁面事件(合成)、pixel/rollback；PGQ16串行fresh。由Workerharness提供dialog圖，所以先前dialog-visual-probe/controller未執行且可標為superseded；不要額外launch重複visual。

Vendor raw bundle4903bytes/SHA不需因licenseembed改；helperruntime有license增加內容是預期。ZIP core檔和source bytecheck；render/export單檔MIT全文安全保留。最終不冒稱nativeBFCache/OSchooser/其他image格式實測。
