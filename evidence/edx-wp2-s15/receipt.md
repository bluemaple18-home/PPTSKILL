# WP2-S15 Mainline acceptance

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Candidate: `a181982396eb4f282574f70b93a6c4ef2cfa9c62`
Runtime product: `274183c1b73eb2e841a3c74f02b29791739cf60e`
Base/main/origin-main: `8dcc3a0db58df98e58f717e106d12c2cf1bb7d42`
Branch: codex/edx-wp2-s15-insert-text-ui

## 範圍與裁決

root question：使用者能否在layout從native dialog安全新增文字，沿S13同一operation而不建立另一mutation authority？Mainline驗收PASS；blocker無，fork無；下一步Independent Review。新增「插入文字」、native textarea／取消／插入／inline validation，submit當下first-free ID、stable slide/root、1–500 Unicode codepoints、不trim/normalize、純文字render。cancel／invalid／stale／IME不提交draft；open取消pointer preview不提交geometry。component仍contentEditable=false，無新直接文字編輯或自動layout能力。

## Verification

Worker初輪scoped149/149（S15 26），Mainline全量發現7fail後原Worker bounded repair1，原scoped＋affected **252/252 PASS**。Mainline explicit72檔 **full non-browser789/789 PASS**。各批重疊不相加；Worker是mounted邏輯，非真browser。全量／build／ZIP在runtime product274183c執行；其後僅兩筆browser harness修正，runtime/tests/ZIP不變，沒有冒稱harness修正後再次重跑全量。Source 6/6、protected4/4 MATCH；fresh build／ZIP lifecycle PASS，ZIP內變更runtime逐byte MATCH。

正式host雙viewport1280×720／1600×900，records分別 **48／48 PASS**，base10＋S15，詳細分組與逐record見host-final-verification.json。Pointer／CDP Input.insertText／Enter/Escape／native modal與inert為browser evidence；composition lifecycle、stale/fault與chooser cancel明標synthetic fixture。errors console/page/network/HTTP/remote全0，targetClosed=true。已檢視toolbar/dialog截圖，詳visual-check.md。

四支affected PGQ串行 **單輪16/16 unique PASS**。Managed readiness/Browser.close/supervisor exit0，exactowned root／isolation marker absent；前後hash一致。ZIP **2,297,769 bytes**，SHA256 `98a46007088d1a076f5cea6cacec4b1bc5812ad30f855bc0072a9a4b832ca239`。

## 完整失敗歷史

Worker true RED0/22；初綠22/22；scoped1、2各144/145，先修S6永久chrome marker teardown，再修cancel尾隨click誤清selection；scoped3 145/145，擴case後149/149。Mainline指出composing Escape keydown不應preventDefault；IME RED25/26後移除keyDown攔截，native dialog cancel guard保留，149/149 PASS。PNG artifacts補bytes/hash。

Mainline full首輪 **782/789**，原始nonbrowser-initial-fail.log保留。5個WP1-S3 VM缺insertAdjacentHTML、1個S7全域pointerdown listener teardown、1個S12 fixture重複toolbar。原Worker repair1 RED96/103→252/252；改為editor DOM存在才bootstrap dialog、專用button pointerdown、S12只reuse fixture toolbar，既有assertions未弱化。後續全量789/789及ZIP通過。詳細worker-receipt與worker-repair1-receipt.json／mainline-check.md。

任何host失敗／修正若有，另見host-triage.md；原目錄與logs不覆寫。Raw logs保存gzip與raw-log-hashes.json；plain logs僅trim行尾空白。歷史S8/S13 I/O根因未知，不因本次成功宣稱修復。

## 限制與下一步

IME為synthetic lifecycle，不是原生OS IME；CDP chooser不是人工OS dialog。Mounted double不模擬native inert或完整DOM。固定geometry可能重疊／裁切，不保證自動縮字／避障。未merge/push/deploy S15、未開S16；Independent Review pending，本receipt不是Independent GO。

Worker原始review patch以worker-review.patch.gz逐byte保留，hash見worker-patch-hashes.json；沒有為diffcheck改寫原patch的context空白。
