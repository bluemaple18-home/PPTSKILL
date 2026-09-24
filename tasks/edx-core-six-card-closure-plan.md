# PPTSKILL 核心完整版：六張主卡收斂

Status: CORE_1_CLOSED_WITH_P2_RESIDUAL / CORE_2_CLOSED / FOUR_REMAINING
Owner裁決：收尾既有S18，回到原六項核心交付；不再從局部缺口逐張順延S19、S20。
這是Mainline範圍裁決文件，不是第七張產品實作卡。歷史S16/S17/S18編號與commit不改名、不改寫。

## 開卡時歷史狀態（已由下方接續裁決取代）

已整合main/origin-main：e3b90a8969f6d25416e746feefecba718d8d8931（S17 closure）。
S16實際交付選取文字元件的dialog編輯；S17實際交付雙擊同一元件開既有dialog。兩者不是原規劃的Crop與Group/Lock，不得拿編號代表那兩項已完成。
S18產品candidate：84ea9381cb438491449b6d871fbaeedea5e55b98，delete-element API既有成果保留，不重做。Review卡handoff_20260924_edx_wp2_s18_review.md已READY_FOR_REVIEW；Mainline仍PARTIAL / HOST_BROWSER_PENDING，尚無Independent GO。
第一輪targeted雙viewport各21 PASS；PGQ7/10、supervisor2、resource observation unknown (I/O failure)，缺Browser.close成功。第二輪正式host未跑，診斷只有synthetic selftest。不得把Review卡完成、程式完成或ownedroot消失視為整體驗收完成。
S18產品與診斷方案分開審查；待verdict後只處理bounded finding與必要host gate，保持原權限／capacity／cleanup契約。不得宣稱本文件已授權啟動第二輪browser、merge/push/deploy。S18既有刪除能力歸入下列第2張的asset邊界，不另開第七張。

## 原六張核心主卡（完成進度見最新接續裁決）

| 順序 | 交付主題 | 收斂邊界 |
|---|---|---|
| 1 | Crop＋Evidence圖片安全裁切 | 同一asset authority；Evidence正確性guard、export/reopen保留 |
| 2 | Group/Ungroup＋Lock/Unlock與剩餘asset邊界 | 既有插入/替換/刪除成果直接沿用；S18只收未完驗收，不重新開發 |
| 3 | WP3-S1：operation-level Undo/Redo | 沿既有operation authority，不另造editor/document model |
| 4 | WP3-S2：Local draft＋recovery | 能力存在才宣稱保存／恢復，缺能力truthful degrade |
| 5 | WP4-S1：Reset/Recompose＋人工override preservation | 重設／重排的明確範圍與人工修改保留契約 |
| 6 | Final Closure | migration/reopen/recipient/full regression/ZIP/browser整體收尾 |

順序是目前主線基準；各卡開工前再確認依賴與最小驗收，不預先宣稱所有架構決策已解。
「六張」是六個完整交付主題，不是六張API卡後再逐張補UI/adapter/doubleclick/browser卡。每張包含必要產品路徑、測試、browser/export證據與review修復；host/review文件屬同一主卡驗收附件，不增加產品Slice。
已有code與evidence優先重用；不因便利、完善或其他backlog存在而自動加scope。若實測出無法在此六項內解決的必要阻斷，Mainline須說明證據與影響並取得Owner範圍裁決，不能靜默增卡。

## 原始停止點（已由下列收尾取代）

S18保留固定candidate及待審卡，產品程式／ZIP不改；等待既有獨立review交回。主線以本六項為收斂基準；本次不開新的產品卡、不重跑host、不merge/push/deploy。

## 2026-09-24 接續裁決

S18 Mainline產品review GO、正式host21+21／PGQ16／cleanup全PASS，diagnostic Repair1原Reviewer複審GO。詳evidence/edx-wp2-s18/mainline-closure.md；歷史內容不改寫。下一frontier為第1張Crop＋Evidence安全裁切，六張數目不變。未merge/push/deploy。

第一張已啟動：tasks/edx-core-1-crop-evidence.md；branch codex/edx-core-crop-evidence，base01e89d1。只在同一卡先完成Crop/Evidence契約mapping，不把它算第七張。

## 最新接續裁決：第一張已完成，剩五張

S18先完成Mainline完整產品review與正式host收尾；native產品review範圍仍是rollback/reentry局部，不擴張成native全產品Independent GO。其診斷Repair1另經原Reviewer targeted GO。

第1張Crop＋Evidence已完成：Product2db6185；Independent whole-card GO with residual，P0/P1=0、P2=1。完整receipt為evidence/edx-core-1-crop-evidence/mainline-closure.md。原六卡目前 **1/6完成，5張剩餘**；下一張Group/Ungroup＋Lock/Unlock尚未開工。

第6張Final Closure沿用本次F2 OPEN/P2紀錄：after-side-effect teardown throw可能遺失observer/load ownership，沒有普通browser觸發證據。到時先重判風險／驗收，並非預先授權Repair2；不因此增第七張或開S19/S20。既有S18安全刪除直接復用。所有變更仍在本地分支，未merge/push/deploy。

## 第2張啟動

Owner回報第1張已整合推送；本輪本機main/origin-main均a3fd195a4a4c5b33ccbe4cccd3c2a8f121c93889，四個protected檔案保留。第2張以tasks/edx-core-2-group-lock.md為唯一新主卡，branch codex/edx-core-2-group-lock；包含Group/Ungroup、Lock/Unlock及必要UI／export／驗收，不拆新主題。核心完成進度仍1/6，剩5張。原P2留在第6張；本輪未授權merge/push/deploy。

## 第2張關閉

產品／ZIP `88f401c7798976babfd28df991a6ba5b6b784e4e`；同一 Repair1 後獨立 whole-card Review GO，Core2 P0–P3 全 0。Mainline full non-browser 995/995、雙 viewport 各27 check records PASS、PGQ單輪16/16與受管清理 PASS；詳 `evidence/edx-core-2-group-lock/mainline-closure.md`。原六張目前 **2/6完成、4張剩餘**。原 Crop F2 OPEN／P2 繼續留第6張。下一 frontier 為第3張 Undo／Redo，尚未開工；Core2 停在獨立分支，未 merge／push／deploy。
