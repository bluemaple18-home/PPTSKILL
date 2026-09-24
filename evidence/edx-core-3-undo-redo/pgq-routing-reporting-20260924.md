# PGQ 路由與失敗回報：bounded diagnosis

Status: `REPORTING_SEAM_FIXED / PGQ_HOST_BLOCKED / CORE3_PRODUCT_NO_GO`

## 分流

`pnpm test` 目前以 `node --test tests/*.test.mjs` 執行，包含下列四支需要正式受管 browser 的 PGQ；因此 sandbox 執行後的非 browser 通過數不能稱為 full PASS。這四支須在同一固定候選及可用的 managed DevTools endpoint 下串行執行，並保留 supervisor／cleanup receipt：

- `tests/pgq-wp4-s3-content-integrity.test.mjs`
- `tests/pgq-wp4-s3-sample-approval.test.mjs`
- `tests/pgq-wp4-s4-full-deck-qa.test.mjs`
- `tests/pgq-wp4-s4-required-visibility.test.mjs`

本輪不改 `pnpm test` 的全量語意、不新增 runner，也不把四支永久 skip。需要 sandbox 非 browser 驗證時，明確列出 `tests/*.test.mjs` 扣除上述四檔的清單，保留清單和 reporter 輸出；不能把所得通過數加成 full PASS。

## 失敗首因與最小修正

Host04 的 `pgq.log` 同時有 `Chrome DevTools port 未就緒` 及 required-visibility 測試的 `Unexpected end of JSON input`。後者出自 `tests/pgq-wp4-s4-required-visibility.test.mjs` 在 producer 異常退出、stdout 沒有 JSON receipt 時直接 `JSON.parse(error.stdout)`；是次生回報錯誤，不是 DeckSpec JSON 損壞證據。Host04 supervisor 的 `IO_ERROR_OBSERVED` 指向 AI Core scanner 在 Chrome profile 暫存 entry 做 no-follow stat 時遭遇 ENOENT；該根因仍須 AI Core 依自己的交接卡調查，不能由此測試修正宣稱已修復。

僅修改 required-visibility 測試的兩個解析接點：有完整 JSON 時仍使用原有 raster／visibility assertions；無 stdout 時保留原 `execFile` 錯誤；有非 JSON stdout 時回報 producer exit、stderr 與原錯誤。沒有修改產品 runtime、browser producer、ZIP、AI Core 或安全 gate。

## 可重播證據

以 `PPTSKILL_DEVTOOLS_ACTIVE_PORT=/private/tmp/pptskill-core3-missing-port/DevToolsActivePort` 設定不存在的 port 路徑，在 sandbox 對 required-title 個案執行 `node --test --test-reporter=tap --test-name-pattern='每張 canonical slide 的 required title' tests/pgq-wp4-s4-required-visibility.test.mjs`。producer 因指定 attach endpoint 不存在而失敗，不會 spawn Chrome。

- 修正前：exit 1，`Unexpected end of JSON input`，見 `pgq-reporting-red.tap`。
- 修正後：exit 1，顯示 `Chrome DevTools port 未就緒`，不再顯示上述 JSON 解析假首因，見 `pgq-reporting-green.tap`。
- 兩次都是刻意的環境失敗；**不是 PGQ PASS，也不代表 Host04 observer 已修好**。

Core3 產品候選 `60a05ce33924dfd92c2977d743b24afc408dd207` 的三個 P1 與 Repair 2 停止條件維持 `review-round-03.md`／`mainline-arbitration-20260924.md` 裁決。後續產品 Repair 須 Owner 另行裁決；此 reporting-only 變更不重置配額。不重跑正式 host acceptance，未 merge／push／deploy。
