# S18 診斷 Repair 1

主線修復 F1/F2/F3；不修改產品、ZIP、AI Core 或原第一輪紀錄。
- F1：log open 與 CDP close 全部在 try 內；finally 必到 supervisor wait，原25秒／terminate／30秒保留。後續cleanup/hash/receipt失敗各自記錄，不能PASS。
- F2：observer先恢復trace。診斷open/write/final hash失敗不覆蓋原非零／例外；原0或正常return改成明確診斷exit74。controller另核完整diagnostic＋scanner hash、scan count、no I/O error，不以supervisor0單獨PASS。
- F3：seen在每次scanner開始／結束清空，不跨invocation用已釋放例外id去重。
- Fresh隔離probe26 cases PASS，不啟browser／Popen／signal。尚未完成host gate。

最初Mainline盲審未認列F1/F2，第二份盲審以repro推翻；保留兩份初判，不改寫初判為正確。Mainline撤回診斷初判GO，修復後待原Reviewer targeted re-review。
原delegation preflight worker0 FAIL後誤spawn，但立即STOP；Reviewer回報未執行工具。按既有Goodall worker1的完整S18鏈更正PASS後才恢復同一Reviewer。未新增第二Reviewer、未以修復掩蓋此偏差。
