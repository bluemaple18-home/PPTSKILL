# Core3 fixture 修復：正式 host 驗收

日期：2026-09-29。**HOST_ACCEPTANCE_PASS / VISUAL_PASS / RECOVERY_NOT_OBSERVED**。本輪唯一一次正式host，未重試；原owned-group歷史驗收另存，不覆寫。最終whole-card裁決另见上層visual-fixture-closure.md。

## 結果

- 雙viewport1280×720、1600×900各12/12 PASS（原11功能＋fixture視覺1）；page/console/network/http/remote errors空，targets正常關閉。主線與兩Reviewer均直接看本輪四PNG，GREEN標題完整、A/B可見且不遮擋。
- 真browser負控制：只把A/B暫移回120，兩viewport均因兩個title-overlap被拒；finally恢復完整已量測狀態，title/rightquote measurement不變。600位置兩交集面積均0。這是固定fixture矩形/CSS可見性gate，不是通用glyph ink或OCR保證。
- 四支PGQ串行16/16、0fail/skip/cancel，raw exit0，duration708396.900292ms。
- supervisor/client/browser/Browser.close均0。outer PGID40646，browser40647、client40648；兩者同群組，沒有第二cleanup authority。
- 705 scans＝704 runtime＋1 cleanup，全部COMPLETE；journal end與diagnostic逐筆全等，無unfinished或diagnostic errors。峰值31942419bytes／751files，保留原64MiB／10000／3600。
- 本輪未遇ENOENT，**RECOVERY_NOT_OBSERVED**。前次host-acceptance-owned-group的scan533真recovery仍是獨立歷史證據，不當本輪結果、不擴稱精確R1 path重播或compliance。
- owned root `/private/tmp/aic-b-aa9e394e826f4f6cb1ecb7e0e365dc91`、isolation marker均不存在；host收尾及主線fresh全ps核對matches=[]。
- before/after與主線current identity相等：AI Core71b774d3與六檔SHA、產品75、protected4、ZIP全部未变。原兩repo六份untracked bytes保留。

完整數值、39份raw的bytes/SHA索引見mainline-verification.json。執行入口為上層host-controller-visual-fixture.py --run-core3-acceptance，FINAL manifest SHA為86d152ec279438e83bf2e95715f9b393c8da54549f15ffee0580e40bbc48c7a6；原始client、process、scanner、PGQ与acceptance檔全部保留。

## 失敗與限制誠實記錄

主線第一次postflight唯讀核對在sandbox呼叫ps被Operation not permitted拒絕，尚未寫verification；改用正式唯讀host權限後核對完成，沒有重跑host或改raw。這是核對權限限制，不是產品/scanner失敗。瀏覽器全程序stderr照存；產品error arrays空不代表Chrome背景訊息全空。

既有receipt I/O退出碼P2與Crop F2/P2維持非阻塞/原狀，不藉本輪宣稱修復。產品／字體／ZIP未改，沒有merge／push／deploy／production／Core4。
