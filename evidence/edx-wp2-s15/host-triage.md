# S15 Host 首輪 triage

root question：ID collision fixture能否先合法建立以驗證UI first-free？首輪1280先完成base10＋S15 19＝29records，下一個API fixture在browser-cases:53被validateComponentGeometry拒絕，x40低於safeInset80；第二筆同樣x40非法。不是UI插入runtime defect；validator正確fail loud。此時新UI／Enter換行／invalid→500emoji／取消Escape／syntheticIME／empty/no-image均已過，尚未驗後段stale/chooser/offline，也未跑1600與PGQ。

CodeGraph未命中validateComponentGeometry，限域source確認safeInset80/minSize80。Mainline最小單檔harness修正兩筆collision fixture為{x:1200,y:600,w:80,h:80}與{x:1320,y:700,w:80,h:80}，均在safearea內；不改runtime/tests/ZIP，不放寬validator或assertions。Node直接驗證old拒絕、新接受，再做一次formal host-harness-repair補缺的後段與1600/PGQ。

首輪Chrome readiness0、errors0、targetClosed、Browser.close0/supervisor0、owned root/marker absent、source/protected/ZIP MATCH，完整host-acceptance/保留。只發生一次此blocker；不是同類連續兩次無進展。Mainline CONTINUE：修正fixture前置後取得尚缺的正式驗收證據；若相同原因再失敗先停止重判，不盲retry。

## 第二輪：resize fixture 的小數 screen pixel

host-harness-repair在1280通過46records，前輪IDfixture已過，後續stale/chooser/draft export/offline UI與move均已通過。offline resize預期width512，實際511，其餘x584/y304/height344一致；尚未完成末尾export／1600／PGQ。這是不同的觀測，Mission evidence從29→46有實質進展。

Source確認interaction按pointer delta投影再Math.round到canonical；harness原本32×0.8=25.6 screen px，未觀測實際received pointer delta，故小數像素量化是待驗推論，不直接宣稱產品defect或Chromium已證根因。Mainline REPLAN此單一測試輸入：handle起點round成整數screen px、canonical delta40→1280時32px／1600時40px，x/y同量；新增trusted pointerdown/up實測delta assertion。仍精確assertcanonical520×360，不放寬到tolerance、不改runtime/ZIP。此controlled retry補輸入證據並驗原offline resize能力；若該seam再fail，停止局部browser retry重判，不能連續換期望值追綠。

第二輪readiness/Browser.close/supervisor均0、targetClosed、errors0、owned root/marker absent、hash前後MATCH；完整證據保留。

第三輪host-pointer-repair雙viewport各48records PASS（base10＋S15 38），已補全stale／chooser／offline resize／export。1280 trusted pointer down(851,499)→up(883,531)，32screen px；1600(1064,624)→(1104,664)，40screen px；canonical resize精確520×360均PASS。這證明受控整數像素輸入可通過，不回填首輪未觀測到的pointer delta，也不宣稱已證所有小數像素量化細節。runtime/tests/ZIP自274183c後未改；PGQ與最終managed cleanup仍在跑，須以controller最終receipt裁決。

最終controller結果PASS：PGQ單輪16/16、readiness/Browser.close/supervisor exit0、owned root/marker absent，source6/protected4/ZIP前後MATCH。host-final-verification.json核對26個artifact hash與兩viewport各48records；四張toolbar/dialog截圖已實檢。
