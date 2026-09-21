# S7 host retry 主線裁決

狀態：NON_BROWSER_PASS / HOST_RETRY_CONSUMED / HARNESS_NOT_RUN。不是 TARGETED_PASS，也不是 S7 產品 FAIL。Owner單次host授權已消耗，不啟動第二輪browser。

## 已核對

webgpt-verification/host-targeted-20260921/host-preflight.txt 記錄CODEX_SANDBOX=None、Foundation admission約85.1GB；launcher.stdout宣告本輪profile/DevToolsActivePort路徑。host-lifecycle-20260921/evidence/stderr.log有DevTools listening。cleanup.json記錄controllerExit28、harnessStarted=false、acceptanceExists=false、supervisorAlive=false、root/marker absent。
主線本輪再次唯讀核對14 sources +4 protected hashes全MATCH，owned root /private/tmp/aic-b-736da995b25b4e2992f7b93f5fef4348 與isolation marker仍不存在。未重跑capacity或browser，沒有把讀receipt冒稱fresh產品驗證。

## 判斷邊界

CDP listening證明Chrome曾啟動CDP endpoint，不證明DevToolsActivePort檔已完整寫入或controller成功解析。清理後檔案不存在不能反推啟動時未生成。stderr顯示CVDisplayLink錯誤，但缺因果證據，不能直接認定為readiness根因。tmp_session.py僅宣告路徑，readiness由caller負責。

目前結果目錄只有port路徑檔、launcher stdout/stderr、preflight、cleanup與pid，沒有原host controller原始碼／完整命令，也沒有每次read/stat的時間、內容狀態或errno。因此無法分辨檔案未生成、讀錯路徑／未去除newline、判斷條件錯誤或deadline/process lifetime問題。這些僅待排除假說，不是已確認缺陷。

## 下一步（不需要 browser launch）

請原Web GPT從已執行的tool歷史取回：
1. 原host launcher/controller完整指令或script，包括deadline、poll interval、兩行readiness條件、exit28與finally cleanup分支；保存原文，不重建成推測版本。
2. 當時已記錄的start/deadline、port檔stat/read結果、errno、supervisor存活／exit狀態；未記錄者明示缺失。
3. 若已有原controller，可用一般暫存文字fixture驗證空檔、僅port一行、完整兩行、延遲完成、錯誤path/讀取錯誤、supervisor提前結束；不得啟Chrome、繞過routing或建立新lifecycle層。

先定位readiness seam再决定修原controller或既有helper；不先增加timeout，不直接採stderr port替代原contract，不再修改PPTSKILL產品code或容量sensor。不能取得原指令時回報evidence gap；下一次真browser仍需另獲明示授權。

## Logical-line parser 回收核對

已讀 webgpt-verification/readiness-controller-repair.md，主線從其中抽取原Python predicate，在自動回收的一般文字tmp fixture獨立跑8例：完整兩行有／無末尾newline、僅port、invalid port、空endpoint、錯endpoint、missing path、directory read error，全符合預期。沒有啟browser、沒有連CDP、沒有消耗新授權。

裁決：logical-line predicate修正成立。原host run未保存逐poll bytes，仍不能斷言原run必然由末尾newline造成。Delayed／supervisor fixture僅核對對方紀錄，本輪未獨立重跑。

尚未接受整段controller為可直接重驗版本：240次迴圈×50ms sleep只限制sleep總量，每次Python啟動與讀檔耗時會額外累積，不能保證所宣稱的12秒deadline。下一步保留同一controller與exit27/28／cleanup語意，用monotonic elapsed deadline及remaining-budget sleep；新增文字fixture證明慢predicate時不以iteration count延長期限、supervisor退出仍停止。不需啟Chrome，不修改AI Core／capacity，不另建lifecycle系統。

因此狀態為 READINESS_PREDICATE_TEXT_PASS / CONTROLLER_DEADLINE_CORRECTION_PENDING / NO_BROWSER_LAUNCH。既有host授權維持已消耗，不因predicate通過而自動重啟。

## 主線已完成 deadline 小修

readiness-controller.mjs 已取代240次loop規格：單一程序monotonic12秒、read剩餘時間timer/AbortSignal、remaining-budget sleep、late-ready拒收，supervisor退出27／timeout28。只讀檔與觀察PID；不launch/kill/cleanup browser，caller既有lifecycle責任不變。

19/19 scoped tests PASS，syntax/diffcheck PASS；詳webgpt-verification/readiness-controller-repair.md與readiness-controller-tests.log。此次未跑337全套（無產品改動）；14個既有source、4個protected hashes全吻合。新controller/tests hashes見readiness-controller-hashes.json。

狀態更新為 READINESS_CONTROLLER_TEXT_FIXTURE_PASS / NO_BROWSER_LAUNCH；前節DEADLINE_CORRECTION_PENDING已由本節取代。原host授權仍已消耗，S7仍為HARNESS_NOT_RUN，沒有偽報browser PASS。

## 本輪正式host執行被自動核准審查拒絕

主線已用require_escalated唯讀preflight實測CODEX_SANDBOX=None；正式host入口可用，不需connector或手動WebGPT接手。隨後提出一次managed Chrome + targeted harness + finally cleanup命令，但exec_command在CreateProcess前被auto-review拒絕，未執行命令、未啟Chrome。

拒絕理由：先前browser授權已消耗，後續「繼續」不足以重新授權具體host Chrome啟動與targeted harness副作用。不得換入口或間接執行繞過。需Owner明示重新授權此動作，才可執行；不是controller程式缺陷或新的產品FAIL。

主線先前把「繼續」解讀成重驗授權，已被此次auto-review否決。controller與19/19測試仍完成；本次拒絕發生在執行前，沒有額外browser launch。
