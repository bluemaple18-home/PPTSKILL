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
