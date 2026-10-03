# 六張核心功能：整合後總驗收

Status: TOTAL_ACCEPTANCE_GO / MAINLINE_INTEGRATED / CORE_PROGRESS_6_OF_6
Base: `df4068868c0475b3ed1a2959a29f583ebed99ef9`；最終整合身分以本卡所在 Git commit 為準。
Scope: Core1 Crop＋Evidence、Core2 Group／Lock、Core3 Undo／Redo、Core4 Local draft、Core5 Reset／Recompose、Core6 Migration／recipient／ZIP。這是六張的總驗收，不是第七張產品卡。
Evidence: `evidence/edx-core-six-card-total-acceptance/mainline-total-acceptance-20261004.md`

## 裁決

整合後首次 Core1 browser 重播揭露 1280×720 右下 SE resize 控制點被固定編輯面板遮擋，canonical 維持 640×480。第二次診斷記錄確認 pointerdown 命中 `.pptskill-editor` 而非 `.moveable-se`。在既有 CSS 只把 layout 模式 Moveable 層級由 9999 提高到 10001，並於既有 Core1 browser 驗收入口新增控制點 hit-test。沒有修改 geometry、交易、儲存或 AI Core。失敗收據均保留；修正後 Core1 雙 viewport 45/45 各 PASS。

同一修正後版本上，Core2 雙 viewport 27/27、Core3 12/12、Core4 13/13、Core5 8/8 全 PASS；74 檔非 PGQ 1034/1034；完整 10 頁雙 viewport 六 gate 全 PASS，離線匯出重開 PASS，四支 PGQ 16/16，browser 錯誤與遠端請求為零。ZIP lifecycle／package smoke PASS，包內 editor 與來源逐 byte 相同。受管 Browser.close、owned root、marker 清理均 PASS。

原 98 項身分只有 editor source、生成 HTML、ZIP、ZIP checksum 四項按修復預期變更；其他 94 項（含 protected 四檔、AI Core scanner／policy／capacity）保持。Crop F2/P2 與 receipt I/O P2 均仍 OPEN residual；Gemini CLI 缺失使本機 host capability PARTIAL。沒有 production deploy；歷史正式故障注入不冒稱本次重播。

## 邊界

原工作樹 `tasks/edx-core-six-card-closure-plan.md` 修改及四個 protected untracked 保留、不納入整合。任何後續產品／ZIP 變更須重新判定受影響驗收，不沿用此收據的產品身分。完整失敗與最終證據、SHA、程序清理見上述總收據及 artifact manifest。
