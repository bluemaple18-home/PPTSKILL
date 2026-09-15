# PGQ-WP3 Slice 1 — Prior-art Intake

## Decision

| Component | Version | Decision | Runtime | License | Boundary |
|---|---:|---|---|---|---|
| NumberFlow vanilla | 0.6.2 | ADOPT | allowed, bundled inline | MIT | metric odometer only |
| esbuild | 0.28.2 | ADOPT_BUILD_ONLY | forbidden in delivered HTML | MIT | deterministic IIFE generation only |

## Source evidence

- Upstream repository: `https://github.com/barvian/number-flow`
- Official vanilla docs: `https://number-flow.barvian.me/vanilla`
- Package: `number-flow@0.6.2`; package declares MIT and dependency `esm-env`.
- Upstream `dist/index.mjs` SHA-256: `df08f25a6a37f0d30ba045caaab66c87ba95172df2ed5e9261e2b090aa8a9b8d`.
- Upstream license SHA-256: `f8a3eac9fd2ae94f18a2bf0459e57d90da539f015a7ec4ad6186a5ca33a6aa9a`.
- Dry bundle：esbuild browser／IIFE／ES2022／minified，17,146 bytes，SHA-256 `ea78e2aa83778c4642a3b12bb8f1e427db1528f8092bad98ac55837acf3ac73a`。
- Static scan：dry bundle 未命中 URL、`fetch`、XHR、WebSocket、storage、cookie 或 `eval`。

## Capability boundaries

- 官方 API 支援 `.update()`、`animated`、`respectMotionPreference`、timing、events 與 `canAnimate`。
- 官方明示 scientific／engineering notation、非 Latin digits、RTL 尚未支援；本 slice 對這些輸入回 truthful unavailable。
- `prefers-reduced-motion` 維持預設尊重；PPTSKILL 另提供 deterministic static fallback，動畫永遠不是讀取 final value 的必要條件。
- 不採官方 CDN 範例；最終交付只能使用本機 pinned bundle。

## Supply-chain boundary

- 沒有外部 installer、hook、MCP、token、runtime network 或 global install。
- NumberFlow package 不執行 lifecycle scripts；esbuild build script 只為取得本機平台 binary，並由 `pnpm.onlyBuiltDependencies` 限定。
- Lockfile、版本、license、bundle hash 與 generated artifact 一起驗證。
