# Observer候選之host接續前置

Status：`PREPARED / NOT_EXECUTED`。本輪只讀控制器／diagnostic接點，沒有啟browser或觸發正式host retry。

環境：CODEX_SANDBOX=`seatbelt`；PPTSKILL_DEVTOOLS_ACTIVE_PORT=`null`。AI Core tmp_session.py:16-20先拒絕sandbox browser launch；不得刪除環境旗標或轉用裸Chrome。

已核對原 `host-controller-04.py`：固定canonical AI Core路徑，啟動前verify原 `source-hashes.json`，使用25秒readiness、原resource-observer旁聽器、Undo/Redo兩viewport、四支PGQ串行，finally執行Browser.close／supervisor等待與owned root/marker核對。這些原history檔不能改寫當作新證據。

候選接回後必要delta：

1. 固定新AI Core候選SHA、scanner來源與PPTSKILL `9ce7396` code/ZIP hashes；不得把worktree候選當成已啟用canonical。原control的source-hashes不是最新1061/ZIP候選身份，必須為下一次授權執行建立新manifest，保留原檔。
2. 原 `evidence/edx-wp2-s18/resource-observer.py` 記每個visit/scan的OSError，`check_diagnostic` 要求IO events空。若新scanner合法recover，此斷言會拒絕實際成功的掃描。下次instrumentation須保留每次I/O事件且對應scan return：完整合法counts回傳、unrecovered failure與未完成/unknown分開；不能刪除errors或只看supervisor exit0，且仍不改scanner判定。
3. 在原合法host入口，先做有界readiness／attach／test page／scanner outcome／cleanup，再進固定PPTSKILL browser/PGQ；不先跑全量撞環境。resource ceiling、deadline、no-follow、root/marker與未知I/O停損不變。
4. Code review GO不是host GO。未取得適用canonical整合與host處置證據前，保持HOST_BLOCKED，拒絕把原Host04或舊candidate的GREEN移植。

此文件沒有授權AI Core merge/push/activation，也沒有宣稱scanner候選已修好。
