# Contributing

PPTSKILL 採輕量 contribution 流程：保持變更範圍清楚、附可重現測試，並維持既有 deterministic QA 邊界。

## Local setup

- Node.js `>=18`。
- 使用 `pnpm`；目前 repository 沒有釘死特定 pnpm patch version，因此不要自行在 `package.json` 宣告未經驗證的 `packageManager` 版本。
- 安裝依賴：`pnpm install --frozen-lockfile`。

常用驗證：

```bash
pnpm qa:public
pnpm test
git diff --check
```

需要幾何／browser 驗收的產品變更，再執行對應 browser gate；純文件或 license hygiene 不需要為了形式新增 browser 測試。

## Public-safe contribution rules

- 不提交 secrets、PII、真實 machine home path、raw session log 或私人 temp path。
- 不提交沒有 redistribution clearance 的品牌素材、客戶素材或第三方 raw reference images。
- evidence 必須可以公開；必要時改用 synthetic fixture 或 sanitized deterministic receipt。
- 新增或升級 dependency 時，必須先記錄來源、精確版本、license、provenance、是否會進 distributed artifact，以及 attribution／redistribution 義務。
- 不得繞過 `pnpm qa:public`、vendor checksum 或其他 deterministic QA gate 來讓測試變綠。

`package.json` 的 `"private": true` 只用來防止誤執行 npm registry publish；它不表示 GitHub repository 是 proprietary 或 private software。
