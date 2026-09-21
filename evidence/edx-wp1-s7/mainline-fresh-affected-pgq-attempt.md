# S7 fresh affected PGQ host attempt

狀態：ENV_SCAN_LIMIT_BLOCKED；不是產品FAIL、PGQ PASS、review candidate或Independent GO。本次Owner明示的一次host browser授權已執行並消耗，不自行再啟第二個profile。

## 執行範圍

只執行 `tests/pgq-wp4-s3-content-integrity.test.mjs` 與 `tests/pgq-wp4-s4-required-visibility.test.mjs`。未重跑1280/1600 targeted browser。AI Core HEAD先核對為 `2d78d8e18d42156f43f12f0ebc6997914ec64328`；launch前14/14 source與4/4 protected hashes MATCH。

## 結果

- readiness controller：exit0，13 polls，取得本輪owned `DevToolsActivePort`。
- Node PGQ：2 tests，0 PASS／2 FAIL；總時長約33.1s。兩案各約29.8s／33.0s，證明test files實際重疊執行。
- 兩案皆在browser child被終止後收到空stdout，test端 `JSON.parse(error.stdout)` 產生 `Unexpected end of JSON input`；這不是產品assertion失敗。
- managed supervisor stderr：`NO_GO: resource observation unknown (scan limit)`；lifecycle exit2。
- Browser.close未送出：supervisor先終止Chrome並回收profile，port file已不存在；這不是cleanup leak。
- owned root absent=true；post 14/14 source與4/4 protected hashes MATCH。

完整原始證據在 `mainline-fresh-affected-pgq-after-aicore-20260921/`。

## Root cause boundary

AI Core目前browser policy仍為64 MiB／10,000 files。這次沒有 `runtime budget exceeded`，所以沒有證據指向bytes/file-count budget crossing。scanner對一般profile使用0.1s scan deadline，另有 `2 * max_file_count + 1024` 的entry traversal cap；兩者目前都折疊成同一個 `resource observation unknown (scan limit)`，本次receipt無法再區分是哪一個sub-trigger，不能猜。

本次命令未指定Node file concurrency；兩支PGQ平行執行。既有S4正式handoff的PGQ重現明確使用 `node --test --test-concurrency=1 tests/pgq-wp4-s*.test.mjs`。因此下一個最小驗證是維持同一AI Core managed lifecycle與既有限制，只把這兩支affected PGQ改為 `--test-concurrency=1` 串行執行。未取得新Owner一次性host授權前不得重跑。

ZIP lifecycle/hash維持未執行；PGQ fresh coverage未關閉前不升review candidate。不merge/push/deploy，不碰四個protected untracked。
