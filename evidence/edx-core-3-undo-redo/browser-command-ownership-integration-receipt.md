# Browser／client ownership canonical 整合完成

日期：2026-09-29。**CANONICAL_INTEGRATED_VERIFIED**。Owner 在獨立核對後明確授權 local canonical integration commit 與整合後測試；本 task 為 Mainline，沒有轉交責任。

Canonical 從 `28cad2d3beaaf32de2f62d0c08396aaba789ea01` 成為 **`71b774d31b8e7aa9e05786c8dc431c7528dabdc1`**。從已驗證 `browser-command-ownership-repair1.bundle` 匯入候選 `996492481144e92775780ce932661e38779cdddc`，只套用最終三檔形成單一 local integration commit；沒有把首版1829f1ab作為另一個canonical commit。

## 實際驗證

- 三檔精確為 `scripts/tmp_session.py`、`tests/test_tmp_session_browser_command.py`、`docs/tmp-session-lifecycle.md`；SHA256與兩審GO的最終候選相同。canonical實際載入的入口與scanner module均位於 `/Users/matt/ai-core/scripts/`。
- Canonical原提交hook完成 `harness audit quick passed`，commit exit0。完整hook輸出在本task工具紀錄，未另存raw log，不虛稱另有檔案。
- 在整合後canonical、正式host執行 `python -B -m unittest discover -s tests -p 'test_tmp_session*.py' -v`：**26/26 PASS、0 skip、36.387秒、exit0**。使用原uv管理 `.venv`，沒有清除sandbox旗標。
- 十組fake browser/client進程case涵蓋成功、非零、啟動失敗、同PGID、signal、TTL／bytes／files與residual。測試後fresh ps核對 **28個已知PID無匹配，十個owned roots皆消失**；unknown收斂保留root仍是mock契約測試，不冒稱真host unknown演練。
- scanner、policy、capacity sensor三份SHA256前後相同；canonical tracked clean，原兩份untracked檔的路徑與內容hash完全保留。
- PPT產品75 source、四個protected及ZIP均MATCH；ZIP 2,329,758 bytes，SHA256 `862bb19f82b10fab9a244a1c334fed1f39b6edc1ad5c5ff95aebe3cc04daf290`。

## 證據與邊界

前置核對：`browser-command-ownership-integration-before.json`。單一commit事實：`browser-command-ownership-integration-commit.json`。最終驗證／三檔與不變檔SHA／十組case／fresh PID觀測：`browser-command-ownership-integration-verification.json`。原始測試log：`browser-command-ownership-integration-tests.log`；SHA記於verification。

本輪授權範圍完成；沒有接PPT client mapping、沒有啟真Chrome、雙viewport或四PGQ，也沒有push／deploy／production。原controller與pending manifest不變，不能直接拿來驗收。Core3仍 **PENDING／未關卡，核心2/6**；原R2 applicability與RECOVERY_NOT_OBSERVED不變。

下一階段是PPT同群組client薄接線及原定產品驗收，由本Mainline承接，但不在本輪自動啟動。未開Core4、未新增scanner修補。整合已通過驗證，沒有觸發rollback；若後續需回退，本次單一integration commit可獨立revert，不碰其他工作。
