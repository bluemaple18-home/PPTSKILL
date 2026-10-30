# P0-R1 Portable Contract Receipt

- 日期：2026-09-06
- 狀態：PASS
- 下一個 frontier：P0-R2、P0-R3、P0-R4

## 產出

- `schemas/deck-spec.schema.json`：versioned DeckSpec 與最終 slide content model。
- `schemas/style-spec.schema.json`：deck-wide typography、palette、spacing、geometry、motion、asset treatment。
- `schemas/composition-spec.schema.json`：per-slide primitive、variant 與 content slot references，不持有內容。
- `contracts/export-sanitizer-allowlist.md`：portable export allowlist 與明確排除資料。
- `runtime/deck-spec.js`：legacy fixture migration、allowlist sanitizer、composition-only patch、content hash、HTML embed／extract。
- `tests/p0-r1-deck-spec.test.mjs`：migration、sanitizer、content/style/composition separation、single-HTML handoff 與 fail-loud boundaries。

## Acceptance evidence

- Legacy `title/body` fixture 可轉為 `schemaVersion: 1.0` DeckSpec。
- Slide 只包含 `id`、`content`、`composition`；StyleSpec 位於 deck level。
- Composition patch 後 content SHA-256 不變。
- Profile、本機路徑、prompt、notes、private citation 與非 primitive table cell 不進入 export。
- 另一個 runtime 可只從 HTML 的 `script#deck-spec` 取回 sanitized DeckSpec。
- 16+ slides、重複 ID、缺少 3～5 key points 皆 fail-loud。
- Theme reference code 未被升格為內容 authority，也未在本卡重寫。

## Verification

`pnpm test`：16 tests pass；`git diff --check`：pass。
