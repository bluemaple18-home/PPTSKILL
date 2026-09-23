# S13 Worker receipt

狀態：BLOCKED_CONTRACT_DECISION；未完成，不宣稱 GREEN。已停止 product 寫入。

分支：codex/edx-wp2-s13-insert-text。
修改：僅新增 tests/edx-wp2-s13-insert-text.test.mjs，3 個具名 case。
未修改 runtime、其他測試、browser runner、protected4 或 control docs。

驗證：
- /opt/homebrew/bin/node --test tests/edx-wp2-s13-insert-text.test.mjs：3 tests，0 pass，3 fail。真 RED 均為 insert-element payload 欄位無效；log=/private/tmp/pptskill-s13-worker-red.log。
- /opt/homebrew/bin/node --test tests/edx-wp2-s1-direct-text-edit.test.mjs：6 tests，6 pass，0 fail；log=/private/tmp/pptskill-s13-worker-s1-baseline.log。這是舊契約 baseline，並非 S13 GREEN。
- git diff --check：通過（新增 untracked 測試未包含在 tracked diff）。

Measured gap：
1. tests/edx-wp2-s1-direct-text-edit.test.mjs:25–35 明確要求 text component 不可 contentEditable，也不得在完成編輯時 sync canonical。
2. tools/edx-wp2-s1-browser-cases.mjs:21–22 同樣斷言 component-portable-quote 不可直接編輯。
3. fixture 的 portable-quote 是 type=text，具既有 geometryOverrides；不能用 type 或 geometry 區分新舊文字。
4. runtime/deck-editor.js:401 resolveDirectTextTarget 僅允許 title/subtitle/keyPoint；403 commitTextElement 會 trim；edit-text descriptor 也不允許 component。
5. S13 契約要求插入後即時 editable、沿既有 sync/mode/keyboard，以及 export/reopen 可再編輯。canonical component 精確 id/type/text，沒有插入 provenance。僅記憶體追蹤新 ID 不能通過 reopen；新增 registry／persisted marker 則是未授權機制。

最小裁決提案：允許既有及新增的 type=text component 共用 direct-text seam，並擴充授權以更新 S1 Node 與 S1 browser 的舊排除 assertions；仍保留 image/citation/table/chart 不可直接文字編輯、標題／副標／要點既有 assertions。不自行弱化測試、不自行新增 persisted provenance。

CodeGraph：本次查 resolveDirectTextTarget commitTextElement edit-text component text operation 回不相關 style-candidates/design-grammar symbols，已依規則 rg 確認實際 source。
環境：workspace AGENTS.md 不存在；已讀實體任務卡及 /Users/matt/ai-core/config/devflow_context_map.tsv 對應 compiled_lite/browser verification。未執行 full/browser/PGQ/ZIP/build/commit/merge/push/deploy，未開新 agent。
未完成：bounded runtime implementation、完整 S13 邊界／rollback cases、browser cases/flag、S8 descriptor 調整、S8/S9 scoped regression；待 Mainline 契約裁決。
