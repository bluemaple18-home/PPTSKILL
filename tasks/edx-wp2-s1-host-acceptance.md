# EDX-WP2-S1 — Host browser + affected PGQ acceptance

Status: PENDING / HOST_ACCEPTANCE
Parent: `tasks/edx-wp2-s1-direct-text-edit.md`
Product SHA: `a33b05a1e8a07accd4c55f8f4643369d5b9efe3d`
Branch: `codex/edx-wp2-s1-direct-text-edit`

## Objective

只補 WP2-S1 尚缺的正式 managed host browser 與 affected PGQ evidence。不要重做實作，不修改 Product SHA 對應的 source/tests/harness/ZIP，不碰四個 protected untracked。

## Frozen integrity

- Source：`evidence/edx-wp2-s1/source-hashes.json`，**6/6** 必須前後 MATCH。
- Protected：`.DS_Store`、`CLAUDE.md`、`HANDOFF-20260914-P0-R11-R1-S3.md`、`HANDOFF-20260914-PGQ-WP1.md`，**4/4** 必須 MATCH。
- ZIP：`2,283,305 bytes`；SHA-256 `7d1cbe050b61dab6fd31f4daa90290d298ee5c17509be7af363cd26446872929`。
- Mainline 已完成：focused **228/228**、full non-browser **423/423**、ZIP lifecycle PASS；不要重跑來取代 host scope。

## Browser acceptance

必須走 AI Core 正式 managed host lifecycle；不得 unset `CODEX_SANDBOX`、不得 sandbox 內 naked-launch Chrome、不得放寬容量／檔案數／TTL／scanner safety gate。

Attach 後執行既有 harness：

```sh
node tools/edx-wp1-s4-browser-acceptance.mjs <evidence-dir>/direct-text --direct-text-regression
```

1280×720、1600×900 都必須覆蓋：

- 真 double-click title 進 direct edit；layout/text mode 互斥。
- text/citation component 不取得 direct `contenteditable` authority。
- browser `CompositionEvent` lifecycle：composition partial 不進 canonical，composition 中 export fail loud，`compositionend` 才提交完整 CJK 文字。
- Escape 取消未提交 DOM，canonical 維持最後 committed value。
- export exact canonical；offline reopen 為 play mode、無 `contenteditable=true` 或 editor chrome。
- console/page/network/HTTP/remote errors = 0；owned target closed；managed cleanup PASS。

## Affected PGQ

Browser PASS 後，以同一 managed host safety contract 串行：

```sh
node --test --test-concurrency=1 \
  tests/pgq-wp4-s3-content-integrity.test.mjs \
  tests/pgq-wp4-s3-sample-approval.test.mjs \
  tests/pgq-wp4-s4-full-deck-qa.test.mjs \
  tests/pgq-wp4-s4-required-visibility.test.mjs
```

保留任何 supervisor/scan failure 的 raw evidence；不得把部分 PASS 湊成完整 PASS。若同一 blocker 依 AI Core stop rule 應停止，就回傳 failure + cleanup receipt，不反覆撞 browser。

## Return contract

回傳雙 viewport browser acceptance、PGQ unique named case count、controller/cleanup receipt、source/protected/ZIP 前後核對與所有 failure history。Evidence 放 `evidence/edx-wp2-s1/host-acceptance/`；不得 merge／push／deploy，不開下一 Slice。由 Mainline 決定是否升為 Independent Review candidate。
