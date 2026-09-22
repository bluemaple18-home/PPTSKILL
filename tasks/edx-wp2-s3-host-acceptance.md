# EDX-WP2-S3 — Host acceptance

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Parent: `tasks/edx-wp2-s3-copy-font-size.md`
Product SHA: `c43e480e9504f9b2da3ff6c1fdc31b30ee81c038`
Branch: `codex/edx-wp2-s3-copy-font-size`

## Scope

只驗 frozen candidate，不修改產品/ZIP/protected。前後source/ZIP與4個protected hashes必須MATCH。

```sh
node tools/edx-wp1-s4-browser-acceptance.mjs <evidence-dir>/style-copy --style-copy-regression
```

1280×720、1600×900：真 double-click title/subtitle、number input套用明示字級、copy/paste按鈕可見可點；未copy paste disabled、無override copy disabled；title→subtitle、跨slide、source變更後snapshot不變；invalid/IME拒絕；mode/slide切換清target不可wrong-slide mutation；export保留live clipboard與canonical、offline reopen clipboard空、無editor chrome；computed字級與canonical一致、內容/geometry/motion/style不漂移。IME僅synthetic CompositionEvent。

Browser PASS 後同一 managed lifecycle 串行：

```sh
node --test --test-concurrency=1 tests/pgq-wp4-s3-content-integrity.test.mjs tests/pgq-wp4-s3-sample-approval.test.mjs tests/pgq-wp4-s4-full-deck-qa.test.mjs tests/pgq-wp4-s4-required-visibility.test.mjs
```

AI Core正式tmp_session.py browser入口；不unset sandbox/naked launch/放寬容量TTL/scanner。12秒logical-line readiness；exit/timeout停；Browser.close/supervisor/owned root absent/isolation marker absent才cleanupPASS。errors/remote=0，每viewport targetClosed。所有FAIL保留、不合計成單輪；同blocker兩次無進展回主線。

Evidence：`evidence/edx-wp2-s3/host-acceptance/`。完成停review candidate，未merge/push/deploy、不開下一slice。

## 本輪停損

四輪 browser FAIL 均保留；最後兩輪 delete 可見尺寸同阻點無進展。停止重開 browser；先蒐集 bounded mode/hidden/disabled/display/rect/hit/selection 診斷，勿直接重跑。詳 evidence/edx-wp2-s3/mainline-checkpoint.md。PGQ 尚未開始。

## Owner 指定 bounded focus repair

假說：文字到 editor button 的 focusin 先隱藏字級 toolbar，造成 pointer release 位移；保留 editor 內 target 直到 click mode transition 後，症狀應消失。替代假說為 mode handler 本身沒有完成，須用 browser 中間 mode/rect/hit 證據分辨。先跑 mounted RED，僅修 focus ownership，再鎖真實 mousedown/focusin/mouseup/click 與 target cleanup。回退為 revert 本輪修復 commit；不改 AI Core/clipboard contract。

## 本輪正式結果

Owner指定focus repair已完成：mounted RED→GREEN、targeted10/10、full442/442、雙viewport各14checks、PGQ單輪16/16與完整cleanup PASS。詳focus-repair-receipt.md；歷史停損紀錄保留。

最新裁決：Independent Review GO，P0–P3全0，WP2-S3正式結案。見 `evidence/edx-wp2-s3/independent-review.md`。歷史pending/stop紀錄保留作時間序列；未merge/push/deploy，未開下一Slice。
