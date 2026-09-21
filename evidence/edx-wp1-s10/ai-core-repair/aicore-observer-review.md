# AI Core bounded observer repair 獨立 review

Verdict：GO（bounded code repair）；一項非阻塞 P2 文件／回歸測試缺口，未發現 P0/P1/P3。不是 PPTSKILL S10 實際重跑驗收。

範圍：/Users/matt/ai-core，相對 base 2d78d8e18d42156f43f12f0ebc6997914ec64328 的 scripts/tmp_artifact_lifecycle.py、tests/test_tmp_artifact_lifecycle.py、docs/tmp-session-lifecycle.md 三檔 working-tree diff。CodeGraph 已先查詢 scanner 與相依關係。

實際 diff SHA256：65cf29d87bd322b54d5a9553c090da127505e7d52c43b395eab814f77cf23907
指紋命令：git diff --no-ext-diff --binary 2d78d8e18d42156f43f12f0ebc6997914ec64328 -- scripts/tmp_artifact_lifecycle.py tests/test_tmp_artifact_lifecycle.py docs/tmp-session-lifecycle.md
開頭／結尾重新取得 diff，cmp 一致；git diff --check 通過。

## Finding

[P2] docs/tmp-session-lifecycle.md:44 低估跨掃描的持續超額偵測延遲。

檔案在本輪 stat 後增長，第一次掃描會沿用已讀到的舊大小；完成後再等待至少一秒，下一輪才有機會讀到新大小。若下一輪到達該檔案也較晚，偵測延遲包含本輪剩餘時間及下一輪掃描时间，不能把 1+5 秒當成最長掃描窗下的整體延遲。獨立 probe 使用真實 scanner、兩個真實暫存檔與虛擬 monotonic/scandir 時序，兩次掃描各 4.8 秒，第一輪讀過 a 後令 a 從 0 增為 2 bytes（上限 1 byte）；第二輪較晚才到 a。真實 run_child 控制流在 10.65 秒發送 TERM（process／signal 均 mock，未啟動 child 或 Chrome）。

建議：明確拆分「掃描開始前已存在的超額」與「掃描中已讀 entry 隨後增長」；後者在可完整觀測、正常 syscall 返回等假設下，保守容納約 2×5+1 秒及排程開銷。非原子掃描及短暫尖峰仍不提供硬上限。補充兩次掃描 mutation 回歸測試。Confidence：高。此為本次更新的延遲說明不精確，非既有 generic limit 自動否決理由。

## 驗證

15 個 targeted scanner tests 通過，包含新增 6 tests、既有 large/default/final-close/None-limits/unknown/byte-file tests。為遵守不 commit 與唯讀要求，僅所選的獨立 scanner 測試略過共用 setUp（原 setup 會在 tmp fixture 建 git commit）；各測試本身的 TemporaryDirectory、assertions 與 patch 保留。所有 fixture 置於 /tmp；無 fullsuite、無 repo 修改、無 Chrome、無 commit/push。

額外 probe 通過：
- 僅寫 browser metadata 而未登記 OWNED_ROOTS，仍 100ms。
- 已登記 browser 在恰好 5.0 秒 before_stat 拒絕；entries 恰達 1025/1024 且同時 deadline，診斷 reasons=deadline,entries。
- browser open/scandir/final-close OSError 均轉 unknown I/O。
- supervisor 虛擬時間：TTL=1、掃描耗時4.9，TERM 在4.95、回2。
- supervisor signal：TERM在0即轉送；掃描4.9後再等待1秒才KILL（5.9），回143。
- 已觀察 child exit=7，不被掃描中的 resource failure 覆蓋。

來源 evidence launcher.stderr 實讀：deadline 123.794ms/100ms、297/21024 entries、9369886/67108864 bytes、222/10000 files；屬部分掃描結果，不能證明剩餘全樹一定在5秒完成。

## 安全與限制

Spec axis：browser 採既有5秒窗；一般 small sandbox保留100ms，max_bytes >1GiB原分支不變。採 process-local OWNED_ROOTS 標記，不读取磁碟 metadata 以取得較長窗。deadline >= 與 entries > 比較不變；completion 檢查仍在 root descriptor close 後；unknown/I/O/symlink與special-entry白名單不變。byte/file/TTL/reserve/ownership/TERM/KILL程式未改動。

Standards axis：未見阻塞 regression；新增測試未涵蓋上述跨掃描 mutation，以及較長窗下 supervisor 時序，後者以本次獨立 mock probe 補驗證但尚未成為 repo 回歸測試。

延長掃描會增加可持續寫入的時間、TTL執行超時及signal後KILL升級等待；它是取樣停損而非配額。原signal handler仍即時轉送signal，首signal及child exit優先序保留。cleanup沿用count_artifacts(root)無limits路徑，不新加5秒限制；cleanup與證據匯出仍不在TTL內。同步I/O阻塞仍無硬時間保證。

uv run在此主機system-configuration初始化panic；改用既有uv管理的.venv/bin/python執行，未下載或安裝。probe使用虛擬時鐘、模擬process/group收斂，不能取代真實OS TERM/KILL整合測試。未重跑Mainline的112tests，也未重啟S10。收尾發現Mainline新增一個.work目錄；未讀寫該目錄或既有logs。

重現：TMPDIR=/tmp PYTHONPATH=/Users/matt/ai-core PYTHONDONTWRITEBYTECODE=1 /Users/matt/ai-core/.venv/bin/python -B /tmp/aicore-observer-review.py

附件：/tmp/aicore-observer-review.diff、/tmp/aicore-observer-review.py、/tmp/aicore-observer-review.out。
