# Reviewer A — Repair1 journal closure

**GO：原 journal 單點反例已修復。** 這是同反例的窄域 closure，不重新裁定 ownership 全 scope、host 或 whole Core3。原 `1829f1ab` 的 CODE GO／非阻塞 P2 receipt 與 probe 完整保留，未追改原裁決。

固定候選：`996492481144e92775780ce932661e38779cdddc`，同 checkout，parent review base `1829f1ab`。

| 檔案 | SHA256 |
| --- | --- |
| `scripts/tmp_session.py` | `6a3853ec0fec97ad5718d9a36acdea7fbfc0a4dbf94eff2bb2812b8992a5121d` |
| `tests/test_tmp_session_browser_command.py` | `2c67040631fce3359bc61bd0893ac9b07be4b2e35a8396c8ec1a5e0b58324176` |
| `docs/tmp-session-lifecycle.md`，未改 | `1852e379023ecf23589e31377b81cb8bec20e2650ae3591930795b2da5c79a89` |

## Delta 判定

僅增加 `failed=False`、caught OSError 設 `failed=True`，以及成功 return 需 `not failed`。browser/client 已觀察非零仍由原 `code` 分支優先返回，不被通用 exit 2 蓋掉；原 finally、ordinary stop、外層 group/signal/cleanup 接線均無 delta。docs 無差異。`git diff --check 1829f1ab 99649248` 通過。

**Spec：PASS。** 單次 journal OSError 後恢復写入，不能因兩個 child exit 0 而回成功。**Standards：PASS。** 三行局部修正，不新增 supervisor、重試或 lifecycle；未改原始非零優先序。

## Reviewer fresh 窄域驗證

```sh
/Users/matt/ai-core/.venv/bin/python -B PPTSKILL-canonical/evidence/edx-core-3-undo-redo/browser-command-ownership-review-a-repair1.py
```

結果：**1 個新增 unit test／6 個 subcases 全通過，0 error/failure/skip；原反例 replay 通過。**

| 單次 journal fault | client / browser 原退出碼 | 修正後 return |
| --- | --- | --- |
| ENOSPC、EIO 各一次 | 0 / 0 | 2 |
| ENOSPC、EIO 各一次 | 7 / 9 | 7 |
| ENOSPC、EIO 各一次 | 0 / 9 | 9 |

原 Reviewer probe 的第五次 journal append/open 單次 ENOSPC 亦照原樣重播；只將記憶體中的預期 return 由 0 改為 2，沒有改寫原 probe。結果仍留 session error、仍無 client exited 記錄、browser exited 記錄保留，**return 現為 2**，不再假成功。

fresh 證據：`browser-command-ownership-review-a-repair1.log`、`.json`、可重播 `.py`。JSON 保存候選檔與原 A evidence 前後 SHA；全部不變。CodeGraph 沿用本 session 同 checkout 無索引的已知結果，未重掃／重建索引。

未執行任何 host/browser/PGQ/process fixtures，所有 Popen 均 mock；未重跑其他 unit suite。Mainline 正式 browser*.py 15-case 執行中的資訊沒有用來宣稱本 reviewer 已驗證其結果。未读 B 本輪結果。

本 closure 僅對固定 `99649248` 解決原 P2；原候選歷史評語不變。完成後停寫。
