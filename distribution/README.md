# PPTSKILL ZIP lifecycle

解壓縮後不需要 Git、GitHub token 或 clone repo。需要本機 Node.js；三個 adapter 共用同一份 `core/`。

```bash
node install.mjs
node smoke.mjs
```

安裝預設位置為 user home 下的 `.pptskill/runtime`。更新新版時，在新版解壓縮目錄執行：

```bash
node update.mjs
```

移除 runtime、保留個人偏好：

```bash
node uninstall.mjs
```

只有使用者明確希望一併清除 profile 時才執行：

```bash
node uninstall.mjs --purge-profile
```

installer 不會自動修改 `.codex`、`.claude` 或 `.gemini`，也不會下載、登入或寫入 token。`smoke.mjs` 只執行三個 CLI 的 `--version` capability probe，缺少或無法辨識時會提供可讀說明。
