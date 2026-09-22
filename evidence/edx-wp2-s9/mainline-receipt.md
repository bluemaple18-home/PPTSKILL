# WP2-S9 Mainline acceptance receipt

Status: READY_FOR_INDEPENDENT_REVIEW
Product: `48fb928e6fe33056995621edfae77d16db6f655f`
Branch: codex/edx-wp2-s9-insert-image-file
Base: `7c614603dc11b9276e73f3b916d25ad046118571`（S8 Independent GO closure）
Main/origin-main: `74d63cc99e745b373adbcc3a56e9228576e74b22`

## 交付／裁決

S8接受Owner交回的Independent GO，只新增closure紀錄，未改reviewed code/ZIP；本輪「繼續」承接開發，不含merge/push授權，因此S8仍未整合main，S9從S8 closure切獨立分支。

S9新增portable `insertImageFile(file,{slideId,componentId,alt,fit?,geometry})`。falsy file回null；有效metadata精確own-data驗證、plain snapshot與identity preflight後，只呼叫既有optimizer一次。await後沿S8 executeOperation對最新spec驗證／一次提交；result與message檢查在提交前，成功回同一optimizer result。切頁/mode/export/caller mutation不重定向，其他等待期間修改保留；same-ID競爭只有先完成者成功。共用S8 metadata/identity seam，不用fake PNG/dataURI占位；S5/S6/S7語意不變。無新UI/File picker/drop/clipboard/auto-ID/schema/dependency/history，20MiB沿既有export gate。

## 實作／non-browser

單一native Worker Bacon clean/shared single product writer/high，5檔變更，mounted double未改。STOP WRITING後Mainline審diff及檢查完整性。Worker **148/148 PASS** 為7個分別test commands加總；S9新測試 **35/35**、5次syntax checks。原RED public API缺失0/1保留；首次完整 **33/35** 的兩個失敗也保留。

中間FAIL1：新測試expected以spread複製non-enumerable geometry得到空物件，改為明列四欄，DOM四欄assertion仍在。FAIL2：新測試誤認既有policy會拒絕SVG內容script；既有asset policy只驗支援MIME／格式／bytes warnings。改用malformed base64 SVG驗格式拒絕，不改product/policy，不宣稱SVG內容sanitization。這兩項是新測試fixture／契約假設修正，非產品修補後偷偷降低既有assertion。

Worker tracked diffcheck exit0；兩個新檔no-index diffcheck原exit1、空輸出，按原樣記錄；Mainline staged diffcheck另行驗證，不能把Worker exit1冒寫為0。

Mainline **586/586具名cases PASS**，nonbrowser-files.txt明列66檔，nonbrowser-summary.json列完整names與counts，沒有filtered empty-file PASS混算。covers metadata/getterCalls0／invalid optimizerCalls0、default/explicit fit、cross-slide/null-proto/frozen/non-enumerable、async snapshot／other edit preservation、malformed result／policy／missing target／identity collision／missing DOM／prepare與append前後throw、競爭、revision/selection/gesture、export/reparse/remount。Mounted成功gesture取消與browser真互動證據分開。

## 正式host／browser／PGQ

Fresh正式host runtime CODEX_SANDBOX=None，AI Core commit沿controller-receipt.json保存。原capacity／12秒logical-line readiness／managed ownership與cleanup；不改AI Core、Rule24，不unset sandbox或裸啟Chrome。

host-acceptance/insert-image-file/acceptance.json：1280×720、1600×900各 **18 checks PASS**（base10＋S9 8紀錄）。S9紀錄為async captured identity1、invalid preflight3、真optimizer rejection1、duplicate race1、decode＋controls1、export/offline1；一個紀錄可包含多個assertions，不宣稱18個獨立功能。

3×2有效PNG由browser canvas產生真File，沿真optimizer後插入；default/explicit fit／跨頁、decoded dimensions、唯一root、alt/src/geometry、whole spec與舊nodes保留。Deferred gate只包住真optimizer，caller mutation＋切頁/mode/export＋其他content/geometry修改後仍提交捕捉target。同ID兩pending逆序完成，晚到者拒絕且無覆蓋。非法File真decode失敗沒有提交。後續圖片selection與fit使用真pointer/trusted events；切頁的fixture觸發是synthetic MouseEvent，未冒稱人工切頁／OS dialog。

console/page/network/HTTP/remote全0、targetClosed=true。四支affected PGQ明列串行 **單輪16/16 unique named PASS**；本S9未retry。Browser.close/supervisor exit0，owned root及isolation marker實際absent。S8歷史I/O errno仍未知；本輪PASS只證明本輪完成，不代表環境根因已修復。

## Artifact／視覺／限制

Source **5/5**、protected **4/4 MATCH**。ZIP **2,293,729 bytes**，SHA256 `441dff2d237352634caaa7bf41da0edd5814f1bd491618cd5aa58a484e42d76f`，比S8 +395 bytes。Fresh ZIP lifecycle PASS，image-insertion/deck-editor ZIP entries與repo bytes MATCH。Browser source與22份HTML artifact hashes核對，兩PNG dimensions/hash見host-final-verification.json。

主線實際看過雙viewport新圖截圖：藍黃image、selection/resize handle與既有fit/replace controls可見，toolbar無viewport clipping。fixture指定geometry與舊文字有重疊，不宣稱自動避障、整頁視覺品質或crop pixel驗收。API-driven File/optimizer不是native picker/OS clipboard，不新增插圖UI。20MiB沒有per-insert aggregate admission。

raw logs gzip與hash保留；可讀logs僅正規化行尾空白。所有RED／中間FAIL未覆寫。主線acceptance非Independent GO；candidate→handoff只control/evidence，S9未merge/push/deploy、未開下一Slice。工作樹只剩原四protected untracked。
