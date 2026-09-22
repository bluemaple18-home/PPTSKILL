# EDX-WP2-S2 — Host acceptance

Status: COMPLETE / HOST_ACCEPTANCE_PASS
Parent: `tasks/edx-wp2-s2-role-font-size.md`
Branch: `codex/edx-wp2-s2-role-font-size`
Product SHA: `14555d0499e1f07ec8fabf3deb5e33db90d4d608`。

## Scope / contract

僅補已 freeze 產品的正式 managed browser + affected PGQ，不修改產品／ZIP／protected。source、ZIP 與四個 protected hash 必須前後一致。

```sh
node tools/edx-wp1-s4-browser-acceptance.mjs <evidence-dir>/typography --typography-regression
```

雙 viewport 1280×720、1600×900：真 double-click title/subtitle 進 edit；contextual font-size 套用與 reset；computed font-size 與 canonical 一致；16/160 邊界、invalid input 原子拒絕；composition 中禁止變更；切頁/模式清 target；改文字保留字級；export/reopen geometry/motion/content 不漂移、無 editor chrome。IME 僅 browser synthetic CompositionEvent，不宣稱原生 OS IME。

若 typography runner 缺任一契約，不以其 exit0 代替未覆蓋項；回主線補 bounded harness 或明確列缺口。

Browser PASS 後串行四支 PGQ：

```sh
node --test --test-concurrency=1 tests/pgq-wp4-s3-content-integrity.test.mjs tests/pgq-wp4-s3-sample-approval.test.mjs tests/pgq-wp4-s4-full-deck-qa.test.mjs tests/pgq-wp4-s4-required-visibility.test.mjs
```

正式入口 `/Users/matt/ai-core/scripts/tmp_session.py browser`；保留原容量／檔案數／TTL／scanner／cleanup 限制。不得 unset sandbox 或 naked launch。12秒 logical-line readiness，supervisor early exit 或 timeout 停止；Browser.close、supervisor exit、owned root absent、isolation marker absent 才算 cleanup PASS。

Evidence：`evidence/edx-wp2-s2/host-acceptance/`；console/page/network/HTTP/remote=0，每 viewport targetClosed。FAIL 不覆寫；相同 blocker 兩次無進展回主線，不自動反覆重跑。完成停 Independent Review candidate，不 merge／push／deploy、不開下一 Slice。

## Return receipt — 2026-09-22

完成於 `evidence/edx-wp2-s2/host-toolbar-repair/`：雙 viewport 各 16 checks、PGQ 單輪 16/16 unique PASS；cleanup PASS；source/protected/ZIP 前後 MATCH。`host-acceptance/` 與 `host-diagnostic/` 為保留的歷史 FAIL，兩輪均未啟動 PGQ且 cleanup PASS。Mainline 已整理 Independent Review candidate，未宣稱獨立 GO。
