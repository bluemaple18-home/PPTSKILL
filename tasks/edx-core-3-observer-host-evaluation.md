# Core3 observer：AI Core 採用前 host 驗證

Status：`HOST_EXECUTED_ONCE / NOT_PASS / ADOPTION_NO_GO / CLEANUP_VERIFIED / REPLAN_REQUIRED`。

## 主線裁決

固定候選的code review已足夠，不再開產品repair或重跑50/23。PPTSKILL主線接受 `8e6094582547205db70f6dccce369d694f50154b` 作為有界host評估候選；**canonical採用HOLD**，需AI Core側確認正式試驗入口及host結果。不是merge/activation指令。Core3仍CODE_GO／HOST_BLOCKED，核心2/6、Crop F2/P2保留，不開Core4。

## 固定身份與接手

- AI Core candidate branch `codex/pptskill-observer-enoent`，HEAD `8e6094582547205db70f6dccce369d694f50154b`，base `c23e46555b73a29f16319c657622acb1acc51e7a`；candidate worktree `/private/tmp/ai-core-pptskill-observer-20260927`。共同Git已持有commits，不能重建成別的SHA或覆寫canonical。
- scanner SHA `6a6dc198e34cd43a95003f66280b37800fca737aa241d76019a9f3a573ddcee0`；完整tests/docs/source/protected/ZIP見 `evidence/edx-core-3-undo-redo/observer-adoption-preflight-20260927.json`。
- PPTSKILL固定產品：code `f3d8a11865a5af25f34a08a5b65dccb3fed6914f`、packaged `9ce7396a481621960f6f2c89ff7fcf352c0e515a`；最新已推control checkpoint `00aae7fb367a8d8ad88e165447de6e35f81a9e7b`。
- 先讀 `observer-review-r1-20260927/receipt.md`、`observer-repair-host-prerequisites-20260927.md` 與AI Core原CARD-PPTSKILL-PGQ-HOST-ROUTING-AND-OBSERVER-HANDOFF-20260924；本卡不增加修復額度。

## 最小工作與blocking edges

1. AI Core側先確認合法host執行上下文及候選試驗方式。允許評估隔離candidate，不要求先把候選裝入canonical；但必須由AI Core既有受管lifecycle驗證入口與policy身份，不由PPTSKILL覆寫/monkey-patch scanner。沒有此入口即回blocked，不創第二runner／supervisor、不清CODEX_SANDBOX、不以一般Chrome CDP當受管session。
2. 有入口才做**一輪有界**readiness→attach→簡單本機test page→資源觀測→Browser.close→supervisor→owned root/marker cleanup。沿既有控制器與25秒readiness deadline、原Rule24／Foundation／resource ceilings／scan timeout；不得先跑PGQ。只新增本輪evidence，host04歷史不改。
3. 最小instrumentation要保留每筆I/O事件及其scan outcome（完整回傳、未恢復failure、未完成unknown）、duration/entries/counts，不能將已恢復的ENOENT刪掉，也不能用原 `errors==[]` 機械拒絕合法恢復。不得修改scanner決策、禁line/opcode tracing；更改既有instrumentation時必須先驗證其不改掃描語意。
4. 實測fresh owned profile的相關parent結構是否符合flat regular-only；記錄candidate實際掃描耗時與是否在原budget內。不得讀使用者常用profile來代替受管profile；純unlink、fresh stat/open失敗、nonflat parent仍應fail-closed。若未遇到相關race，最多判HOST_SMOKE_PASS／RECOVERY_NOT_OBSERVED，不能宣稱Host04根因修復。
5. 只有candidate適用性、host成本及完整cleanup證據足夠，AI Core側才能另行提出canonical採用結果交回主線。Core3正式雙viewport與四支affected PGQ依既有card接續，不在這一輪smoke中順便執行。

## 停止與交回

缺host／入口不適用／候選不符合parent結構／unknown observation／budget或cleanup失敗皆停。第一次smoke失敗保留first cause與cleanup；不自動retry、不再開產品repair、不提高任何ceiling。不要求為這張control卡新派Reviewer；code verdict已有獨立證據，主線驗收host receipt。

交回固定SHA、確切執行入口與命令、host是否sandbox、Rule24/admission、readiness、scan outcome與成本、parent適用性、Browser.close/supervisor/root/marker、所有errors與未驗證項。採用是否成立須獨立於產品assertion判定。

## 本 task 已查明的執行限制

`CODEX_SANDBOX=seatbelt`，無 `PPTSKILL_DEVTOOLS_ACTIVE_PORT`。原生Chrome port檔存在，但唯讀 `/json/version` 在核准的非sandbox read仍 `ECONNREFUSED`，不是可用attachment；未啟Chrome。Native2/3是outer Codex harness connector，名稱本身不證明有合法host能力；沒有以換connector繞限制。

本卡已具體化接續範圍，仍未派往另一task；建立／移交新task須有使用者明示。本輪只做Mainline control與唯讀preflight，沒有delivery code變更。

## 接續結果：既有task能力確認未取得證據

Mainline唯讀檢查兩個既有task，未發現更新的host acceptance；目前task仍seatbelt/無managed port。已向既有AI Core任務「接手浏览器预算诊断卡片」送出一次限唯讀的能力確認，禁止launch/寫入/變更模型/清環境；平台回報turn completed，但wait與read-back均無assistant/tool內容。故只能標NO_HOST_CAPABILITY_EVIDENCE_RETURNED，不能推論它有host能力或已執行檢查。詳 `observer-host-capability-inquiry-20260927.json`。

依既有停止規則，停止在同一runtime反覆探測或另開等價卡。下一個必要輸入為合法host executor的可核验入口／能力回報，或按本卡完成的host receipt；在此之前不再啟Chrome、不重跑PGQ、不改scanner、不merge。這不是新增review或產品修復要求。

## 正式提權實測後接續（取代前次runtime不可用判斷）

使用者詢問需何種授權時，Mainline已實測正式 `exec_command(require_escalated, login=false)` 回 `CODEX_SANDBOX=null`，沒有清除環境旗標。前次僅測預設sandbox便判host不可用不充分，現已更正；使用者再次「繼續吧」，依本卡允許的一輪bounded smoke接續。這是新入口實測證據，不是重置scanner修復或失敗次數。

本輪代號host-smoke-01；Worker只準備 evidence/edx-core-3-undo-redo/host-smoke-01-controller.py（可附同輪observer及unit test），不launch／不commit。沿host-controller-04.py收尾及resource-observer.py call/return/exception旁聽接點；舊檔保持原bytes。固定AI Core 8e60945 worktree，Python沿canonical .venv；資源policy保持64MiB/10000、TTL最多120秒、readiness25秒，一次新owned profile。只CDP新建本輪target＋data:text/html簡單頁面與斷言、等兩個完整runtime scan、關target/Browser.close/lifecycle cleanup；不跑PGQ/產品browser，不部署。

Observer須記scan budgeted/cleanup區別、開始/完成耗時、entries/counts、原errors；tuple完整回傳才算complete，None/unwind算failed或unknown，合法恢復仍保留ENOENT。只call/exception/return，禁line/opcode；不monkeypatch scanner，不改policy。host profile Default的flat regular-only適用性以本輪owned目錄no-follow bounded唯讀觀測，不碰一般profile。傳回HOST_SMOKE_PASS最多代表runtime smoke；RECOVERY_NOT_OBSERVED或nonflat須明示，不解除Core3 gate。

離線selftest需驗正常return／已恢復ENOENT／unhandled error／budget拒絕之classification、原trace恢复、observer不改scanner返回結果。Mainline核對後只有一輪正式launch；任何實際smoke失敗即停止本輪。Worker依standard bounded、既有模型繼承，不新增Reviewer；Mainline同步source/policy/入口核對及最終驗收。

## 一輪實測完成：採用NO-GO

詳 `evidence/edx-core-3-undo-redo/host-smoke-01/mainline-receipt.md`。正式提權確實可跑受管Chrome，前次host不可用判斷已更正。Readiness／簡單DOM／target close／Browser.close通過；第8次runtime scan於candidate1145 fresh stat遇ENOENT，supervisor exit2。Default實測23個子目錄；candidate flat-only與post-pin recovery均不足涵蓋此場景。

Mainline判定：有界CODE GO保留、目前host採用NO-GO；root/marker與兩個已知PID清理已驗證，sources75/protected4/ZIP均未變。沒有第二次launch、沒有PGQ。按本卡停止條件回到REPLAN_REQUIRED，不能沿用原局部修法反覆retry。
