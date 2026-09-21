# S7 主線正式 host targeted 重驗

狀態：TARGETED_PARTIAL_PASS / ENV_BUDGET_BLOCKED；不是完整TARGETED_PASS、S7 GO或Independent GO。Owner最新「授權」明示覆核一次host Chrome + targeted harness + cleanup；已執行並消耗，没有第二次launch。

## 結果

正式host CODEX_SANDBOX=None；14 sources +4 protected hashes前後MATCH。使用既有tmp_session.py browser與canonical Chrome executable，未改AI Core/Rule24/Foundation sensor/容量政策。logical-line monotonic controller在18次poll後exit0，readiness正式通過。

1280×720：normal/reduced/static各5 checks，共15 PASS。包含normal motion起終點、reduced/static內容終態、canonical proxy、SE handle/hit、control transform、真drag/resize preview不改spec與release提交、export/reopen。控制框transform為matrix(1,0,0,1,803,283)，不再歸零。三模式console/page/network/HTTP/remote皆無錯誤，viewport targetClosed=true。subtitle ::after只有當前fixture computed style none證據，不擴張為所有text treatment的PGQ驗證。

1600×900：尚未完成normal case；受管supervisor報NO_GO: runtime budget exceeded並exit2，CDP Emulation.setEmulatedMedia逾時，finally HTTP close連線也失敗。receipt status fail屬本次驗收未完成，沒有出現產品geometry assertion失敗，不能報1600PASS。

## 環境裁決

唯讀核對tmp_artifact_lifecycle.py resource_usage分支：runtime budget exceeded在bytes或file count超過上限時產生，並非readiness timeout或TTL。當前既有預設64MiB／10000entries；原始輸出未記實際計數，因此不能斷言究竟是哪一項、哪個profile檔案。root已回收，不再事後猜測。

不提高預算、不改sensor、不再launch；後續環境處理應先保留超限的bytes/files類別及有限計數證據。若評估既有chrome-bounded.sh的background networking/component update限制，只能作減少非驗收活動的候選方案，不宣稱已證明消除超限。

## Cleanup及證據

supervisorExit2；owned root已不存在、isolation marker不存在，主線再次核對。1600 target未單獨close成功，但browser/profile由supervisor整體回收；不得把兩者混寫為全targetClosed。無活session待接管。

controller-receipt.json、readiness.stderr、launcher.stderr、lifecycle/evidence、targeted/acceptance.json、mainline-summary.json保留原始結果。未重建ZIP／commit／merge／push／deploy，四保護檔未動。
