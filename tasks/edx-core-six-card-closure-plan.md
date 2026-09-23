# PPTSKILL 核心完整版：六張主卡收斂

Status: OWNER_SCOPE_REBASELINE / S18_CLOSED
Owner裁決：收尾既有S18，回到原六項核心交付；不再從局部缺口逐張順延S19、S20。
這是Mainline範圍裁決文件，不是第七張產品實作卡。歷史S16/S17/S18編號與commit不改名、不改寫。

## 已有成果與未完成尾項

已整合main/origin-main：e3b90a8969f6d25416e746feefecba718d8d8931（S17 closure）。
S16實際交付選取文字元件的dialog編輯；S17實際交付雙擊同一元件開既有dialog。兩者不是原規劃的Crop與Group/Lock，不得拿編號代表那兩項已完成。
S18產品candidate：84ea9381cb438491449b6d871fbaeedea5e55b98，delete-element API既有成果保留，不重做。Review卡handoff_20260924_edx_wp2_s18_review.md已READY_FOR_REVIEW；Mainline仍PARTIAL / HOST_BROWSER_PENDING，尚無Independent GO。
第一輪targeted雙viewport各21 PASS；PGQ7/10、supervisor2、resource observation unknown (I/O failure)，缺Browser.close成功。第二輪正式host未跑，診斷只有synthetic selftest。不得把Review卡完成、程式完成或ownedroot消失視為整體驗收完成。
S18產品與診斷方案分開審查；待verdict後只處理bounded finding與必要host gate，保持原權限／capacity／cleanup契約。不得宣稱本文件已授權啟動第二輪browser、merge/push/deploy。S18既有刪除能力歸入下列第2張的asset邊界，不另開第七張。

## 剩餘六張主卡

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
