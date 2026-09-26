# AI Core observer ENOENT：有界修復候選

Status: `CODE_GO / NOT_ACTIVATED / HOST_BLOCKED`

## 授權與隔離

Owner於2026-09-27要求「推上去後 繼續吧」。PPTSKILL分支8a770fd已push且遠端SHA吻合；唯一下一scope為已review的observer阻塞。此次承接AI Core原handoff的共用修復責任，建立AI Core隔離分支候選，不fork/scanner monkey-patch去通過PPTSKILL驗收，不變更AI Core main或啟用政策。PPTSKILL Mainline責任維持；不授權AI Core merge/push/activation、不啟Chrome、PGQ或Core4。

基線AI Core c23e46555b73a29f16319c657622acb1acc51e7a；scanner SHA427162d34af5be6f3269c418f141716130909ce3fea82b5e3b4431732ebfdd6c。原root只有兩個既有untracked卡目錄。隔離理由：共享scanner同時服務各專案／cleanup，候選不得先作用於canonical host runtime。使用單獨git worktree；只由一名Writer寫其delivery。保留原root分支與dirty；回退為停用/丟棄本候選，禁止reset/clean原root。

## 實測缺口與最小候選契約

447ce01診斷已獨立review通過：列舉後檔案unlink／rename均會由entry.stat ENOENT停損；rename後正式檔仍有資料，直接略過会漏算。Host04原entry類型仍未知，不能宣稱已查明該輪根因。

只評估以下候選：browser執行期resource sampling遇到可證實為regular entry的列舉→stat消失時，最多一次有界的同一parent directory重新列舉／計數，使rename後正式檔納入。不是略過entry；不任意重試整棵樹；cleanup(count without limits)與非browser原fail-closed不放寬。若無法可靠辨識regular entry、root／parent descriptor身份，或需擴大恢復範圍，即拒絕恢復。

保持整次scan的原deadline、entries累計、bytes/files ceilings，不因重讀重設預算；重讀時只回退當前directory該次計數，避免重複計數；已觀察超額不得藉重讀抹掉。整次scan至多一次recover，第二次race/未知I/O/目錄open失敗/symlink或special/identity mismatch均NO-GO。沿原descriptor/no-follow接點，禁止cached type資訊成為越權放行的唯一依據。若以上需要額外通用observer框架，停止，保留證據回主線。

## Fact gate／改動範圍

scripts/tmp_artifact_lifecycle.py: scan_resource_artifacts→visit、sample_resource_budget；count_artifacts/cleanup共用scanner，須維持limits=None行為。相關測試tests/test_tmp_artifact_lifecycle.py，文件docs/tmp-session-lifecycle.md。最終product範圍僅這三檔及自身evidence。不得改tmp_session sandbox routing、capacity sensor、Rule24、policy限額、Chromeflags、其他治理文件。

驗收：先correct-behavior RED（safe regular disappearance可恢復；rename後正確8bytes並在4byte上限拒絕），再GREEN；stable同值、不雙算、第二次race、type unknown/symlink替換、目錄消失/替換、root/parent身份、未知EIO、deadline/entry累計不重設、cleanup/非browser仍拒絕。源自既有probe，禁止把fault injection錯誤算產品RED。跑相關既有suite，保存精確命令／codeSHA／rawTAP或unittest log；不啟真browser。一名獨立Reviewer以failure-state反例確認，主線另驗diff與證據，只有CODE GO仍不足host GO。

## 分工／成本／接回

規格已固定但共享安全掃描屬strict，單一native clean Worker；工具目前沒有GPT-5.5 lane，按工具限制繼承主模型，不冒稱降成本模型。主線並行核對host接續與隔離證據，不改Writer檔案。Review與Writer分責；只針對此恢復範圍。初始實作後最多一次有證據repair，超過不自動擴成本。

完成停在AI Core候選與review receipt。正式啟用／host試驗需明確canonical整合與合法host入口，不能消除CODEX_SANDBOX繞過。適用AI Core fixed SHA與host readiness/scan/cleanup閉合後才解除PPTSKILL HOST_BLOCKED。證據接回evidence/edx-core-3-undo-redo/，原診斷與歷史FAIL不修改。

隔離已實測：`/private/tmp/ai-core-pptskill-observer-20260927`，branch `codex/pptskill-observer-enoent`，HEAD與base相同、tracked/untracked均乾淨。原root仍main、兩既有untracked未动。此次不改activation/rollback/teardown路徑；cleanup無limits仍原fail-closed，因此用strict一名獨立review＋主線驗收，不沿用產品rollback兩名配置。

## 2026-09-27 主線收窄與候選結果

以下取代上文初始safe-unlink正向預期：Worker先完成初始3個RED→GREEN；主線提出跨parent與hardlink漏數風險後，最終只允許持有regular descriptor且在同parent重新找到same dev/inode、single link的rename。純unlink／pre-stat或open失敗／未找回仍拒絕。parent限flat regular-only；已計數前綴的名字/identity必須保留，rename覆蓋已計數目的檔亦拒絕。原deadline／累計entries不重設；最多一次重列舉，cleanup/nonbrowser不變。這是Mainline保守縮限，不是Owner另發新條件，也不宣稱已解決Host04。

最終47項scanner相關測試通過（27新、20既有）；原root/產品未改。候選scanner SHA `e7ee4db75443813fff523a6984bc05f7f2d15ca76681a9a09f7ef62c43c5bb07`。Worker receipt在隔離worktree `.work/PPTSKILL-OBSERVER-REPAIR-20260927/receipt.md`；raw log/patch以byte-preserving gzip封裝，未改歷史bytes。候選正常commit hook執行中，之後固定SHA交獨立review。

採用限制：Default parent若有任何子目錄即不適用此復原；最早fresh stat已發生ENOENT亦維持fail-closed。新增stat/open/fstat會增加觀測成本。這三點必須在後續真host評估，不能以47項fixture為由啟用canonical或解除HOST_BLOCKED。

## 獨立 review 與唯一修復回合

候選 c3724ce6 正常 hook 通過並固定。獨立 Reviewer：CODE NO-GO；主線 fresh 重播18 probes，三例反例吻合。首次 fstat／replay fresh stat 已觀察超額卻被縮檔抹掉（P1）；首次 fstat 的多連結資訊遭丟棄（P2）。原 evidence 保存於 evidence/edx-core-3-undo-redo/observer-review-round1-20260927/。

只允許原 Worker 針對這三接點修復、correct-behavior RED→GREEN、原47選集與18 probes，再交原 Reviewer targeted re-review。每個已觀察 regular 樣本需檢查當前累計 ceiling，不重複計數；恢復資格包含首次 fstat single-link，不改 stable hardlink 原行為。不新增功能、效能重構、host retry 或 canonical activation。此次用完預設唯一 repair，若仍 NO-GO 即停回主線。

唯一 R1 已完成：Worker 原47選集＋3回歸＝50/50，原18 probes 全符合；主線 fresh 同18 probes 全符合、descriptor balanced。修改只有原三 delivery 檔，正常 commit hook 執行中。首次 NO-GO 與所有 RED保留。Worker receipt的「依 Owner 補充」實為 Mainline 指派同一P1的 remaining fstat 接點，非 Owner 另發條件。

R1 固定 commit `8e6094582547205db70f6dccce369d694f50154b`，正常 hook exit0、worktree clean。原 Reviewer 正在 targeted re-review，沒有第二次 repair。

## 最終限定裁決

原 Reviewer 對固定 `8e6094582547205db70f6dccce369d694f50154b` targeted CODE GO；P1/P2 CLOSED，限定範圍無新 findings。Reviewer fresh 50/50＋原18/18 probes＋直接5/5 probes，23 probes descriptor 關閉。原 NO-GO／corrections／RED 保留，完整 review 已byte-preserving保存至 `evidence/edx-core-3-undo-redo/observer-review-r1-20260927/`。Mainline核對正常hook exit0、candidate clean、PPT sources75/75、protected4/4、ZIP bytes/hash吻合。

本卡修復與CODE review已完成，不再開第二次repair。下一步是AI Core候選採用裁決與合法host適用性驗證；`observer-repair-host-prerequisites-20260927.md`列明identity、observer outcome與受管cleanup必要delta。候選未merge/push/activation，canonical仍c23e465。HOST_BLOCKED不解除、Core3未closure、Core4未開；不可直接以CODE GO重跑全套PGQ。
