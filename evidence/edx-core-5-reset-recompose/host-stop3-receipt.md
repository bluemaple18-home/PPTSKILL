# Core5 正式 host stop-3 收據

Status: HOST_NO_GO_STOP3 / CORE_PROGRESS_4_OF_6。Owner 已授權正式 host，未推送、deploy 或開 Core6。

正式路由：`/Users/matt/ai-core/.venv/bin/python evidence/edx-core-5-reset-recompose/host-controller-core5.py --run-core5-acceptance`，AI Core `tmp_session browser` 啟動受管 Chrome；client 與 browser 共用 outer PGID，四支 PGQ 原定在 browser PASS 後串行執行。controller/client 及 browser harness 原始碼在同目錄與 `tools/`。

| 輪次 | 雙 viewport 第一阻塞 | Browser / PGQ | Lifecycle |
| --- | --- | --- | --- |
| `host-acceptance-01` | harness 用 save 可見性判斷 edit mode，判斷不成立 | 兩個 viewport FAIL；PGQ 未跑 | root、marker 清除；無殘留匹配 |
| `host-acceptance-02` | edit mode 下 Recompose 按鈕 CSS 隱藏 | 兩個 viewport FAIL；PGQ 未跑 | root、marker 清除；無殘留匹配 |
| `host-acceptance-03` | Recompose 真滑鼠確認、內容／其他頁／未列 geometry 保留、live/fresh type visual 比對通過；Undo 按鈕 CSS 隱藏 | 兩個 viewport 各 3 項後 FAIL；PGQ 未跑 | root、marker 清除；無殘留匹配 |

每輪 `controller-receipt.json`、`client-receipt.json`、`browser/acceptance.json`、lifecycle 原始收據及日誌在該輪目錄。`03` 的 1280×720 與 1600×900 `initial`／`recomposed` PNG 均在 `browser/`，已人工核對：主標題、quote、type visual 可見，未觀察到新文字碰撞；此僅是失敗輪中已走到的部分畫面證據，不能當 Core5 視覺 PASS。三輪正式 supervisor exit 2；browser close exit 0；PGID/root 匹配空。

停損後本地修正：edit mode CSS 顯示 Save／Undo／Redo／Reset／Recompose，harness 在操作前一次檢查五個控制；`pnpm run build:deck`、`pnpm run build:dist` 完成，focused+受影響測試 46/46 PASS，`git diff --check` PASS。最新 ZIP SHA-256 `33aee060d6197492b384b370b2075da65e05d47840559706432aa747be4a6265`，2,338,861 bytes，ZIP 內 `runtime/deck-editor.js` 與工作樹相同。**最新 CSS 尚未經正式 host 驗證**，故不能宣稱 browser／PGQ GO。

AGENTS.md 明定「同一 blocker 第 3 次失敗即停」。主線在第三次同類 UI 可見性阻塞後停止重試；下一次 host 驗收需要 Owner 明確重新裁決停損。此輪不開 Core5 closure，也不更新 5/6。
