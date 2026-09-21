# S9 host browser / PGQ attempts

Product checkpoint：`c5c6dac53ba340cbc7ca05db874edd080f89adc8`。本輪不修改產品／ZIP，沿正式 host execution 與 AI Core managed lifecycle，未 unset sandbox 或改安全 gate。

## 首輪 mainline-host-acceptance

`--alignment-regression` 在 1280×720、1600×900 各 13 checks PASS（10 base + 3 S9 aggregated）。兩 viewport console/page/network/HTTP/remote errors 全 0、owned target closed。

四支 affected PGQ 使用 `--test-concurrency=1`：content-integrity 與 sample-approval 共 **8 named cases PASS**。後續 supervisor stderr 出現 `NO_GO: resource observation unknown (scan limit)`；full-deck-qa 在 top-level evidence collection 因 browser producer 中止失敗，required-visibility 收到空 JSON 後失敗。Node reporter 為 8 pass / 2 fail，其中一個 fail 是檔案載入層級，不當作已執行的 named product case。

Supervisor exit 2，owned root `/private/tmp/aic-b-750b3957579d4260a3a85c54451731d0` 與 isolation marker 已消失；sources/protected hashes 未變。Browser 已由 supervisor 停止，本輪沒有可宣稱 PASS 的 Browser.close step。原始 launcher stderr、browser stderr、PGQ traceback、controller receipt 全部保留。

這只能證明 resource observation scan-limit 停損，不能證明產品 assertion regression，也不能宣稱已找出 scan-limit 的內部根因。不得用 browser case 內的零 errors 掩蓋 supervisor 層級 failure。

## Bounded retry 裁決

只補未完成的 `pgq-wp4-s4-full-deck-qa.test.mjs` 與 `pgq-wp4-s4-required-visibility.test.mjs`，仍串行、原 managed lifecycle／容量／scan 預算、source/ZIP freeze 不變；不重跑 alignment 與前兩支已通過 PGQ。Evidence 目錄 `affected-pgq-bounded-retry/`。同 blocker 再發生即停止，不新增第三次 launch。最終結果以 controller receipt、PGQ log 及 Mainline receipt 為準，這份裁決不預先宣告成功。
