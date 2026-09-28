# Reviewer A — R2 cause-chain narrow recheck

日期：2026-09-28。**CODE GO（限本次 delta）**；未發現阻塞 finding。原 A receipt bytes 完整保留。本次沒有讀其他 reviewer、沒有修改 delivery、沒有啟 host，也沒有重跑 lifecycle 大 suite。

**Host-execution readiness 沿用原條件式 GO，由 Mainline 完成解鎖與正式環境前置檢查；HOST PASS 仍為 NOT_RUN。** 本次留證修補不解除原 socket sandbox 驗證缺口，也不替代 host acceptance。

## Delta 身分確認

比對原 `observer-r2-review-a-validation.json`：在記憶體移除 observer 新增 cause traversal 與兩個 event 欄位後，SHA256 精確還原原 observer hash；在記憶體移除新 `test_identity_io_cause_survives_sampling_string_boundary` 後，SHA256 精確還原原 test hash。沒有將重建內容寫回 delivery。

- scanner HEAD：`4edd0747a25b13920b3ab1ead99895a99dbe8964`，scanner SHA256 仍為 `0e411a0c970ae17f9fac805b5d3010ebc0742a5b6b774eb15b8c06137ffe8edf`。
- controller SHA256 仍為 `f8462b9e50f08a5f54f9adbbae54508119590ee935216546d9119aebf7e86c8c`。
- observer 新 SHA256：`06c362a4775ca57f8cadd1c5dc78fec7e70b3b4a622f14e111c6e59e9b791ff3`。
- test 新 SHA256：`02deecd36a1a85903e80925d1e2eb01504eef7bcd5bee38245268ee698d136f6`。
- 原 `observer-r2-review-a.md` 本次前後 SHA256：`434af44b705dd99601b17fb089fb9db52402f017aa3f06454ba4e8cf25fdfee1`。

沿用本 session CodeGraph 無索引的已知回覆，只讀指定檔案，不重新索引或擴大掃描。

## 核對結果

| 位置 | 結果及證據 |
| --- | --- |
| `host-smoke-r2-observer.py:47` exception 分支 | 只讀 explicit `__cause__`，保存 type/message/errno；seen 先含最外層 exception，最多記 8 個 causes，遇 cycle 或仍有第 9 個 cause 時 `causeChainTruncated=true`。恰好 8 個且鏈已結束時為 false。 |
| `host-smoke-r2-observer.py:56` event 留證 | 原最外層 exception 欄位不變，causes 隨同 exception event 寫 journal，亦保留在 scans/final report。EIO/EACCES/EPERM 經 identity unavailable 包裝、再被 `sample_resource_budget` 字串化後，原 errno 仍在 causes。 |
| observer return/error | exception identity probe 證明向 caller 拋出同一個原 exception；三種 identity I/O 的未觀察與觀察後 sample 字串完全相同。正常 tuple、retry、budget/failure 分類、trace write error 隔離及 previous trace 還原的相關既有測項均通過。 |
| teardown | exact hash 還原確認 observer watching/main/finally 無其他 delta；controller 與 scanner hash 未動。此次沒有新增 handler、launch、close、terminate、cleanup 或 exception-control 路徑。 |

沒有發現本契約內原因漏記。鏈長超過 8 或出現 cycle 時故意截斷且明示，不可宣稱完整保存任意深度鏈；implicit `__context__` 不屬這次 explicit cause-chain 範圍。既有 diagnostic write failure 仍透過 diagnosticErrors 顯示不完整，不轉成成功證據。

## 本次獨立驗證

在 workspace 根目錄執行：

```sh
/Users/matt/ai-core/.venv/bin/python -B PPTSKILL-canonical/evidence/edx-core-3-undo-redo/observer-r2-review-a-recheck-probes.py
```

**9/9 通過，0 error、0 failure、0 skip。** 僅執行 7 個 ObserverTests（含新增三種 errno 的 subtests），加上 2 個窄 probe：cause 長度 0/8/9、自循環/多節點循環與原 exception identity；三種 identity I/O 的 sample 字串前後相同。沒有重跑 controller/host/lifecycle suite，也沒有碰 socket/ps/network 限制。

證據：`observer-r2-review-a-recheck-tests.log`、`observer-r2-review-a-recheck-validation.json`、可重現的 `observer-r2-review-a-recheck-probes.py`。validation 記錄原 receipt、scanner 與三份 harness 在本次 probes 前後 hash 一致。未以主線 14/14 的聲明取代本次獨立測試；本次只宣稱上述 9 項選集通過。
