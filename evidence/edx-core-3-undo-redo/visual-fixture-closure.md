# Core3：fixture 遮擋修復後正式關卡

2026-09-29。**CORE3_CLOSED / FUNCTIONAL_PASS / VISUAL_PASS**；六張核心主卡 **3/6完成、3張剩餘**。本收據取代a3c93c8的過早clean closure及77f35a4的VISUAL_NO_GO現況；兩份歷史保留，不改寫。Core4未開始。

## 修了什麼

標題實際為「成果，不鎖在工具裡」，沒有BI；遮擋來自Undo/Redo測試注入的A/B。paired診斷證明只改字距仍重疊，移A/B即可消除。Owner接續授權後，只把驗收fixture的y120移到600，新增可見性／標題相交gate，產品字體、runtime和ZIP不改。原font-only／必須重打ZIP提案由此因果證據及Owner契約取代。

舊120位置在正式browser負控制必須被拒，finally還原完整已量測狀態後600位置必須通過；A/B不能隱藏、刪除或移出viewport規避。source、PNG與measurement身分均保存，原11功能檢查全部保留。

## 驗證與裁決

| 項目 | 本輪證據 |
|---|---|
| 候選離線 | Worker、Mainline與A/B fresh Node4/4、Python14/14；原位置拒絕、新位置通過及錯誤finally probes。 |
| 獨立code | visual-fixture-review-a-code.md、visual-fixture-review-b-code.md：CODE GO；固定SHA後僅manifest pending→FINAL。 |
| 正式browser | 唯一一輪1280×720、1600×900各12/12＝原11＋visual1；錯誤陣列空、targets正常關閉。 |
| 真PNG | 主線及A/B各自直接看四張RED/GREEN。舊遮擋重現、新標題完整；A/B可見不出界，title/rightquote measurement保持。visual-fixture-review-{a,b}-visual.md均GO。 |
| PGQ | 四支串行16/16，0fail/skip/cancel，exit0，708396.900292ms。 |
| Observer／清理 | 705 scans全COMPLETE、journal逐筆相符；supervisor/client/browser/close全0；同outer PGID40646，root/marker消失，Mainline及B fresh PID查無殘留。A的fresh ps受sandbox限制，明列採用本輪host觀測。 |
| 收尾獨立review | visual-fixture-review-a-host-closure.md、visual-fixture-review-b-host-closure.md：本輪bounded acceptance GO，無新增阻塞。 |
| 身分 | 產品75、protected4、ZIP、core六檔與原untracked六檔全保持；before==after==current。 |

完整正式收據：[host-acceptance-visual-fixture/mainline-receipt.md](host-acceptance-visual-fixture/mainline-receipt.md)。39份raw SHA索引：[mainline-verification.json](host-acceptance-visual-fixture/mainline-verification.json)。主線直接看圖記錄：[mainline-visual-check.md](host-acceptance-visual-fixture/mainline-visual-check.md)。

## 固定身分與限制

產品packaged `9ce7396a481621960f6f2c89ff7fcf352c0e515a`、code `f3d8a11865a5af25f34a08a5b65dccb3fed6914f`；ZIP仍2329758bytes／SHA `862bb19f82b10fab9a244a1c334fed1f39b6edc1ad5c5ff95aebe3cc04daf290`。沿用固定產品原round08雙CODE GO與1061/1061 nonbrowser，這輪沒有冒稱重跑全產品。AI Core canonical仍 `71b774d31b8e7aa9e05786c8dc431c7528dabdc1`、tracked clean。

本輪**RECOVERY_NOT_OBSERVED**；前次owned-group scan533真ENOENT recovery保留為歷史獨立證據，不算本輪。容量上限64MiB/10000/3600不變，峰值31942419bytes/751files。gate限定固定fixture DOM矩形／CSS可見性＋實圖核對，不是通用glyph ink/OCR/hostile compliance。

原receipt I/O P2與Crop F2/P2保留，後者仍留第6張重判；本輪沒有修復或隱藏它們。原a3c93c8不單獨推送。本輪只保存local checkpoint，未merge／push／deploy／production／Core4。回退本輪fixture工具變更即可撤回修復；歷史raw不刪，不動已推canonical或產品。
