# 主線 Repair1 程式複核

固定候選 2db6185d13a6713700d0186758b1261ff23b9d85。F1–F5 修復路徑主線核對：pageshow重建owned projection；rawpatch在投影成功前保留原DOM/selection/dialog，失敗清partial新ownership並回舊；checkpoint/rollback reconcile observer/listener，含reset尾段throw；授權全文以JSON script嵌入並核hash；preview以target aspect及精確縮放尺寸投影。

Fresh focused27、scoped339、full nonbrowser972 PASS。ZIP lifecycle PASS；source20/protected4與ZIP內容9項MATCH。CODE_REVIEW GO，取代先前CHANGES_REQUESTED的主線部分；獨立Reviewer F1–F5 targeted複審及修後browser/PGQ尚PENDING，不能宣稱整卡GO。

歷史RED與審查漏失仍保留。頁面生命週期回归是synthetic persisted事件，未宣稱真BFCache；只用PNG fixture，不擴張其他格式實測。

## 原Reviewer targeted交回

固定2db6185，final code verdict GO with residual；F1/F3/F4/F5 CLOSED，F2 OPEN/P2。Fresh focused27/scoped339；自有11probes中9PASS/2FAIL，兩FAIL同屬F2的after-side-effect teardown故障注入。主線採用此殘餘判定，不把它算完全原子回退；整卡仍待正式gate完成。詳review-repair1/final-code-verdict.md。
