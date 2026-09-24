# Core3 首輪候選與 Repair 1 決策

Product `6f00a77`：主線完整 non-browser 首輪 1008/1009，失敗為 S5 舊 listener 數量斷言；修正測試 ownership 後重跑 1009/1009 PASS。ZIP lifecycle PASS、75 個 runtime/schema/contracts source byte-match，ZIP 2,325,385 bytes，SHA-256 `1b7e4b571c6b41a48c169de0271a58b5206639b23c7034a6627ba51c4a8d2e3e`。

Host01：12 秒 `DevToolsActivePort` readiness 未完成，產品 harness 未執行；Chrome 後來輸出 DevTools listening。controller cleanup 後 owned root／marker 均不存在，診斷無 I/O error。Host02 以 25 秒 bounded deadline 重試，實際 1.866 秒 ready；正式 browser 1280×720、1600×900 各 11 records PASS，errors 全 0、targetClosed=true。這些是首輪候選 evidence，非修復版驗收。

兩名獨立盲 Reviewer（Lovelace、Euclid）各自唯讀判 Code NO-GO：history/toolbar after-effect throw 留下失敗 entry 或前進 cursor；direct component patch after-effect throw 留下 DOM/canonical 分歧。另有 stale DOM patch silent success、gesture 中 disabled UI 過期、失敗後 selection/Moveable 丟失。固定 finding 見 `tasks/edx-core-3-undo-redo-review.md`。

因候選已 NO-GO，主線中止 Host02 尚在執行的 affected PGQ；當時僅有 7 筆已輸出 PASS，**不可記成 16/16**。PGQ child 收到 SIGINT，controller 記錄 PGQ exit 1，隨後 Browser.close 0、supervisor 0、owned root/marker cleanup PASS，資源診斷 330 scans 無 I/O error。這是主線主動節省無效候選的時間，不是產品 PGQ assertion FAIL。Repair 1 回同一 Writer；修復後須重新固定 SHA、完整 non-browser／ZIP／雙 viewport browser／PGQ，並 targeted re-review。
