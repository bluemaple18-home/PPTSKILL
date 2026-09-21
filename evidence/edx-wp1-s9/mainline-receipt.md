# S9 Mainline browser acceptance receipt

狀態：**REVIEW_CANDIDATE / INDEPENDENT_REVIEW_PENDING**。
Product SHA：`c5c6dac53ba340cbc7ca05db874edd080f89adc8`；branch `codex/edx-wp1-s9-align-selection`；base `f7537c4`。本輪只新增 evidence/control docs，沒有修改產品、測試、harness 或 ZIP。

## Fresh host verification

- 正式 host execution 實測 `CODEX_SANDBOX=None`，沿 AI Core `tmp_session.py browser`；沒有 unset sandbox 或更改 Rule 24／capacity／scan gate。
- `mainline-host-acceptance/alignment/acceptance.json`：1280×720、1600×900 各 **13 checks PASS**，每個 viewport 為 10 個 base interaction checks + 3 個 S9 aggregated checks：align-left、align-center-x、export/offline reopen。兩次 align 都保留 multi-selection；reopen 為空 selection。console/page/network/HTTP/remote 全 0，兩個 owned target closed。
- 六種 alignment 的完整語意由 checkpoint core/mounted tests 覆蓋；不宣稱本 browser 矩陣六種都 fresh 點過。
- 四支 affected PGQ 的 **16 個 unique named cases 有 fresh PASS 覆蓋，精確為 8 + 8，singleRun16Pass=false**。首輪 content-integrity + sample-approval 8 PASS；full-deck-qa 與 required-visibility 因 supervisor scan-limit 停損未通過。只補後兩支的 bounded retry 8/8 PASS。兩輪都使用 `--test-concurrency=1`。
- 首輪 supervisor exit 2、沒有 Browser.close PASS claim；owned root 已回收。Retry readiness／PGQ／Browser.close／supervisor 全 exit 0，owned root 已回收。兩輪 isolation marker 均不存在、sources/protected 前後一致。完整失敗與判讀界線見 `host-attempt-history.md`，未刪除或覆寫 FAIL。
- `mainline-verification.json`：sources **11/11**、protected **4/4**、ZIP MATCH；acceptance 內 20 個既有 artifact hash assertions MATCH，額外把沒有原 hash 欄的 source artifact 也凍結於此檔。兩輪 owned roots 實檔不存在已重新核對。

## Checkpoint evidence（本輪核對，不重跑）

- `focused.log`：**185/185 PASS**。
- `nonbrowser.log`：**390/390 PASS**，排除四支真正 browser-backed PGQ。
- `distribution-lifecycle.json`：install/smoke/uninstall、single shared core、profile preserve PASS；Gemini CLI missing 為 host capability partial。
- ZIP 沿用 checkpoint：**2,281,550 bytes**；SHA-256 **`b4ba66f24d6780d6899f6bc1c48f5d2f32cf03fb3878091d28636c2ec3e0db57`**。source 未變，因此只重算比對，不機械重建。

## 重現入口

```sh
node tools/edx-wp1-s4-browser-acceptance.mjs <evidence-dir> --alignment-regression
node --test --test-concurrency=1 tests/pgq-wp4-s3-content-integrity.test.mjs tests/pgq-wp4-s3-sample-approval.test.mjs tests/pgq-wp4-s4-full-deck-qa.test.mjs tests/pgq-wp4-s4-required-visibility.test.mjs
```

上述 browser-backed 命令必須 attach 正式 managed browser 的 `PPTSKILL_DEVTOOLS_ACTIVE_PORT`；sandbox 僅 attach-only。若需驗證已完成 evidence，不必再次啟 browser；fresh rerun 與 evidence-only review 必須分開報告。

目前 blocker 已解除，可以交獨立 Reviewer；本 receipt 不是 Independent GO。未 merge／push／deploy，未開 S10。等待獨立 verdict 再由 Mainline closure。
