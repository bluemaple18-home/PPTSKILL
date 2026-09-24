# Core3 Undo／Redo 獨立審查

Status: CODE_NO_GO / REPAIR_2_OWNER_COST_APPROVAL_REQUIRED
Base: `6add4b545a97c8f62457a729da036706034e5232`
Candidate: `fffb729607975a38e2adbb38c4c1a43d154d43fc`（Repair 1；NO-GO）
Parent: `tasks/edx-core-3-undo-redo.md`

Reviewer 唯讀固定 SHA，與產品 Writer 分離；不得修改 candidate／ZIP／protected、啟 browser、merge／push。先看實際 diff、task 契約與 Mainline committed evidence，再做 fresh focused＋必要 bounded scoped。輸出 P0–P3、可重播 finding、CODE verdict，將 browser／PGQ 證據核對與 fresh 執行明確分開。若主線 host gate 尚未完成，whole-card 不得 GO。

重點：Node／portable history 同步；`undoable=true` 的 changed commit 恰一筆，false／direct writer barrier；no-op/fail/async/IME/gesture/stale 不推進 cursor；undo/redo 失敗回退 canonical、revision、DOM、selection、controls；redo 分岔；20筆／64MiB 上限與 large-image pointer update 零 payload read／零 whole-spec serialization；快捷鍵不搶 input/contenteditable/native IME；export/offline reopen 不帶 history/editor chrome。Core2 product／ZIP 無非本卡必要 drift，既有 Crop F2 P2 不冒稱關閉。

正式 browser 由 Mainline 受管 host 執行雙 viewport `--undo-redo-regression`、四支 affected PGQ 串行、source／protected／ZIP 前後凍結與 cleanup。Reviewer 不拿 synthetic event 當原生 OS IME，不把 check records 說成獨立 test cases。若有 P0/P1，按同一 review line 回 bounded Repair 1；只有 Mainline 在驗收與獨立 GO 後裁決 closure。

## 首輪獨立盲審（固定 `6f00a77`）

兩名 Reviewer 各自唯讀重現，Code verdict 均 NO-GO。共同 P1：operation toolbar after-effect throw 留下 history entry；replay toolbar throw 亦可能留下前進的 cursor。另一 P1：direct component patch 的 selection cleanup after-effect throw 使 DOM 與回退的 canonical 不一致。P2：stale component DOM patch 回報成功；gesture 期間 undo 按鈕仍顯示可用；slide reorder/replay 失敗後 selection／Moveable 未恢復。修復需覆蓋同一 atomic checkpoint 的 history、canonical、DOM、revision、selection／controls，並補具名故障注入。首輪 browser 已達雙 viewport PASS，但 PGQ／host cleanup 與 repair 尚待完成；不得將此候選標 GO。

Repair 1 `fffb729`：主線 focused 20/20、full non-browser 1015/1015、ZIP lifecycle 與 75 source byte-match PASS；正式 browser 雙 viewport 各 11 records PASS。Reviewer A targeted GO，Reviewer B 對原 findings 亦確認關閉，但另以故障注入重現 gesture-end toolbar callback 在 canonical commit 後 throw 的新 P1，以及邊界 reorder no-op 清 selection P2，故整體仍 NO-GO。PGQ 於新 code verdict 後主動中止，cleanup PASS；不得記成 PGQ PASS。下一輪範圍與成本界線見 `tasks/edx-core-3-undo-redo-repair2-approval.md`，依 Owner 核准前不得改產品。
