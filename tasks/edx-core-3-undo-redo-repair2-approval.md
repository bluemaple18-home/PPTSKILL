# Core3 Repair 2 成本核准提案（非新 Slice）

Status: OWNER_COST_APPROVAL_REQUIRED
Candidate: `fffb729607975a38e2adbb38c4c1a43d154d43fc`（NO-GO；不得整合）
Parent: `tasks/edx-core-3-undo-redo.md`

## 已重現的缺口

第二位盲審在 `runtime/component-interaction.js:328` 注入 Undo 按鈕 `disabled` setter 的 after-effect throw：`begin → update(8,0) → finish` 對呼叫端拋錯，但 canonical x 800→808、revision 0→1、history 0→1。原因是 `interaction.finish()` 已提交後，才呼叫 `onGestureChange`／`refreshHistoryControls`。同一審查另量到單頁 deck 的「上移」為 no-op，卻先清 selection／Moveable；revision/history 不變。第一位 Reviewer 在同 SHA 的 targeted findings 均已關，但第二位判 Code NO-GO，故整張卡仍待修。

## 擬授權的最小 Repair 2

同一 Writer，限定 `runtime/component-interaction.js`、`runtime/deck-editor.js` 與 Core3 focused tests。將 gesture 結束的控制列更新移到 canonical commit 之前、納入失敗時 preview 回復；不得吞掉例外後宣稱成功，也不得新增 state authority。上移／下移先判定目標索引有效，再處理 selection。以兩個獨立 RED→GREEN probe 驗證：gesture toolbar post-effect throw 時 canonical／DOM／revision／history 均不提交，且可後續正常操作；邊界 reorder no-op 保留 selection／Moveable。保留 Repair 1 六個故障注入。

驗收成本界線：1 次 bounded Worker repair、focused/affected scoped、主線 full non-browser、ZIP lifecycle/source byte-match、正式受管雙 viewport browser 與 4 支 affected PGQ 串行、兩名原 Reviewer targeted re-review。此卡不授權 Repair 3；若同類再次 NO-GO 或需改別的 runtime，停回 Owner 裁決。不得 merge／push／deploy，不開 Core4。

Host03 對此 NO-GO SHA 的 browser 雙 viewport各 11 records PASS；PGQ 在 code verdict 後由主線主動中止，不能算 16/16。Browser.close 0、supervisor 0、owned root／marker cleanup PASS；source 9/9、protected 4/4、ZIP 前後 MATCH。原始 receipt 留於 `evidence/edx-core-3-undo-redo/host-acceptance-03/`。
