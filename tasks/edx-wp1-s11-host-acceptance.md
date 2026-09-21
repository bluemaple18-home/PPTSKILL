# EDX-WP1-S11 — Host browser + PGQ acceptance

Status: COMPLETE / HOST_ACCEPTANCE_PASS
Parent: `tasks/edx-wp1-s11-equal-gap.md`
Product SHA: `5589217175c443f407785f3a3b2aac110896d5f2`
Branch: `codex/edx-wp1-s11-equal-gap`
AI Core baseline: `e155b3abeabe45c2442bcf86c30236237c84ffaa`

## Objective

只補 S11 尚缺的正式 host browser 與 affected PGQ evidence。不要重做實作，不修改 Product SHA 對應的 source/tests/harness/ZIP，不碰四個 protected untracked。

## Frozen integrity

- Source：`evidence/edx-wp1-s11/source-hashes.json`，8/8 必須前後 MATCH。
- Protected：4/4 與 S10 baseline MATCH。
- ZIP：`2,282,817 bytes`；SHA-256 `388e2bfefbcc9d483760f21a51f0b18458ef975ffb68ad58ce6e06d04530c959`。
- Mainline 已完成：targeted 34/34、focused 211/211、non-browser 416/416、ZIP lifecycle PASS；不要重跑來取代 host scope。

## Browser acceptance

必須走 AI Core 正式 managed host lifecycle；不得 unset `CODEX_SANDBOX`、不得 sandbox 內 naked-launch Chrome、不得放寬容量／檔案數／TTL／scanner safety gate。

Attach 後執行：

```sh
node tools/edx-wp1-s4-browser-acceptance.mjs <evidence-dir>/equal-gap --equal-gap-regression
```

驗收 1280×720、1600×900，各至少：

- 真 multi-select 3 items；2-selection equal-gap controls 隱藏、3-selection 顯示。
- `horizontal-gaps`：頭尾固定、中間依不同寬度形成 equal gap。
- `vertical-gaps`：頭尾固定、中間依不同高度形成 equal gap。
- success 後 selection retained。
- export exact canonical；offline reopen selection empty、無 contextual toolbar / editor chrome。
- console/page/network/HTTP/remote errors = 0；owned target closed；managed cleanup PASS。

## Affected PGQ

Browser PASS 後，以同一正式 managed host safety contract 串行：

```sh
node --test --test-concurrency=1 \
  tests/pgq-wp4-s3-content-integrity.test.mjs \
  tests/pgq-wp4-s3-sample-approval.test.mjs \
  tests/pgq-wp4-s4-full-deck-qa.test.mjs \
  tests/pgq-wp4-s4-required-visibility.test.mjs
```

保留任何 supervisor/scan failure 的 raw evidence；不得把部分 PASS 湊成完整 PASS。若同一 blocker 再次無進展，依 AI Core stop rule 停止並回傳 receipt。

## Return contract

回傳 browser acceptance、PGQ named case count、controller/cleanup receipt、source/protected/ZIP 前後核對，以及任何歷史 failure。Evidence 可寫入 `evidence/edx-wp1-s11/host-acceptance/`；不得 merge／push／deploy，不開 S12。由原 Mainline 做 review-candidate 裁決。

## Return receipt — 2026-09-22

已依本卡完成一次正式 host run：browser 雙 viewport 各 13 checks PASS；PGQ 單輪 16/16 unique named PASS；managed cleanup PASS。source/protected/ZIP 前後一致，產品未修改。參照 `evidence/edx-wp1-s11/mainline-receipt.md`、`host-final-verification.json` 與 `host-acceptance/controller-receipt.json`。Mainline 已裁定 review candidate；Independent Review 仍 pending。
