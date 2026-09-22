# WP2-S10 Mainline acceptance receipt

Status: COMPLETE / INDEPENDENT REVIEW GO
Product: `7f79b58bdd492c90fd1bf6d510c7692492c94a84`
Branch: codex/edx-wp2-s10-insert-image-ui
Base/main/origin-main: `d0b9aa05c50b09596920705bbbf4dd632c9137d4`

## 交付／裁決

依Owner「推完繼續」，S9 Independent GO已落closure，S8/S9一起FF整合main並atomic push；遠端readback已核對。詳evidence/edx-wp2-s9/integration-receipt.md。S10從已整合main開獨立分支，本S10未merge/push/deploy，未開S11。

layout新增「插入圖片」與專用input，沿S9 insertImageFile／S8 canonical insertion。click捕捉slide identity與最小未占用inserted-image-N，預設geometry560/288/480/320、contain、File.name alt。這些是UI caller defaults，未改API或建立counter/reservation。開picker取消preview、不提交geometry；blur保留capture，顯式slide/mode/selection intent使尚未change的pending失效。S6與S10 chooser用薄kind欄位隔離wrong-input events；insert busy維持至optimizer settlement。接受File後沿S9 async target語意，切頁／mode／export不重定向，其他編輯保留。成功沿S8清selection，不新增auto-select authority。永久toolbar有獨立marker，export清理，offline恢復不重複input。

## 實作與可重驗證據

單一clean native Worker Dalton，shared sequential writer、medium、模型依native runtime繼承。Worker STOP後Mainline審diff、自驗與正式host；未額外spawn Reviewer。6個source paths，兩個必要擴充為component-interaction mode後callback／picker cancel及mounted double四行controls；S8/S9 helper/schema/dependency未改。

Worker scoped **181/181 PASS** 含當時S10的29cases；其後補IDcollision-before-change／export-remount，S10 **31/31 PASS**。有效unique scoped183，但沒有冒稱單次183fresh run，也沒有把181+31加成212。逐命令見worker/pptskill-wp2-s10-commands.json。原public RED0/1及scoped **147/152 FAIL** 都保留：chooser kind直接傳disabled造成null/string，修Boolean coercion，既有S6/S7 assertions未改。

Mainline full **617/617具名cases PASS**，67檔明列nonbrowser-files.txt、完整names見nonbrowser-summary.json。包含S10及所有既有非browser測試；沒有filtered empty-file PASS混算。Fresh build與ZIP lifecycle PASS。

Browser前fixture-only曾FAIL：新增無圖頁清空components卻保留component-focus slot，render拒絕不存在portable-quote。主線只修runner fixture為既有合法title-points composition；node syntax與fixture-only GREEN，詳mainline-fixture-repair.md。沒有放寬產品契約或改runtime/ZIP；Worker original hash保留，僅runner hash與Worker交回不同。產品freeze已包含此fix，正式browser首輪才啟動。

## 正式host／browser／PGQ

正式host CODEX_SANDBOX=None；AI Core commit、capacity lifecycle、12秒logical-line readiness、owned root皆在controller-receipt／lifecycle。未改AI Core/Rule24、未unset sandbox、未裸啟Chrome。

1280×720、1600×900各 **23 checks PASS**：base10＋12 chooser紀錄＋1 ui-lifecycle。這是check records，並非23個互斥功能案例。真pointer mousedown→hit/rect穩定→mouseup與fileChooserOpened，驗backendNodeId確實是專用input；DOM.setFileInputFiles送真3×2 PNG，trusted change沿真optimizer／S9／S8。包括同檔重選、首個空缺ID、無圖頁、preview取消、互斥／wrong-input、pending失效、busy、async captured identity＋其他編輯／export、真pointer新圖選取及fit、export/offline再插入。

兩viewport errors/HTTP/remote皆0，targetClosed=true。兩者naturalBlurCount=0；trustedChange各9 true＋1 false（harness的wrong-input synthetic probe）。blur/cancel/focusin明標synthetic；CDP chooser automation不等於人工OS dialog。不得擴張成native OS picker實測。

四支affected PGQ串行 **單輪16/16 unique named PASS**；本S10沒有browser/PGQ retry。Browser.close與supervisor exit0、exact owned root與isolation marker實際absent。S8歷史I/O errno仍未知；本輪成功不是環境根因修復證據。

## Artifact／視覺／限制

Source **6/6**、protected **4/4 MATCH**。ZIP **2,294,310 bytes**，SHA256 `c8d5d55cb91e23f73d9696c852bbe3c1bbb81f0c805c5e956e63a1baf6af623a`，比S9增加581 bytes；ZIP內deck-editor/component-interaction bytes吻合。Browser source、22份HTML artifact hashes核對；兩張新UI screenshots另外核對dimensions/hash，不依賴runner artifacts是否列出PNG。

主線實看雙viewport：插入／替換／fit controls可辨，pressed/focus與selection/resize handle可見，toolbar無viewport clipping。fixture固定geometry會覆蓋原內容，符合卡片不提供自動避障的範圍；不宣稱整頁自動排版、crop pixel或語意alt產生。20MiB仍由既有export gate，沒有新drop/clipboard/crop/history。

raw logs以gzip＋hash保留，可讀logs只正規化行尾空白。歷史RED/FAIL未覆寫。Mainline acceptance不等於Independent GO；candidate→handoff只control/evidence，工作樹預期只原四protected untracked。

## Independent Review closure

Owner交回GO，P0–P3全0；reviewed SHA `7f79b58bdd492c90fd1bf6d510c7692492c94a84`。Reviewer fresh targeted125/full617 PASS；browser23+23及PGQ單輪16為committed evidence核對。正式紀錄：`evidence/edx-wp2-s10/independent-review.md`。本節取代上文歷史pending狀態；產品與ZIP未變，未merge/push/deploy，S11未開。
