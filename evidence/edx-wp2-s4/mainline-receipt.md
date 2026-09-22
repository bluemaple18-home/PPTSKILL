# WP2-S4 Mainline receipt

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Candidate: `ebc4dc2`；runtime product: `a8999d61aca69a746162b4da7afdc813b63ac971`。
Base main: `28c1b373476ddf8fb6680cf883711f586ef08486`（S3已merge/push並remote readback確認）。

## Scope

image-only replace-asset共用operation，Node replaceImage與portable replaceImageFile相容wrapper統一路徑。exact payload/target；缺省保留alt/fit，明示修改；stable identity、composition/geometry/typography/motion/style保留；invalid/getter拒絕、局部DOM投影及rollback；async鎖原target、readonly export不誤失效、same-value不假revision。無crop/insert/新picker/drop/clipboard/schema/dependency。

Mainline開卡b04f399，單一clean-context Worker Lagrange實作，停止寫入後由Mainline整合驗收。Worker失敗歷史與SHA詳worker-result.md和raw logs。

## Verification

Worker final targeted111/111 PASS；Mainline正確排除4支browser PGQ的full nonbrowser初輪/fixture修正後皆457/457 PASS，不相加。ZIP lifecycle PASS，2,289,517bytes（較S3+2077），SHA-256 `5007d594dee18e8567c38e43ad1753b5c126c50356fa264d2326cc0d1e3f69c2`。新增runtime封裝bytes與source一致。

正式host首輪host-acceptance：base10通過，S4圖片DOM不存在而FAIL；fixture只加content未加slot/geometry，renderer不會畫image。PGQ未開始。readiness/Browser.close/supervisor/owned root absent/marker absent全PASS。沒有把它歸因AI Core或產品operation。

補render regression，實測RED；fixture加入2張image canonical geometry並轉GREEN。ebc4dc2只改測試與fixture，runtime/ZIP未變。host-fixture-retry雙viewport1280×720與1600×900各12checks PASS（base10真pointer+2 aggregated API cases）；image decode、第二image及default/explicit alt/fit、DOM node identity、invalid/getter atomic、真optimizer async captured identity、export/offline PASS；errors/remote0、targetClosed=true。不宣稱新file picker/UI/OS clipboard。

四支affected PGQ串行單輪16/16 unique named PASS；readiness/browser/PGQ/Browser.close/supervisor exit0；owned root與isolation marker absent。source9/9、protected4/4、ZIP/artifact hashes前後MATCH；首輪與retry各自managed cleanup PASS。詳host-final-verification.json。

## Worker執行偏差

Worker誤用tests/*.test.mjs，全測試452/458包含4browser環境FAIL及2registry snapshot FAIL；log誤名full-nonbrowser，不能當nonbrowser或host acceptance。間接standalone Chrome嘗試與tmp ZIP tests超出Worker分工，已停止並記錄；未採作正式證據。

主線唯讀host ps觀測沒有pptskill-geometry-* profile活Chrome；tmp仍有同prefix目錄，以及非本次managed ownership的pgq-chrome-ls-profile程序，未能從本輪證據辨識歷史歸屬，因此未刪除/停止、未冒稱Worker有managed cleanup receipt。詳worker-deviation-observation.json。本輪正式managed session另有明確owned root、before/after hash與cleanup證據，不把它倒填成Worker舊行為證據。

source9/protected4與ZIP以前後manifest核對。歷史FAIL完整保存，可讀log去行尾空白時原bytes存.gz+hash。獨立Review pending；未merge/push/deploy S4，不開下一Slice。

Mainline closure：Independent Review GO，P0–P3全0；reviewed product/ZIP未改，source9/protected4/ZIP fresh核對MATCH。詳evidence/edx-wp2-s4/independent-review.md。Owner本輪已授權結案後合併push並繼續；此closure commit本身不含外部寫入。
