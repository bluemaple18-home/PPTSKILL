# R2 canonical 整合與 Core3 正式驗收
Status：R2_CANONICAL_INTEGRATED_VERIFIED / OWNERSHIP_CANDIDATE_CODE_GO / OWNERSHIP_CANONICAL_INTEGRATION_PENDING / CORE3_ACCEPTANCE_PENDING。
目標／授權：Owner 在確認本 task 為 Mainline 後明示「那做吧」（2026-09-28），執行已裁決 GO 的 canonical 整合、身分與 scanner 回歸驗證，再接續既有 Core3 雙 viewport／四支串行 PGQ；不 push/deploy、不開 Core4。
整合：依 observer-r2-adoption-decision.md，canonical 須精確 c23e465、無 tracked drift；只匯入 bundle 並 cherry-pick 4edd0747，三檔 hash 必須相同。保存 canonical/untracked 前後身分；失敗僅 revert 本 integration commit，不 destructive reset/clean。
契約：固定 R2 whole-scan bounded re-observation 不改。R2 smoke 已消耗，本輪直接做 adoption 後產品驗收，不另加 smoke。若 observation contract 再失敗，停止 scanner patch 線、不 R3；產品 assertion 失敗不自動新增產品 Repair。
分工：Mainline 是 canonical 唯一 writer；native clean Worker 僅寫 PPTSKILL 本輪 evidence controller／offline tests，不 launch／commit。兩者不共享寫入檔案。控制器沿 host-controller-04.py 與 host-smoke-r2-controller/observer 的既有接點，不新增 launcher/supervisor。
驗收：canonical 三檔／launcher／sensor／policy 身分、直接 scanner regression；固定產品 9ce7396/code f3d8a11、75來源/4protected/ZIP一致；1280×720及1600×900正式 undo/redo browser + 四支 PGQ 串行，保留原測試退出码與首因、console/page/network/HTTP/remote errors、targetClosed，以及 supervisor/root/marker/PID cleanup。無新產品 delta 則引用原1061/1061 nonbrowser與ZIP證據，不重跑全產品suite。
輸出：evidence/edx-core-3-undo-redo/observer-r2-integration-{before,verification}.json；host-acceptance-r2/{controller-receipt.json,mainline-receipt.md}；必要靜態／離線review。主線最終判斷可驗範圍與未驗項，禁止提前closure。

2026-09-28 結果：canonical 已整合為 28cad2d3beaaf32de2f62d0c08396aaba789ea01，33/33 scanner PASS。新產品驗收 controller 的 21/21 offline 雖通過，兩名 blind reviewer 各自重現兩項 P1：child 退出邊界可吞中斷並繼續 PGQ；外部產品 group 未收斂時 browser supervisor 仍可能清除共用 tmp。既有 supervisor 的 runtime failure／TTL 自動 cleanup 也存在同一歸屬缺口，僅加外層 finish gate 不足。

Mainline 裁決：controller NO_GO，manifest 保持 pending，未啟動本輪 host/browser/PGQ，故上列 host-acceptance-r2 預定目錄未建立。實際交付 `evidence/edx-core-3-undo-redo/host-controller-r2-mainline-receipt.md` 與 verification JSON、A/B 原反例。停止無效的局部 signal 修補，不新增 launcher/supervisor、不改 scanner、不開 R3。後續先裁決所有共用 tmp 寫入者的受管程序歸屬與清理責任，再決定最小實作；這是驗收執行契約缺口，不是 R2 scanner host failure。Core3 保持未關卡／核心2/6；產品、ZIP、四個 protected 不變。

## 2026-09-28 Owner「繼續」：歸屬 REPLAN

Root question：如何讓現有 cleanup owner 確認所有共用 tmp 使用者已停止。已接受狀態：canonical28cad2d3與scanner33/33有效，產品固定；未啟動產品驗收。原controller首版一次被拒，兩份review是同一候選的獨立反例；本輪不是scanner Repair/R3，也不重置舊失敗計數。

裁決 REPLAN：淘汰外部controller建立獨立產品session的接法。候選僅擴充既有 `scripts/tmp_session.py` browser入口的可選受管命令：Chrome、驗收client及其子程序繼承同一個 `run_child` owned group。唯一預算、TERM/KILL、收斂與cleanup authority仍是原 `tmp_artifact_lifecycle.command_run/run_child`。不新增跨group registry、cleanup interlock、第二個supervisor或raw tmp；不修改scanner/policy/general cleanup，原無client browser模式保持相容。

why_not_less：外層finish gate無法阻止supervisor自主TTL/觀測失敗cleanup。why_not_more：單一既有group足以涵蓋固定、非detached的產品命令；不吸收通用多group runtime或hostile containment。若固定工具有detached/setsid依賴，或單一group不能成立，即停止本方案，不以新runtime繞過。

實作範圍：重用已空閒候選checkout `.work/ai-core-observer-r2-20260928`，新branch `codex/core3-browser-command-ownership`，base28cad2d3；原CLAUDE.md保留。只允許tmp_session入口、針對性tests與該入口docs；canonical不直接修改。Mainline保持PPT控制文件唯一writer，Worker是候選checkout唯一writer。凍結後兩份blind review及可重現進程測試證據，先完成未啟用候選，不將候選CODE GO冒稱canonical採用或Core3驗收。

驗證契約：同PGID實測；client成功/非零、browser啟動失敗、SIGINT/SIGTERM、TTL/bytes/files停損、client留下descendant及未知收斂時root保留；訊號停止原因不可被exit0覆蓋；root只在整組收斂後清除，foreign root不動。原browser/review測試回歸；程序實測用既有test fixture與正式host執行權限，不清除sandbox flag、不啟動Chrome/PGQ。scanner/產品/ZIP/protected hashes前後不變。

本輪交付：初版1829f1ab formal host25/25、0skip；A/B發現同一留證錯誤被exit0掩蓋（A P2、B P1），採一次Repair1為996492481144e92775780ce932661e38779cdddc。修正版formal browser/routing15/15、0skip，10個真程序case與fresh28 PID/root消失證據；A/B同反例closure GO，Mainline GO_FOR_CANONICAL_INTEGRATION。Delta仍精確三檔；scanner/policy/產品/ZIP/protected不變。詳 `evidence/edx-core-3-undo-redo/browser-command-ownership-mainline-receipt.md`，含固定bundle、hashes及單一integration commit／revert方案。

Canonical仍28cad2d3未套用ownership候選；Owner「繼續」依其AGENTS不含merge授權，整合待明確放行。後續由本Mainline負責candidate整合、PPT同群組client薄接線及正式雙viewport／PGQ驗收，不轉交Mainline。原controller pending未動，禁止直接啟動；未Chrome／PGQ、未push/deploy/Core4。
