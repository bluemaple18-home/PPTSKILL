# 執行紀錄

Mainline 前置已核對 base df584eb、S16 source4/protected4/ZIP。最初誤以外層空 git repo 查 HEAD，改至 canonical repo 後取得實際基線。

派工 preflight：sandbox 的 uv 先因 cache ACL 失敗，改到本輪 tmp cache 後因 macOS system-configuration 初始化 panic；未重複盲試，轉由原生 require_escalated 主機執行同一標準 gate 後 PASS。未 unset CODEX_SANDBOX、未改 AI Core。

Worker 首次指定 medium 被 runtime 拒絕：繼承 chatgpt-web/pro 僅支援 ultra，未建立 agent。依 schema 省略 override 後建立唯一 clean Worker Banach；agent_id 01a0ceab-4b6e-7b62-94e7-e977f1f4b179。

Host controller 沿 S16 已驗受管流程，只替換本卡 evidence 路徑／regression flag／receipt key；不更改容量、readiness、teardown 契約。所有既有 S16 evidence 保留。

Worker 已完成並關閉，產品只改四個指定檔案；RED 53 項中21 FAIL，GREEN53／Worker scoped317 PASS。Mainline fresh scoped10檔313、full74檔874 PASS，build/probe ZIP PASS。ZIP byte-match 初次誤用 PPTSKILL/runtime 路徑，檢查 archive listing 與 builder 後改為實際 PPTSKILL/core/runtime/deck-editor.js，byte-match PASS。

首輪 host-acceptance 在1280×720完成17個 records後，固定右下角空白測試點未命中 slide；harness doubleClick hit-test assertion在送該次事件前拒絕。console/pageerror/network/http/remote均0，targetClosed；Browser.close/supervisor退出0，ownedroot/marker消失，source/protected/ZIP未漂移。PGQ未啟動。此輪為 NOT_PASS，不當成 browser PASS。

Mainline限域修正 harness：先在六個固定候選點量測viewport／elementFromPoint，選唯一可見且無editor chrome／element identity的slide空白點，再送原CDP雙擊；保留hit-test、trusted event、單一dblclick與空白elementId斷言。記錄每個probe，無runtime/ZIP修改。初輪freeze另存source-hashes-initial.json，重測使用獨立host-pointer-repair路徑，歷史FAIL保留。

最終 host-pointer-repair 全部通過：雙viewport26+26、PGQ單輪16 unique named、readiness/Browser.close/supervisor exit0、source4/protected4/ZIP與artifact hashes MATCH、ownedroot/marker實際不存在。原固定右下點在兩尺寸命中NAV／SPAN，新的有界probe找到SECTION空白；未降低assertions。四張PNG已直接檢視。

少數狀態查詢／stdin輪詢被工具層以「OpenAI無法確定要求的安全狀態」攔下，沒有修改環境或重啟工作；改讀既有controller/PGQ evidence，確認原先核准的同一host流程已完成，再獨立核對最終receipt。未留下待核准或未完成的功能步驟。

收尾 staged diff-check 發現 Worker 原始 RED assertion dump 含行尾空白；未改寫 raw FAIL。改以worker-red.log.gz無損保存，解壓bytes／SHA-256與原/private/tmp log一致，詳worker-red-archive.json；worker-log-hashes.json的red仍指原始解壓內容hash。其餘raw logs保持原樣。
