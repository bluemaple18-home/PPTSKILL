# S7 — Web GPT 修復驗證

Status: HOST_RETRY_CONSUMED / HARNESS_NOT_RUN；不再授權 browser launch。
工作名稱 → 正在做什麼 → 現在狀態：S7 motion reset → 核對修復及驗收環境 → 尚非 review candidate。
角色：Web GPT bounded verifier；Owner 手動交卡，不由 Mainline 開新 task 或呼叫 connector。主線仍為目前 Codex task；不是完整專案/Mainline 轉交，不是 Independent Review。
節省模式：一位執行者、逐步驗證，模型沿 Owner 選定設定；不另開 agent／平行 writer，不重做 S3–S6。

## 工作樹與入口

本機 repo-root：`/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical`。
Branch：`codex/edx-wp1-s7`。
HEAD：`4cd4540a71aa7f94cc60e4495155c572034a57a4`，僅為開卡 commit，**不是含修復的 candidate SHA**。
S7 實作、修復、tests/evidence 都尚未提交。必須讀取這份現有工作樹；只 clone HEAD 會遺失候選。跨環境若不能取得相同檔案及 hashes，回報 ACCESS_BLOCKED，不拿舊 SHA 當候選。
原 Worker Locke frozen；本卡交出後 Mainline 不平行改 delivery source。先唯讀，不 reset／clean／stash／checkout，也不 commit。

按需讀取：
1. 適用 AGENTS.md、`/Users/matt/ai-core/config/devflow_context_map.tsv` 指定規則。
2. `tasks/edx-wp1-s7-component-grid-snap.md`。
3. `evidence/edx-wp1-s7/motion-reset-repair.md`、`motion-reset-hashes.json`。
4. `evidence/edx-wp1-s7/mainline-checkpoint.md`、`motion-resize-diagnostic/acceptance.json`。
5. `evidence/edx-wp1-s7/mainline-checkpoint-cleanup.json` 與 `routing-lifecycle/evidence/`、`enter-lifecycle/evidence/`。

先比對 motion-reset-hashes.json 所有 sources/protected。四個既有 untracked 為 `.DS_Store`、`CLAUDE.md`、`HANDOFF-20260914-P0-R11-R1-S3.md`、`HANDOFF-20260914-PGQ-WP1.md`，不可修改／stage。

## 問題與現有修復

歷史 fresh browser：1280×720、brand-device-accent normal 正常；reduced 模式 SE handle 中心落於(0,0)，resize 未提交，連續兩次重現。1600×900與後續 motion cases 未完成。Static 有相同 source 風險，不能宣稱已實測失敗。
原因鏈：S7 editor overlay/vendor container 放在 slide 內，motion-primitives 的 reduced/static 全體 transform:none!important 覆蓋 Moveable inline translate3d。

現有修復僅 `runtime/motion-primitives.js`：把 transform reset 拆出，排除 `[data-pptskill-editor-chrome]`、`.moveable-control-box` 及各自子孫／pseudo-elements；全體 animation/transition/opacity/clip-path reset 保留。`:where` 保持排除条件零 specificity。不要重寫 geometry、改 vendor、加套件或以 updateRect／改 pointer 方向掩蓋。

既有 source 契約 RED 2 pass/2 fail → GREEN4/4；最新 non-browser337/337、CSS parser warnings0、diffcheck PASS。這些不是 browser cascade/geometry PASS。PGQ28unique僅 inherited，motion seam已修改，不能用舊證據宣稱本候選完整PASS。

## 授權與停止邊界

Owner 已在目前 Mainline 互動對話中，針對「授權 S7 在正式 host runtime 做一次 targeted browser retry」明確回覆「授權」。此為本卡一次性重驗的有效授權，執行者不必再次索取相同確認；不表示歷史失敗計數被清零。
先完成唯讀 preflight、source核對及環境檢查，再於正式 host runtime 執行一次 targeted 驗證。再次產品失敗或環境停損即停止，不自動續跑、換 executor 或重建 profile 重試。本次授權已由 host-targeted-20260921 消耗；不可再以本卡啟動 browser。

兩個歷史受管session因 resource observation unknown (scan limit) exit2；主線當時已確認 owned root與isolation marker不存在。先核對lifecycle證據與當前環境，不把root已回收等同browser環境已可用。不得修改ai-core helper、放寬容量/掃描閘門、清除unknown marker或裸spawn Chrome。若環境不具合法可用browser入口，回報ENV_BLOCKED，不反覆試啟動。

## 執行與驗收

A. 唯讀 preflight：確認repo/worktree/hash/access、source原因與修復邊界、受管browser歷史停損。Coding/source decision前查CodeGraph；缺命中才bounded rg。缺repo access就停，不推論工具已可寫。
B. Non-browser：執行 `node --test tests/edx-wp1-s7-motion-reset.test.mjs`，檢查現有337具名結果與source版本；只有diff或新疑慮才重跑全套。讀 diff確認不清除canonical內容的transform reset，包含subtitle ::after。
C. Owner授權已取得；確認未消耗且正式host環境可用後，單輪 targeted browser：沿既有attach-only harness、owned profile/target，提前掛console/page/network/HTTP/remote listeners；可新增窄harness檔，不能改production code或弱化原斷言。
   - 1280×720／1600×900；brand-device-accent 的 reduced與static各驗canonical proxy與SE handle一致，handle位於右下角且elementFromPoint命中。
   - 真pointer drag/SE resize：preview不改spec、release單次提交；內容保留static終態，editor transform保留定位用途。
   - subtitle ::after 不恢復進場transform；normal作對照，不改既有motion效果。
   - export/reopen不含editor chrome/proxy且geometry一致；不把程式focus/synthetic lifecycle稱為OS IME或真點擊。
   - owned target/profile cleanup證據完整；若產品斷言失敗或scan-limit再發，停止，不做第二輪targeted retry。
D. 通過只回報 TARGETED_PASS，交 Mainline決定後續完整S7兩viewport/三treatment及fresh受影響PGQ content-integrity/required-visibility。不得直接宣稱S7 GO或Independent GO。

若發現修復仍不足：提供file/line、expected/actual、可重現證據與最小修法，退回 Mainline裁決；本卡不授權額外production修補。

## 輸出與禁區

結果放 `evidence/edx-wp1-s7/webgpt-verification/`，保留原失敗資料。receipt載 preflight、實際source hashes、命令/exit code、fresh與inherited區別、browser授權引用（本卡所記Mainline對話）、錯誤與cleanup、changed paths、下一步。沒有實測不得標PASS。
不merge／push／deploy、不改ZIP／schema／vendor／ai-core、不新建task或多代理、不冒充獨立review。若只能唯讀access，回傳文字receipt即可，明示未寫入。

## 本次 host routing 補充

AI Core `tmp_session.py` 已存在 `CODEX_SANDBOX` guard，回 `browser_launch_blocked_in_codex_sandbox`；Owner回報routing regression16/16，主線僅唯讀核對guard存在，沒有冒稱獨立重驗16項。當前Mainline環境CODEX_SANDBOX存在，因此不從此處spawn，也不以unset環境變數或換shell規避。Web GPT須實際核對所用工具是否為正式host runtime，不能僅憑工具名稱認定。

沿原合法managed lifecycle入口，不放寬Rule24/Foundation sensor/容量/掃描限制，不修改ai-core。Routing修復不代表歷史host scan-limit已證明消失；本次若再停損即留receipt並停止。執行者仍由Owner手動交卡，主線不代開task或connector。14個source及4個protected hashes於授權回填時全MATCH。

## Mainline 回收裁決

已核對 webgpt-verification/receipt.md、host-targeted-20260921/cleanup.json 與 host-lifecycle-20260921/evidence/stderr.log：CDP listening存在、harness未執行，不能判產品PASS或FAIL。授權已消耗；cleanup receipt VERIFIED，主線再核對owned root及isolation marker均不存在、14+4 hashes MATCH。詳 evidence/edx-wp1-s7/readiness-mainline-decision.md。後續先補readiness controller指令與輪詢證據，不啟動browser、不改產品。

## Deadline修正已可交付

主線已完成readiness-controller.mjs與19個文字／時間／程序存活替身測試，全部PASS。參照webgpt-verification/readiness-controller-repair.md的最終caller整合段，不再使用240次sleep迴圈。原授權維持已消耗，本更新只交付controller，不允許自行browser launch；取得下一次明示授權前只可唯讀或文字驗證。

## 主線最新host重驗

Owner另次明示授權後，主線直接host執行一次；readiness PASS、1280 normal/reduced/static15 checks PASS，1600被runtime budget exceeded停損。新授權亦已消耗，不再launch。結果與cleanup見 evidence/edx-wp1-s7/mainline-host-targeted-final/receipt.md；舊HARNESS_NOT_RUN僅歷史狀態。
