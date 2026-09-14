# PGQ-WP1-S2 — Portable Claim / Source / Derivation Round-trip

**Status:** COMPLETE
**traces_to:** `FR-003`, `FR-005`, `SC-004`, `PGQ-D14`

## Objective

將 WP1 剩餘的 portable claim／source／derivation 與 percentage-point scale gaps，在既有 DeckSpec 單一正本中一次垂直關閉。

## Strict fact gate

- 受影響鏈：`schemas/deck-spec.schema.json` → `runtime/deck-spec.js` → `runtime/full-deck-renderer.js` embed → `runtime/deck-editor.js` clean/export → `extractDeckSpec()` recipient reparse。
- Public interfaces：`sanitizeDeckSpec()`、`validateDeckSpec()`、`embedDeckSpec()`、`extractDeckSpec()`、`recalculateValue()`、`renderFullDeck()`、`window.PPTSKILLEditor` export APIs。
- 欄位邊界：只新增 optional compact claims；來源僅保留 shareable allowlist；percentage-point derivation 必須明示 `scale: ratio | percent`。
- 隱私邊界：原件、私密路徑、raw body、prompt、Grill、profile、review reasoning 不出 portable HTML。
- 無取代：不新增 workflow、Evidence DB、renderer、editor architecture 或正式 EDX integration。

## Acceptance

1. Legacy `1.0` DeckSpec 無 claims 時維持可讀、可 render、可另存。
2. Compact claim/source/derivation 可通過 sanitizer、renderer embed、editor export 與 recipient reparse，不遺失、不變形成第二正本。
3. Private／unknown source fields 在所有保存路徑均被移除。
   - `preflight-new` 的 `portableClaims` 在輸出當下即套用 source／derivation allowlist，不依賴後續 DeckSpec 二次清洗。
4. Percentage-point 的 ratio 與 percent 輸入皆產生人類尺度的 point delta；缺 scale 或未知 scale fail loud。
5. Claim ID 唯一、slide linkage 有效；derived claim 必須有可重算 derivation。
6. Targeted、distribution、full regression、browser editor acceptance 與 `git diff --check` PASS。

## Blocking edges

- 已滿足：MVP reseal CLOSED、PGQ-WP1 Slice 1 GO。
- 本卡完成前：PGQ-WP2／WP3 與 EDX 正式 schema/runtime integration 不開始。
- EDX dependency spike 可平行，但不在本 lane scope。

## Final evidence

- Contract + DeckSpec + renderer + editor + distribution targeted：51/51 PASS。
- Full regression：140/140 PASS。
- Schema／receipt JSON parse 與 `git diff --check`：PASS。
- Browser claim path：editor export、重開、claim/derivation/source ref preservation、privacy、console/page/network 均 PASS。
- Browser overall：PASS。Repair 2 證明舊 hardcoded WebP fixture 無法被 `createImageBitmap()` 解碼；改用 browser canvas 產生有效 WebP 後，原 file-input path、export 與 reopen 全部通過。
- Evidence：`evidence/pgq-wp1-s2/browser-editor-roundtrip.json`。
