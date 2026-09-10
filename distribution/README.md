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

明確執行 installer 時，會把同一份 `pptskill` Skill 註冊到 `~/.codex/skills/pptskill`、`~/.claude/skills/pptskill` 與 `~/.gemini/skills/pptskill`。每個註冊都有 ownership marker；若目的地已有同名非 PPTSKILL Skill，安裝會拒絕覆寫。update 只更新 owned Skill，uninstall 只移除內容未被使用者修改的 owned Skill。installer 不下載、不登入，也不寫 token。

Codex 使用 `$pptskill`，Claude Code 使用 `/pptskill`；Gemini CLI 啟用 `pptskill` Skill。拿既有 `deck.html` 重做時會自動走 `restyle-existing`：先問一次 pressure test、等待 outline 核准與選款，內容、頁序及 slide ID 預設鎖定。final HTML 只能由 shared core 的 `workflow-cli.mjs` 產生。

AI 從任何專案目錄啟動時，由已註冊 Skill 定位 `~/.pptskill/runtime`；adapter manifest 的相對路徑仍必須從 manifest 所在目錄解析，不得套在目前專案目錄。
