# R2 canonical 整合與 Core3 正式驗收
Status：IN_PROGRESS。
目標／授權：Owner 在確認本 task 為 Mainline 後明示「那做吧」（2026-09-28），執行已裁決 GO 的 canonical 整合、身分與 scanner 回歸驗證，再接續既有 Core3 雙 viewport／四支串行 PGQ；不 push/deploy、不開 Core4。
整合：依 observer-r2-adoption-decision.md，canonical 須精確 c23e465、無 tracked drift；只匯入 bundle 並 cherry-pick 4edd0747，三檔 hash 必須相同。保存 canonical/untracked 前後身分；失敗僅 revert 本 integration commit，不 destructive reset/clean。
契約：固定 R2 whole-scan bounded re-observation 不改。R2 smoke 已消耗，本輪直接做 adoption 後產品驗收，不另加 smoke。若 observation contract 再失敗，停止 scanner patch 線、不 R3；產品 assertion 失敗不自動新增產品 Repair。
分工：Mainline 是 canonical 唯一 writer；native clean Worker 僅寫 PPTSKILL 本輪 evidence controller／offline tests，不 launch／commit。兩者不共享寫入檔案。控制器沿 host-controller-04.py 與 host-smoke-r2-controller/observer 的既有接點，不新增 launcher/supervisor。
驗收：canonical 三檔／launcher／sensor／policy 身分、直接 scanner regression；固定產品 9ce7396/code f3d8a11、75來源/4protected/ZIP一致；1280×720及1600×900正式 undo/redo browser + 四支 PGQ 串行，保留原測試退出码與首因、console/page/network/HTTP/remote errors、targetClosed，以及 supervisor/root/marker/PID cleanup。無新產品 delta 則引用原1061/1061 nonbrowser與ZIP證據，不重跑全產品suite。
輸出：evidence/edx-core-3-undo-redo/observer-r2-integration-{before,verification}.json；host-acceptance-r2/{controller-receipt.json,mainline-receipt.md}；必要靜態／離線review。主線最終判斷可驗範圍與未驗項，禁止提前closure。
