# Mainline bounded test repair

首輪 full non-browser：550/551 PASS；失敗僅 tests/pgq-wp3-s1-motion-numberflow.test.mjs 的產出字串斷言仍寫死 spec.slides。S8 clean(source=spec) 必須驗證候選 source 才能在 DOM/canonical commit 前拒絕，因此同步断言為完整 clean 預設參數與 source motion validator 呼叫；沒有放寬 semantic validator、不改 runtime 或測試選單。原 semantic invalid-token assertion、cleaned validation assertion 保留。

CodeGraph query 未定位此測試，rg 定位 test:141 與 editor clean 實體；source decision 依實碼。原失敗 log 保留 nonbrowser-initial-fail.log。Worker 的 FAIL-edit-script.log 為明標重述診斷，非當時 raw shell capture。
