# S16 首輪 browser triage

1280首輪35 records後在gesture中button.click→dialog.open assertion FAIL。console/page/network/http/remote空，PGQ未跑；Browser.close/supervisor0、ownedroot/marker absent，原evidence保留host-acceptance。
CodeGraph query未命中；rg檢視component-interaction routeGestureControl與deck-editor button pointerdown。排名假說H1：harness直接.click跳過按鈕pointerdown，未先cancel vendor drag，window vendor click blocker阻擋事件到product handler；H2：selected target在gesture中失效。首輪未記錄event-path，故不宣稱H1已live證實。
單變量修正：同S15已驗pattern改真CDP button pointerdown/click，增加gesture前後state與trusted input evidence；不改runtime/tests/ZIP。若仍失敗則有event-state可重判，不盲換timeout。Expected：dialog open，gesture=false，release後canonical未改。

## Pointer retry 與新產品缺口

9c2d485的雙viewport各39 records PASS；H1修正後dialog可開、真pointerdown與gesture取消均有記錄。此證據只證明真pointer路徑通過，不補造首輪未觀測vendor event-path。PGQ進行中Mainline追加mounted snap-on probe，發現即使無gesture，openEditText的cancel('edit-text')沿snap分支clearSelection，submit失去捕捉identity。此為不同、可重現產品缺口，並非同一browser blocker再猜。
主線向精確owned controller PID發SIGINT，停止已知不完整候選的PGQ；finally Browser.close0／supervisor0／ownedroot與marker absent，controller NOT_PASS／KeyboardInterrupt完整保留host-pointer-retry。不計PGQ PASS。
新增snap=false/true × gesture=false/true四case：原版28/32（兩個snap=true dialog.open FAIL；兩個snap=false在新增assert因VM Array prototype不同而FAIL）。最小修正只讓文字dialog的open與button pointerdown沿既有cancel('picker')保留selection，仍cancel preview；不改component-interaction／S14 authority。Browser增snap兩狀態真pointer開啟與save。這是Mainline同一卡bounded repair，需重跑full、重建ZIP、freeze新SHA再host，不沿用舊產品驗收。

修正cancel reason後四case均能開dialog，但新assert的cross-realm Array比較造成scoped256/260、full817/821 FAIL。測試將selected用Array.from轉同realm後比較ID，原identity assertion不弱化。前一shell尾隨diff-check令exit0，主線誤啟full；full按自身exit1停止，未build/host。此執行偏差及FAIL logs完整保留。

## 新候選驗收

f5db0c0 final host：雙viewport各42 PASS，含snap=false/true真pointer開啟／cancel preview／release不提交及正常save；PGQ單輪16/16，readiness/Browser.close/supervisor0，ownedroot/marker absent。四source／四protected／新ZIP前後MATCH。本輪同一harness click blocker只有一次FAIL，pointer修正後已通過；後續是獨立mounted證明的新snap產品缺口，修復後fresh全鏈路通過。
