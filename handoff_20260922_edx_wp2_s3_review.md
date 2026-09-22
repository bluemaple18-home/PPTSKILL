# WP2-S3 Independent Review Handoff

Status: READY_FOR_INDEPENDENT_REVIEW / pending。
Branch: `codex/edx-wp2-s3-copy-font-size`
Base: `ed5b34ef357bf158dd1fbd379fda9156f23a1155`
Reviewed product: `c43e480e9504f9b2da3ff6c1fdc31b30ee81c038`

## Scope

明示字級16–160、title/subtitle copy-style/paste-style；editor session snapshot，paste沿既有set-typography；不複製computed/default，不新增schema/system clipboard/history。

本輪bounded repair：focusin進入editor控制列時不提前clearTypographyTarget，避免mousedown/focusin階段隱藏字級toolbar；真正mode/slide切換仍清target。runtime只一行修正，附mounted RED→GREEN及真pointer中間狀態證據。

## 驗證入口

- tasks/edx-wp2-s3-copy-font-size.md
- tasks/edx-wp2-s3-host-acceptance.md
- evidence/edx-wp2-s3/focus-repair-receipt.md
- evidence/edx-wp2-s3/source-hashes.json
- evidence/edx-wp2-s3/focus-repair-red.log（原bytes同名.gz）
- evidence/edx-wp2-s3/focus-repair-green.log：targeted10/10
- evidence/edx-wp2-s3/focus-repair-nonbrowser.log：442/442
- evidence/edx-wp2-s3/focus-repair-lifecycle.json：ZIP lifecycle PASS
- evidence/edx-wp2-s3/host-focus-repair/style-copy/acceptance.json：1280×720、1600×900各14checks，errors/remote0，targetClosed
- evidence/edx-wp2-s3/focus-repair-verification.json：source9/9、protected4/4、artifact hashes MATCH；cleanup PASS
- evidence/edx-wp2-s3/host-focus-repair/pgq.log：單輪16/16 unique named PASS
- evidence/edx-wp2-s3/host-focus-repair/controller-receipt.json

可重驗：`node --test tests/edx-wp2-s3-copy-font-size.test.mjs`；full selection見nonbrowser-files.txt，四支affected PGQ另以--test-concurrency=1串行。若無正式host attachment，不裸開browser、不unset CODEX_SANDBOX；明列已提交browser evidence核對，勿宣稱fresh rerun。

## Review重點與限制

核對copy/default/invalid snapshot preservation、exact request與getter rejection、Node/portable契約、target/mode/slide/IME atomic guards、export/live snapshot/offline empty、focus ownership與click後cleanup。區分runtime/product source、測試harness和evidence-only commits。

歷史四輪browser FAIL保留於host-acceptance、host-input-retry、host-pointer-retry、host-final，不能用最新PASS覆寫；mounted RED直接重現提前隱藏，舊版完整pointer位移未另fresh錄製。IME只有synthetic CompositionEvent，非OS IME。

ZIP 2,287,440 bytes；SHA-256 `da3d95777124daaf43f70ab7de6a898715d2e2cff28969634694f575ea3119a1`。source9、protected4 hashes見manifest。

請獨立回GO/NO-GO與finding；不修改candidate/ZIP/protected，不merge/push/deploy、不開下一Slice。Mainline acceptance不是Independent GO。
