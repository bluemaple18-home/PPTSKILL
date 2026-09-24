# Core3 Repair 2 複審與停損

固定產品／ZIP 候選 `60a05ce33924dfd92c2977d743b24afc408dd207`。Owner 已授權一次 Repair 2 與完整重驗；本輪未 merge／push／deploy。

## 已完成驗證

- 同一 Writer 在既定 3 個檔案內修復 gesture 控制列、成功通知、Moveable `updateRect()` 的已量測提交後錯誤，以及邊界 reorder no-op。4 個具名 probe 各先 RED 後 GREEN；focused／affected scoped 50/50 PASS。
- 主線 non-browser（排除須真實 Chrome 的四支 PGQ）1019/1019 PASS，receipt `nonbrowser-repair2-scoped.tap`。直接 `pnpm test` 在沙盒中 1018/1022，4 個 PGQ 因 Chrome DevTools port 未就緒而失敗，見 `nonbrowser-repair2.tap`；不能計為 full PASS。
- ZIP lifecycle PASS，`distribution-probe-repair2.json`；ZIP 2,325,923 bytes、SHA-256 `0e4fc9b09d86c1851d9f090e56889f2def449cc5ede41c47916be3fa24966ac5`。封包內 75 個 runtime／schema／contract 檔逐位元相符。
- Host04 正式 browser 1280×720 與 1600×900 各 11 checks PASS；兩次 console、pageerror、network、HTTP、remote error 均為 0，targetClosed 均為 true，見 `host-acceptance-04/undo-redo/acceptance.json`。

## 獨立複審：Code NO-GO

兩名唯讀 Reviewer 對固定 SHA 獨立判 NO-GO，主線以 mounted harness 重播以下反例：

1. P1 `runtime/component-interaction.js:79`：`finish()` 在成功提交後的 `finally` 呼叫 `restore()`。投影 after-effect throw 後對呼叫端拋錯，但 canonical x=808、revision=1、history entries=1；錯誤為 `post-commit restore projection fault`。
2. P1 `runtime/component-interaction.js:67-70`：gesture 已清除但尚未提交時，Undo 控制列 `disabled` setter 可同步重入 `undo()`。重播成功，revision 到 2，舊標題被復原；手勢期間不得 replay 的契約未守住。
3. P1 `runtime/deck-editor.js:549`：有效 reorder 的 `syncText()` 在 DOM reorder 的回退區外。`insertBefore` after-effect throw 後順序雖回復，但 pending title 已提交，revision=1、history entries=1。

既有 focused tests 在這些反例下仍通過。主線以 `pnpm exec node evidence/edx-core-3-undo-redo/review-round-03-repro.mjs` 重播，三項輸出分別為 `808/1/1`、`replayed=true/revision=2`、`pending/1/1`。三項均具實際失敗狀態，不能以 1019/1019 或 browser PASS 覆蓋。

## Host04 與回收

Host04 PGQ 串行跑出 7 PASS／3 FAIL；trusted browser producer 後段出現 `Chrome DevTools port 未就緒`。同時受管 profile 資源觀測抓到 Chrome 暫存檔消失的 `FileNotFoundError`，狀態 `IO_ERROR_OBSERVED`，supervisorExit=2，故 controller verdict `NOT_PASS`。受管 owned root 與 isolation marker 均已不存在；主線唯讀程序檢查未發現該 owned root 殘留程序。source 9/9、protected 4/4、ZIP 在 Host04 前後 MATCH，見 `host-acceptance-04/controller-receipt.json`、`pgq.log`、`resource-observation.json`。`pgq.log.gz` 保存原始輸出，文字版 `pgq.log` 只移除行末空白以通過 diff 檢查。未把這次 PGQ／cleanup 記為 PASS。

## 裁決

Core3 維持 NO-GO／2/6。Repair 2 額度已用完，依 `tasks/edx-core-3-undo-redo-repair2-approval.md` 停止產品修補與正式重驗；不啟動 Repair 3、Host05 或 Core4，等待 Owner 另行裁決。候選 `60a05ce` 僅作可重現 checkpoint，不得整合。
