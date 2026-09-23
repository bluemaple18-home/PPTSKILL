# Host05 控制器摘要補正（不重跑）

固定產品 `2db6185d13a6713700d0186758b1261ff23b9d85`。原 `host-controller-05.py` 與 `host-acceptance-05/controller-receipt.json` 原樣保留，原狀態 **NOT_PASS / controller exit 1**，不改寫為單輪全綠。

Mainline 複製完整 controller 後漏改最終總結欄位：仍取 `cropBrowserExit`／`pgqExit`，實際執行的是 `pgqFailedExit`／`dialogVisualExit`，因此以不存在欄位得到 false-negative。這是本次 Mainline 控制器錯誤，不是產品 assertion 失敗；也不是把 host04 的真實監控中斷解釋掉。

實際 readiness、單一 PGQ case、Evidence dialog visual、Browser.close、supervisor exit 全為 0；136 scans 無 I/O error，owned root／isolation marker 均不存在。20 source、4 protected、ZIP bytes/hash 與固定產品一致。

另以 `host05-offline-verification.py` 重驗已存在的實檔、logs、退出碼、artifact hashes、scanner 與 cleanup；34 個文字 fixtures PASS，包含舊 predicate false-negative 重現、缺欄位／非零／bool／cleanup／integrity 缺漏拒絕，並確認 **host04 仍被拒絕**。結果 `host05-offline-verification.json`；沒有 browser launch、沒有重寫原 receipt，也沒有改 AI Core 或產品。

PGQ 正確計法是 **host04 15 PASS + host05 1 PASS = 16 unique named PASS**，非單輪 16/16。原 host04 NOT_PASS、Browser.close 3、supervisor 2、ENOENT 診斷都保留。此新 ENOENT 不能證明歷史 S8/S18 I/O failure 同因或已修復。

獨立 Reviewer 另核對此 reconciliation 才能出整卡 verdict，Mainline 的離線 PASS 不代替獨立核對。
