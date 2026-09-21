# S7 Mainline — AI Core 修復後 checkpoint

狀態：BROWSER_TARGETED_PASS / FRESH_AFFECTED_PGQ_ENV_SCAN_LIMIT_BLOCKED；不是review candidate、Independent GO或交付GO。

- AI Core fixed SHA：`2d78d8e18d42156f43f12f0ebc6997914ec64328`。
- 1280×720：沿Mainline既有fresh normal/reduced/static 15 checks PASS；本輪未重跑。
- 1600×900：`mainline-host-1600-after-aicore-20260921-r3/targeted/acceptance.json` fresh PASS；normal/reduced/static各5 checks，errors0；readiness/harness/Browser.close/lifecycle皆exit0，owned root已回收。
- Motion reset後source freeze：14/14 source與4/4 protected hashes仍MATCH `motion-reset-hashes.json`。
- Full non-browser：337/337 PASS，對應上述相同source freeze。
- 最新focused：158/158 PASS，`mainline-focused-after-motion.log`。
- `git diff --check` PASS。

Fresh PGQ只需重驗motion-sensitive的content-integrity與required-visibility；sample-approval與full-deck QA authority seam未改，沿既有reviewed evidence。Owner後續授權的一次host launch已消耗，但兩支test平行執行期間managed supervisor以scan-limit fail-closed終止Chrome；這不是產品FAIL。完整證據見 `mainline-fresh-affected-pgq-attempt.md`。下一次若重新授權，依既有S4正式PGQ模式加 `--test-concurrency=1` 串行執行，不改scanner或容量限制。

PGQ通過後才做final ZIP lifecycle/hash與review candidate封裝。不得merge/push/deploy，不碰四個protected untracked。
