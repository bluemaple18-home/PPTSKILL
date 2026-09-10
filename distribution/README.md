# PPTSKILL ZIP lifecycle

解壓縮後不需要 Git、GitHub token 或 clone repo。需要本機 Node.js；三個 adapter 共用同一份 `core/`。

```bash
node install.mjs
node smoke.mjs
```

上面的 package smoke 只驗證 install marker、shared core 與 adapter entry 完整性，不要求同時安裝三個 AI CLI。驗證目前使用的入口：

```bash
node smoke.mjs --adapter codex
node smoke.mjs --adapter claude-code
node smoke.mjs --adapter gemini
```

只有 release matrix 才使用 `node smoke.mjs --all`，要求三個 CLI 都可辨識且達最低支援版本。

安裝預設位置為 user home 下的 `.pptskill/runtime`。更新新版時，在新版解壓縮目錄執行：

```bash
node update.mjs
```

更新在新版 runtime 啟用後即視為 committed；若只剩舊版備份清理失敗，會回傳 `updated_with_warning` 與保留的 backup path，不會錯誤宣稱已 rollback。

移除 runtime、保留個人偏好：

```bash
node uninstall.mjs
```

只有使用者明確希望一併清除 profile 時才執行：

```bash
node uninstall.mjs --purge-profile
```

建立或查看選配個人偏好不需要 pnpm：

```bash
node profile.mjs show
node profile.mjs save --input profile.json --remember
```

installer 不會自動修改 `.codex`、`.claude` 或 `.gemini`，也不會下載、登入或寫入 token。每個 adapter 的 `entry.md` 是指向唯一 shared core 的 AI-facing 薄入口；不複製 runtime。adapter smoke 只執行選定 CLI 的 `--version` capability probe，缺少、太舊或無法辨識時會提供可讀說明。

AI 從任何專案目錄啟動時，先定位 `<pptskill-runtime>/adapters/<adapter-id>/adapter.json`，並以該 manifest 所在目錄解析 `entryPath`、`coreRelativePath`、`profileRelativePath`；不得把相對路徑套在目前專案目錄。
