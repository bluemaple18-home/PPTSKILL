# Core2 Group/Ungroup＋Lock/Unlock 主線關閉

2026-09-24。產品與 ZIP commit `88f401c7798976babfd28df991a6ba5b6b784e4e`，branch `codex/edx-core-2-group-lock`，base `a3fd195a4a4c5b33ccbe4cccd3c2a8f121c93889`。主線裁決 **Core2 GO / 獨立候選可進 integration gate**；本輪未 merge／push／deploy、未開第3張。

原 Reviewer Ramanujan 的初審 `REQUEST_CHANGES`：GL-R1 P1 原生群組 SE 被 child line 擋住；GL-R2 P2 在 refresh after-effect throw 後未恢復互動投影。兩項在同一 Repair 1 關閉。host05 揭露 minimum resize release 會提交前一個有效 preview，亦在同一 Repair 1 用原生 release pointer 與既有 validator 修復。host01–05 `NOT_PASS` 與原 rollback 1 FAIL 保留原始 evidence。Reviewer targeted CODE GO 及 final whole-card GO，Core2 新／未解 P0=0、P1=0、P2=0、P3=0；原 Crop F2 OPEN／P2 作為第6張的 inherited residual。

主線 fresh full non-browser：79 unique files、995/995 PASS，`nonbrowser-repair1b.tap` 及 exit JSON；`git diff --check` PASS。Reviewer fresh targeted 76/76 PASS；final addendum 為唯讀核對，沒有 fresh browser／PGQ rerun。GL-R2 after-effect rollback 採 synthetic fault injection，未宣稱正常 browser 自然觸發。

host06 固定候選受管 browser：1280×720、1600×900 各 27 check records PASS（含診斷，不誤稱 27 個獨立 cases）。真 marquee、群組 drag/resize、SE hit、trusted `resizeGroupStart/update/end`、minimum 原子拒絕、Escape/pointercancel、lock/unlock、ungroup、export/offline reopen 均有紀錄；兩 viewport console/page/network/HTTP/remote errors 全 0，`targetClosed=true`。Mainline 實際檢視 1280 after-resize 與 1600 locked 截圖：控制列可見、無剪切；固定 geometry 文字內容可能裁切，仍屬本卡不提供自動縮字／避障的既有限制。

四支 affected PGQ 使用 `--test-concurrency=1` 單輪 16 unique PASS。host06 controller readiness、groupBrowser、PGQ、Browser.close、supervisor exit 全 0；診斷 724 scans 無 I/O error，owned root 與 isolation marker 均不存在。source 11/11、protected 4/4、ZIP 在前後核對一致。

ZIP 2,322,437 bytes，SHA-256 `1f8ed872504a5a9f655a52dad2adda52d065e78288eb3d34d698475858dfa2b9`；build／distribution lifecycle PASS，五個主要 source 與 ZIP 內容 byte-match，Reviewer 額外核對 ZIP 74 個 runtime/schema/contracts source byte-match。hostCapabilityStatus=partial 只因本機 Gemini CLI 不在 PATH，不將其宣稱為 Gemini host 驗收 PASS。

證據索引：`source-hashes.json`；`host-acceptance-01` 至 `host-acceptance-06`；`host-controller-06.log`；`distribution-repair1b-lifecycle.json`；`review-initial/REVIEW.md`、`review-repair1/REVIEW.md`、`review-final/REVIEW.md`。四個原 protected untracked 保留且 hash 不變。完成進度 **2/6、剩4張**；下一張 Undo／Redo 尚未開。

13 份原始 TAP／RED log 含 runner 輸出的尾端空白，為保留原 bytes 並通過 `git diff --check`，以 lossless gzip 收存；`compressed-raw-logs.json` 列出原路徑、歸檔路徑、原始 bytes 與 SHA-256。初審 rollback 1 FAIL 的原始 TAP 也在其中，未更寫或刪除其內容。
