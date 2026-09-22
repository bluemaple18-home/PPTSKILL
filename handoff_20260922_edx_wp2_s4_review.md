# WP2-S4 Independent Review Handoff

Status: READY_FOR_INDEPENDENT_REVIEW / pending
Branch: codex/edx-wp2-s4-replace-asset
Base: `28c1b373476ddf8fb6680cf883711f586ef08486`
Reviewed candidate: `ebc4dc20ce393237480b3b1871199a29371befab`
Runtime product: `a8999d61aca69a746162b4da7afdc813b63ac971`；到candidate只改fixture與其render regression，ZIP不變。

## Scope與review重點

image-only replace-asset，Node/portable共用strict request與domain mutation；compat wrappers沿operation，缺省alt/fit保留、explicit覆寫；stable image target、async切頁/readonly export/target刪除、no-op revision/gesture stale、canonical與局部DOM rollback、export/offline preservation。沿既有asset policy/size gate，無schema/dependency/crop/insert/新UI。

檢查source9 SHA與protected4；驗candidate→handoff無runtime/tests/tools/ZIP drift。請回GO/NO-GO與P0–P3；不修改candidate/ZIP/protected，不merge/push/deploy、不開下一Slice。

## Evidence

- tasks/edx-wp2-s4-replace-asset.md 與 host-acceptance.md。
- evidence/edx-wp2-s4/mainline-receipt.md：完整歷史及限制。
- source-hashes.json：candidate/source9/protected4/ZIP。
- worker-result.md：targeted111/111；各次RED/GREEN失敗根因與Worker執行偏差。
- nonbrowser-final.log：Mainline fresh457/457；selection見nonbrowser-files.txt。
- distribution-lifecycle.json：PASS；ZIP2,289,517 bytes，SHA256 `5007d594dee18e8567c38e43ad1753b5c126c50356fa264d2326cc0d1e3f69c2`。
- host-fixture-retry/asset-replacement/acceptance.json：1280×720、1600×900各12checks，errors/remote0、targetClosed。
- host-fixture-retry/pgq.log 與 controller-receipt.json：PGQ單輪16/16 unique PASS，cleanup PASS；詳host-final-verification.json。

重驗：`node --test tests/edx-wp2-s4-replace-asset.test.mjs`；完整nonbrowser依selection檔。正式browser需受管host attachment，沒有port就只核對committed evidence，勿裸啟/unset sandbox；fresh與evidence-only必須分列。

## 限制與偏差不可隱藏

S4 browser案例是API-driven，不是新file picker/拖放/OS clipboard；optimizer實際處理File資料，base10仍為真pointer。
正式首輪base10後image DOM不存在FAIL，已用fixture canonical geometry修復，保存fixture-render-red/green。不是產品runtime修復，不混算PASS。
Worker誤跑tests/*.test.mjs觸及4支browser與tmp ZIP，超出分工；詳細worker-result.md。這次不能宣稱Worker有managed cleanup receipt。主線read-only observation未見相應活Chrome，但既有tmp roots歸屬不明未刪；正式host另有自己owned root/cleanup，兩者不能混用。

未merge/push/deploy S4。Mainline acceptance不代表Independent GO。
