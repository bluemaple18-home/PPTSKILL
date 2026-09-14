# PGQ-WP1 Slice 2 — Portable Claim / Source / Derivation Receipt

**日期：** 2026-09-14
**狀態：** COMPLETE / READY FOR INDEPENDENT REVIEW
**基線：** `81992aca79fa3a954971f1c792b53b3ad6526256`

## 交付

- DeckSpec `1.0` 新增 backward-compatible optional `claims`；未帶 claims 的舊 deck 維持原形狀與行為。
- 每筆 portable claim 以 stable claim ID、kind、摘要、slide linkage、必要數值 context、derivation 與 compact source refs 表達，不建立 Evidence DB 或第二資料正本。
- Node sanitizer、renderer embed、browser editor clean/export 與 recipient `extractDeckSpec()` 共用相同 allowlist 邊界。
- Source refs 只保留 public ID／label／HTTP(S) URL／recipient availability；local path、raw body、prompt、Grill、profile 與 review reasoning 不出檔。
- Derived percentage-point operation 必須明示 `scale: ratio | percent`；ratio `0.20 → 0.35` 與 percent `20 → 35` 均重算為 `15` percentage points，缺值或未知 scale fail loud。
- 投影片 duplicate/delete 會同步更新 claim slide linkage，避免另存後 dangling reference。

## Repair 2

Browser acceptance 起初兩次停在既有 image replacement check。證據顯示 claim round-trip、privacy 與 browser diagnostics 均已 PASS，但 hardcoded WebP fixture 無法完成 `createImageBitmap()`，事件 handler 因而保持原 PNG。對照既有 R10 harness 後，將測試素材改為 browser canvas 產生的有效 WebP；原 file-input UI path 隨即轉綠。產品 image runtime 未修改。

## 驗證

- Contract + DeckSpec + renderer + editor + distribution targeted：51/51 PASS。
- Full `pnpm test`：140/140 PASS。
- Browser editor export/reopen：PASS；claim/derivation/source ref preserved、image replacement PASS、sanitizer leak false、Presenter absent。
- Browser diagnostics：console 0、page errors 0、network failures 0、HTTP errors 0。
- Schema／receipt JSON parse：PASS。
- `git diff --check`：PASS。

Browser machine-readable evidence：`evidence/pgq-wp1-s2/browser-editor-roundtrip.json`。

## 邊界

PGQ-WP2／WP3 與 EDX 正式 schema/runtime integration 未開始。EDX OSS dependency spike 仍可平行進行，但不得在本 slice 偷渡正式 editor integration。
