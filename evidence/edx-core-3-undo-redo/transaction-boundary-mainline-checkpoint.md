# Core3 Undo／Redo Mainline checkpoint

Status：`CODE_GO / HOST_OBSERVER_BLOCKED / WHOLE_CARD_NOT_CLOSED`。
Reviewed packaged SHA：`9ce7396a481621960f6f2c89ff7fcf352c0e515a`。
Reviewed code SHA：`f3d8a11865a5af25f34a08a5b65dccb3fed6914f`。

## 已關閉的產品邊界

固定candidate兩名原Reviewer均CODE GO；本輪範圍P0–P3全0。原public layout mode／group terminal notify兩項P1已關閉；後續cancel投影P1亦已關閉。同步owner覆蓋提交與可驗證回退；active cancel沿preview前checkpoint恢復canonical DOM，不復活gesture；fallback失敗則明確阻止後續寫入。沒有新增第二套history、authority或scene graph。

詳 `review-round-08.md`，含兩名獨立fresh裁決、raw evidence、可重播scripts與證據限制。Crop F2/P2 residual仍OPEN，未順手改修。

## 驗證與來源

- Writer fresh：新反例5/5、affected160/160、原81檔nonbrowser **1061/1061**、0 skipped。主線核對rawTAP/source；沒有把Writer run冒稱Mainline full rerun。
- Reviewer A fresh：targeted5/5、independent5/5、bounded11/11、原closure通過。
- Reviewer B fresh：targeted5/5、focused160/160、custom10/10＋5/5＋3/3。
- Mainline fresh：ZIP build/lifecycle PASS、75/75 runtime/schemas/contracts byte-match、protected4/4與historical hashes MATCH；兩份相對import probe副本5/5與3/3。
- ZIP：**2,329,758 bytes**；SHA256 `862bb19f82b10fab9a244a1c334fed1f39b6edc1ad5c5ff95aebe3cc04daf290`。
- 收據：`transaction-boundary-r07-writer.md`、`transaction-boundary-r07-full-01.json`／`.tap.gz`、`transaction-boundary-r07-mainline-hashes.json`、`transaction-boundary-r07-distribution-probe.json`、`review-round-08-evidence.json`。

## 仍待閉合的環境前置

AI Core HEAD `c23e46555b73a29f16319c657622acb1acc51e7a`，scanner SHA `427162d34af5be6f3269c418f141716130909ce3fea82b5e3b4431732ebfdd6c`，與Host04 ENOENT相同；尚無適用修復receipt。本task CODEX_SANDBOX=seatbelt，未啟Chrome或繞gate。

Observer接續診斷已存 `observer-zoom-out-20260924.md`：沿AI Core既有scanner測試區分列舉後消失、同名替換、目錄identity變動，保持no-follow／bounded／unknown I/O fail-closed，取得適用真host處置證據。PPTSKILL reporting修正已完成，不是要再搬一次host。AI Core處置完成後才用此固定candidate跑1280×720／1600×900正式Undo/Redo browser與四支affected PGQ串行，保存readiness／Browser.close／supervisor／root／marker cleanup。

新candidate的browser/PGQ目前pending；不能沿用舊SHA GREEN，不能因CODE GO做whole-card closure。核心仍2/6已收、Core3待host gate。未merge/push/deploy，未開Core4，四個protected未動。

## 歷史保留

`a0fd3e7` 的Mainline full1019/1042（23FAIL）、`b35336d` round06兩項P1、`2f134de` round07取消P1，以及各輪RED／repair／不同verdict皆保留原檔。主線歷史文件的當時pending／NO-GO由本最新checkpoint標明接續，沒有覆寫為單輪全綠。

## 2026-09-26 接續診斷

產品／ZIP／protected與上列reviewed candidate仍一致。observer新增可重播證據：原scanner同ENOENT stop（require-complete exit1）；8個contract診斷包含rename後正式檔仍存在，證明直接略過ENOENT可能漏算容量。詳細 `observer-race-receipt-20260926.md`。fixture均清除，未啟browser；AI Core source未改，HOST_OBSERVER_BLOCKED未解除。下一個必要工作已收斂為AI Core處置策略及適用host驗證，不重開產品修復。

## 2026-09-27 獨立診斷review接收

Owner交回447ce01獨立review：8/8診斷、RED exit1，未發現阻塞問題。診斷卡改為DIAGNOSTIC_REVIEW_PASS；詳細來源界線見 `observer-independent-review-20260927.md`。主線fresh核對AI Core HEAD/scanner仍未變；HOST_OBSERVER_BLOCKED與核心2/6維持，尚無恢復策略或新host驗收。

## 2026-09-27 push與observer候選接續

PPT分支8a770fd已push並核對遠端SHA。AI Core隔離候選唯一R1 `8e60945` 已targeted CODE GO（Reviewer fresh50＋18＋5）；canonical未啟用、host未跑。詳細 `observer-mainline-result-20260927.md`。Core3 whole-card仍HOST_BLOCKED、核心2/6不變；本段取代早期「未push」的當時狀態，不覆寫歷史驗證。

## 2026-09-27 外部re-review接收與host採用裁決

Owner再交回8e60945有界CODE GO（Reviewer fresh50＋23），未發現新阻塞；主線push00aae7f已fresh ls-remote核對。採用前置查明：canonical未變、candidate clean；PPT75來源/4protected/ZIP吻合。原生Chrome port檔為不可連的殘留（approved read ECONNREFUSED），本task仍seatbelt且無managed attachment。

採用裁決為候選可交有界host評估、canonical採用HOLD。實體接續卡 `tasks/edx-core-3-observer-host-evaluation.md`，只先readiness/test-page/scanner/cleanup，禁止直接再跑PGQ。HOST_BLOCKED維持，未新增browser launch或repair。

## 2026-09-27 host能力確認停止點

已向既有AI Core任務做一次唯讀能力確認；平台completed但無內容，不能視為host可用。詳 `observer-host-capability-inquiry-20260927.json`。無新增browser/test/repair/activation。主線STOP_LOCAL_CONTINUATION，待合法host能力證據或host receipt後續接原卡，不另開同義卡。

## 2026-09-27 正式host smoke：環境已通、候選不適用

正式提權在不改環境旗標下取得CODEX_SANDBOX=null，實際完成受管Chrome launch/readiness/簡單頁/Browser.close，取代先前「無合法host入口」的不足判斷。一次host-smoke-01結果NOT_PASS：candidate1145 fresh stat遇ENOENT、recovered=false；Default包含23子目錄。7完整＋1失敗runtime scan，supervisor exit2，但root/marker與兩個已知PID已清。

詳 host-smoke-01/mainline-receipt.md。8e60945有界CODE GO仍有效，當前host採用NO-GO；Core3保持HOST_OBSERVER_BLOCKED、核心2/6。下一步需依新實測缺口REPLAN，不再重試或自動加repair；本輪未merge/push/deploy。

## 2026-09-28 R2 完成單次 host smoke

依 26576e9 與 Owner「做吧」完成 canonical-base R2 候選 4edd0747，兩名 review 與 instrumentation 窄複核 GO。唯一一次 managed host smoke PASS：7 runtime scans、Browser.close/supervisor exit0、cleanup/PID/root/marker 均核對；本輪未自然觸發 recovery，不能聲稱 Host04 根因修復。詳細 `host-smoke-r2/mainline-receipt.md`。
R2_HOST_SMOKE_PASS / RECOVERY_NOT_OBSERVED / CANONICAL_ADOPTION_PENDING；Core3 未整卡 closure，canonical 尚未採用，未跑雙 viewport／PGQ、未開 Core4。產品／ZIP／protected 不變，未 merge/push/deploy。停止自動追加 smoke；下一階段先做 AI Core canonical 採用裁決。

## 2026-09-28 開立 R2 canonical 採用裁決卡

接續卡：`tasks/edx-core-3-observer-r2-adoption.md`，READY_FOR_DECISION／NOT_STARTED／NOT_ACTIVATED。只評估固定候選 4edd0747 的採用與具體整合／回退／驗證方案；本次開卡未執行 canonical mutation、host 或 PGQ。採用完成及身分驗證仍是 Core3 產品驗收的前置條件。

## 2026-09-28 canonical 已整合並驗證

依採用 GO 與 Owner「那做吧」，AI Core canonical 已從 c23e465 整合為 28cad2d3（三檔 exact reviewed bytes），fresh 33/33 scanner PASS，原 untracked/launcher/policy/sensor 保留。見 `observer-r2-integration-verification.json`。Canonical integration 阻擋已解除；固定產品 browser／PGQ 由本 Mainline 接續，未重跑 observer smoke，未改產品或提高 ceilings。
