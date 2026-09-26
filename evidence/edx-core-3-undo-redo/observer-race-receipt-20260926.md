# Observer ENOENT有界重播：診斷完成，host仍BLOCKED

Status：`DIAGNOSTIC_REPRODUCED / CANONICAL_UNCHANGED / HOST_OBSERVER_BLOCKED`。Root question：既有observer ENOENT能否被當成無害消失安全放行？本輪判斷：**不能直接忽略，已存在確定的漏算反例**。尚未選定或實作新的scanner放行政策。

基線PPTSKILL HEAD `c8d02ef`，reviewed candidate `9ce7396`；AI Core HEAD `c23e46555b73a29f16319c657622acb1acc51e7a`、scanner SHA256 `427162d34af5be6f3269c418f141716130909ce3fea82b5e3b4431732ebfdd6c`。兩repo狀態未出現新的產品修改；AI Core仍只有既有兩個untracked卡目錄。

## 執行與結果

CodeGraph fresh成功定位sample_resource_budget→scan_resource_artifacts→visit，以及cleanup/count_artifacts共用接點。以AI Core現有.venv python -B直接import原scanner；不複製／修補函式。fixture wrapper只在實際entry.stat或directory open前精準施加unlink/rename/rmdir/symlink動作；保留原nofollow stat結果。讀錯案例單獨注入EIO。OWNED_ROOTS的browser_layout僅測試程序內fixture設定，用原5秒掃描窗，沒有建立正式managed root或呼叫launcher。

先執行一條可重播的完整觀測失敗命令：

`<ai-core>/.venv/bin/python -B evidence/edx-core-3-undo-redo/observer-race-probe.py --ai-core <ai-core> --case disappeared-file --require-complete`

exit **1**，entry.stat真實返回FileNotFoundError/errno2→原scanner I/O failure。父descriptor identity不變，fixture已清除。這是同失敗路徑的RED訊號，**不是判定現行fail-closed有bug，亦不授權把它放行**。見 `observer-race-red-20260926.json`／`.stderr`。

再執行同一命令移除 `--case disappeared-file --require-complete`：exit **0**；8/8符合現行契約的診斷斷言，包含1個完整觀測成功與7個預期拒絕，**不是8個產品／host PASS**。

| Fixture | 原scanner結果 | 意義 |
| --- | --- | --- |
| stable regular | COMPLETE，8 bytes/1 file | control可完成 |
| stat前unlink regular | errno2 → I/O failure | 良性消失也能造成相同stop |
| stat前rename到正式檔 | errno2 → I/O failure；正式檔仍在 | 相同錯誤不代表資料已不存在 |
| 同名symlink替換 | symlink/special reject | no-follow與型別拒絕維持 |
| directory stat前消失 | errno2 → I/O failure | 同errno也可能是目錄 |
| directory stat後、open前消失 | errno2 → I/O failure | 必須分辨phase，不能外層一律忽略 |
| unknown EIO | errno5 → I/O failure | 未知I/O持續fail-closed |
| 8 bytes超出4 bytes fixture limit | budget exceeded | 原容量拒絕未放寬 |

資料詳 `observer-race-matrix-20260926.json`，每案保存phase、nofollow、父descriptor identity、實際errno、結果與fixtureRemoved。全部temp根已清除。未啟browser、PGQ、production或外部write。

## 裁決與下一個必要工作

在rename案例中，已列舉的暫存名失效，但正式檔仍有8 bytes；若只把ENOENT視作0並略過，而本輪列舉沒有新名，容量會漏算。此為受控反例，不宣稱Host04必然是Chrome rename，也沒有執行修改後scanner。Host04來源類型仍未知，三種假說未被真host排除。

AI Core owner須在原handoff範圍裁決最小恢復方式：必須補回rename後正式entry的計數，且不能把目錄open/identity或未知I/O當成無害刪除；掃描deadline/entry累計不可因恢復重設，no-follow、限額及cleanup共用語意保留。若無法證明恢復後觀測完整，維持NO-GO。**不採catch-all ENOENT，不任意重掃整棵樹，不擴容量／時間預算。** 本輪只建立證據，不改共用契約。

修復前先將這些fixture移到AI Core既有test_tmp_artifact_lifecycle.py seam，保留本original診斷；修復需exact SHA、相關tests與正式managed host證據。只有這個前置閉合，PPTSKILL才恢復固定candidate的雙viewport browser＋四支串行PGQ；不再重做已GO的產品修復或重新搬host。

PPTSKILL 75個source、4個protected、ZIP bytes/hash與reviewed candidate一致，diff check通過，見 `observer-race-validation-20260926.json`。沒有Core3整卡closure，沒有merge/push/deploy或Core4。
