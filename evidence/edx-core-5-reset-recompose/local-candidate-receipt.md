# Core5 本機產品候選收據

狀態：CODE_CANDIDATE / HOST_BLOCKED / CORE_PROGRESS_4_OF_6。基準 `098177ac395d1dcf0d02f30c102ceb8c0f11abe5`；本地分支 `codex/edx-core-5-reset-recompose`。未推送、部署或開 Core6。

## 本機結果

- Recompose：同 primitive／slots 的既有 variant；明示覆蓋 geometry／typography，未列出者保留；`data-type-visual` 在切換及標題修改後與 fresh renderer 一致。UI 以選擇及確認列出範圍。geometry-only component 清除若會留下殘影則提交前拒絕。
- Reset：僅具本次開啟編輯基準的 slide；原始頁單筆交易，取消及故障不變；元件增刪、Undo／Redo、draft 與 export/reopen 已在合成 portable DOM 驗證。duplicate 無基準則拒絕。
- Fresh focused：22/22 PASS。受影響 targeted：53/53 PASS。完整 `pnpm test`：1111 tests，1107 PASS、4 FAIL；4 fail 分別是 `pgq-wp4-s3-content-integrity`、`pgq-wp4-s3-sample-approval`、`pgq-wp4-s4-full-deck-qa`、required-title painted visibility，錯誤均落在 Chrome DevTools port 未就緒。其餘回歸在修正 API-only VM 與實際 DOM 標記斷言後通過。
- `node --check runtime/deck-editor.js`、`git diff --check` PASS。`pnpm run build:deck`、`pnpm run build:dist` 完成。ZIP SHA-256 `789815792000a6b80a1b9a77841ec926ed445bb67f65be4b696d0fe44b7141c3`，2,338,817 bytes；ZIP 內 `runtime/deck-editor.js` 與工作樹 SHA-256 相同。
- `runtime/deck-spec.js`、`runtime/full-deck-renderer.js` 及四個 pre-existing protected untracked 的 SHA-256 與 `mainline-preflight.json` 相符。既有 `tasks/edx-core-six-card-closure-plan.md` dirty 修改未觸碰。

原始本機輸出：`core5-focused-final.log`、`core5-targeted.log`、`core5-full-test-after.log.gz`（無內容改寫壓縮）、`core5-build-dist.log`（均在本收據同目錄）。

## Host 停損與接續

正式 AI Core `tmp_session browser` 在 `CODEX_SANDBOX` 存在時按生命周期契約拒絕啟動；本輪環境確有該旗標。Codex IAB 對本機 `file:` 頁面回覆 security policy 拒絕，並禁止改用間接路徑繞行。故沒有真 browser／雙 viewport／四支 PGQ／程序及 root 清理收據，Core5 不得標示 GO。

下一步在允許啟動受管 Chrome 的 host：以本 commit 產品／ZIP 身分鎖定輸入；listener 先於 navigation；1280×720 與 1600×900 真滑鼠確認／取消 Reset、Recompose，人工 override 保留／明示清除、Undo／Redo、draft、匯出離線重開；四支 affected PGQ 串行；核對 console/pageerror/network/HTTP/remote request、target close、root/marker/PGID 收斂、前後身分及截圖。之後 fresh independent review，才裁決 5/6。
