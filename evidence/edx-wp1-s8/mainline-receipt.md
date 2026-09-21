# S8 Mainline 驗收 receipt

狀態：**REVIEW_CANDIDATE / INDEPENDENT_REVIEW_PENDING**。Branch `codex/edx-wp1-s8`；S8 base `9188b787ad964b92a129a5cff8f7067b08c0f4ea`；承接 checkpoint `a58cdfa5e963d7842aa7dfcf07dde181002c223d`。

## 本輪結果

正式 host execution 實測 `CODEX_SANDBOX=None`，AI Core managed browser admission／logical-line readiness 成功。沒有 unset sandbox、修改 AI Core、Rule 24 或 capacity sensor。

- `canonical-fixture-host-recheck/selection/acceptance.json`：fresh 1280×720、1600×900 各 **15 checks PASS**，每個 viewport 為 10 個 base interaction checks + 5 個 S8 aggregated checks，不宣稱 15 個 S8 獨立案例。涵蓋真 marquee、Shift toggle、0/1/>1 handoff、Escape/layout/text/slide/blur cleanup、multi-select export/offline reopen。console/page/network/HTTP/remote 全 0，兩個 owned target 均 closed。
- `canonical-fixture-host-recheck/affected-pgq.log`：四支 export-seam affected files 串行 **16/16 named cases PASS**，0 fail/skip/cancel；單輪完成，耗時約 709 秒。不是四個 cases，也不冒稱全套 PGQ 重跑。
- `canonical-fixture-host-recheck/controller-receipt.json`：readiness、selection、PGQ、Browser.close、supervisor 均 exit 0；owned root `/private/tmp/aic-b-8392a526c6804d9dbe3dfd4e3da79780` 與 isolation marker 已移除；source/protected hashes 前後一致。
- `export-style-focused.log`：fresh **172/172 PASS**。
- `final-nonbrowser.log`：fresh **377/377 PASS**；僅排除上述四支真正 browser-backed PGQ。
- `export-style-distribution-lifecycle.json`：fresh install/smoke/uninstall、single shared core、profile preserve PASS。Gemini CLI missing 維持 host capability partial，不包裝為三家 host 全通過。
- 最終 `dist/PPTSKILL-0.1.0.zip`：**2,280,185 bytes**，SHA-256 **`f81efc729f17257a36802faa94c186742a07596dc7f36e90b75de6edab5e89c5`**。
- `final-source-hashes.json`：20 個 source/build/test hashes 與四個 protected untracked MATCH；最終 ZIP hash/size 一併 freeze。`export-style-source-hashes.json` 是 browser 開跑前 freeze，其中 distribution 欄仍為舊 checkpoint ZIP，不能當最終 ZIP receipt。

## 必要修復與歷史

真 browser 找到 Selecto 匯出 stylesheet 殘留，依 pinned vendor 的 class ID 補齊既有 clone cleanup 對應，保留無關 styles；mounted fixture 改為真 vendor DOM 形狀，RED→GREEN。接著修正 S8 browser fixture 的 raw-input/canonical-output 比較基準。產品與 ZIP 因前者已有變更，不能沿用 a58cdfa 的 reviewed SHA 或舊 ZIP hash。

完整失敗、cleanup 與修復界線見 `host-repair-history.md`。沒有把首輪 Browser.close client exit 1 改寫為 PASS，也沒有刪除 FAIL artifacts。

## 重現命令

```sh
node --test tests/edx-wp1-s3-*.test.mjs tests/edx-wp1-s4-*.test.mjs tests/edx-wp1-s5-*.test.mjs tests/edx-wp1-s7-*.test.mjs tests/edx-wp1-s8-*.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs
node --test --test-concurrency=1 tests/pgq-wp4-s3-content-integrity.test.mjs tests/pgq-wp4-s3-sample-approval.test.mjs tests/pgq-wp4-s4-full-deck-qa.test.mjs tests/pgq-wp4-s4-required-visibility.test.mjs
node tools/build-distribution.mjs
node tools/distribution-host-probe.mjs --archive dist/PPTSKILL-0.1.0.zip --output /tmp/s8-review-zip-lifecycle.json
```

PGQ 需要正式 managed host browser 與 owned DevTools attachment；sandbox 僅 attach-only，不得直接啟 Chrome 或清掉旗標。Independent reviewer 可只核對已提交 browser evidence，必須區分 fresh rerun 與 evidence review。

未 merge／push／deploy，未開 S9。下一步僅獨立 review；本 receipt 是 Mainline 驗收，不能當 Independent GO。
