# 正式 host 首輪停損與一次 bounded retry

首輪 host-acceptance：CODEX_SANDBOX null，readiness0；1280首個產品check之前，resource scanner回 I/O failure，supervisor2，harness Runtime.evaluate timeout，checks0，1600/PGQ未跑。無 Browser.close成功；owned root/marker absent，source6/protected4/ZIP前後MATCH。非產品pass；目前沒有產品 assertion 失敗 evidence。

唯讀定位 AI Core scan_resource_artifacts：scandir/stat/open 的 OSError 被統一轉為 I/O failure，log未保存底層 errno／path，不能裁定真實根因。可由profile動態檔案race、外部I/O失敗等導致，但本輪沒有證據擇一。Chrome allocator/CVDisplayLink/GPU訊息也不夠證明因果。

Mainline一次bounded retry：驗證是否可在新的受管profile正常完成；使用相同product、相同正式入口、sensor／門檻／時序不變，只另存host-retry1，保留首輪。不是修復AI Core或證明I/O根因解除；若同類第二次再無進展即停。不改產品、ZIP、AI Core；不繞fail-closed，不執行第三次自動launch。retry通過只算該輪成功。

## Retry1 有進展：60 checks 後的 harness observer 缺陷

Retry1 的resource/lifecycle正常，Browser.close/supervisor0，owned root/marker absent；1280 base＋S8＋S13共60 checks通過後，`trusted.some(e.key===Escape)`失敗。取消gesture／release後canonical geometry原 assertion 先已通過。reader定位component-interaction document capture Escape→stopImmediatePropagation；harness document bubble觀測器必定收不到。這是具體harness缺陷，與前輪I/O不是同一blocker，原fail完整保留。

候選9b7767d只把S13 pointer/key observer改window capture，使其早於產品document capture，不改runtime、ZIP或原assertion。node --check與diff --check PASS。主線重判：允許一次harness修正後驗收host-harness-repair；不是同一I/O第三次盲launch。若再出現I/O或新failure，保留後停止本輪host，避免擴成重試loop。source初版manifest另存source-hashes-initial.json，最終source-hashes.json綁新candidate。
