# B-BC-01 Repair1 closure

日期：2026-09-28。**B-BC-01 CLOSED / VERIFIED FIXED；本窄域候選 review：GO。** 未發現本次 delta 的新阻塞問題。不代表 whole Core3 GO、PPT client mapping 完成或 host acceptance 通過。

## 固定版本

候選 `996492481144e92775780ce932661e38779cdddc`；比較基準 `1829f1ab31ba63bbe6e286faf1bc03d2bb9e11ed`。

| 檔案 | SHA256 |
| --- | --- |
| `scripts/tmp_session.py` | `6a3853ec0fec97ad5718d9a36acdea7fbfc0a4dbf94eff2bb2812b8992a5121d` |
| `tests/test_tmp_session_browser_command.py` | `2c67040631fce3359bc61bd0893ac9b07be4b2e35a8396c8ec1a5e0b58324176` |
| `docs/tmp-session-lifecycle.md`（未改） | `1852e379023ecf23589e31377b81cb8bec20e2650ae3591930795b2da5c79a89` |

## Delta 與同反例 closure

只增加 `failed=False`、caught OSError 設 `failed=True`、成功出口要求 `not failed`。已知 client 非零優先、browser 非零其次、signal 負值轉 CLI exit 的既有順序未改。沒有新增 cleanup、launcher、signal handler 或 runtime。

原 B 反例在 **journal write** 注入一次 EIO，client/browser 都 exit 0：舊版回 0；本版回 **2**。session/error 與 browser/exited 仍留存，缺失的 client/exited 沒有被補造。另測 ENOSPC 結果相同。

同一 write-failure probe 驗證兩種 errno × 四個 exit 組合：`(0,0)→2`、`(7,9)→7`、`(0,9)→9`、`(-9,0)→137`。新增 delivery unit case 在 journal **open** 故障點驗證兩種 errno × 三個 exit 組合。所有案例通過，browser 收尾仍執行，沒有自行 kill。

Spec axis：原「journal I/O failure 可回成功」缺口已解除。Standards axis：修正只保存 sticky failure，沒有改原 child 非零優先序或擴 execution ownership 範圍。既有候選的其他審查結論與未驗項不重新裁決。

## Reviewer B fresh 窄驗證

從 PPTSKILL repo root：

```sh
/Users/matt/ai-core/.venv/bin/python -B evidence/edx-core-3-undo-redo/browser-command-ownership-review-b-repair1.py
```

結果：**2/2 test methods 通過，共 14 個窄故障組合，0 skip**。只執行新 journal unit method 與 B 同反例；未跑整個 unit/process suite。`git diff --check 1829f1ab HEAD` 通過。

可重播來源：`browser-command-ownership-review-b-repair1.py`；fresh log：同前綴 `.log`；詳細結果／hashes：同前綴 `.json`。

本次測試前後 candidate 三檔 hashes 相同；原 B NO_GO receipt、probes、log、results 四檔 hashes 相同，未覆寫。只新增指定 repair1 前綴檔案。沿用本 checkout 先前 CodeGraph 無索引結果，以限定 delta 檢查，未再查 scanner。

## 邊界與交回

未 launch 任何真 child、Chrome、PGQ 或 host；未修改候選。Mainline 正在執行的正式 15-case 結果不算本 reviewer fresh，也未用其尚未完成結果支持 closure。

**交回 GO，限此凍結候選及 B-BC-01 closure。** PPT mapping、產品驗收及正式 host evidence 仍由 Mainline 裁決。原 receipt 保留歷史 NO_GO，本文件為後續 closure。完成後停止寫入。
