# P1-R8-A Local Profile Isolation Receipt

- 日期：2026-09-10
- 狀態：`COMPLETE / PROFILE ISOLATION GATE PASS`
- 範圍：本機可選偏好、明確 opt-in 寫入、單次提醒與 export isolation。
- 不包含：ZIP、install／update／uninstall、CLI adapter 安裝或視覺／renderer 修改。

## Contract

- 預設位置：user home 下的 `.pptskill/profile.json`，位於版本化安裝目錄之外。
- 缺少 profile：正常，回傳 `absent`，不阻擋 deck workflow。
- 寫入條件：只有 `remember=true`／CLI `--remember` 才建立檔案。
- 權限：profile file `0600`；以同目錄暫存檔後 rename 完成原子替換。
- allowlist：language、stylePreferences、density、sampleFirst、motionPreference、fontPersonality、colorMood。
- 所有偏好採封閉值；client、project、deck content、source document、chat transcript、path、prompt 等欄位 fail-loud。
- reminder gate 每個 deck session 最多回傳一次；profile 已存在時不提醒。

## Evidence

- `pnpm test`：77 / 77 pass。
- 缺檔讀取：`absent`；未 opt-in：`skipped` 且檔案不存在。
- 明確 opt-in：成功寫入、reload 一致、mode=`0600`。
- 模擬安裝版本更替後，外部 profile SHA-256 保持一致。
- CLI smoke：缺少設定回報「正常狀態」；沒有 `--remember` 不寫檔；明確保存成功且沒有 stack trace。
- Integration：profile 存在 → render/export → `extractDeckSpec`；embedded DeckSpec 不含 profile、profile path、profile schema fields 或 isolation sentinel。
- `git diff --check`：pass。

## Decision

`P1-R8-A: PASS`。可進入 `P1-R8-B — ZIP Distribution Lifecycle`；R8-B 不得搬移或覆寫 user profile。
