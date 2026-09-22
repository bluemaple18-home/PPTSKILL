# PGQ host observation stop

Root question：S8 affected PGQ 是否通過。Candidate 0b4c7bd，source9/protected4/ZIP MATCH；不改任何產品。

正式首輪雙viewport50+50通過後，串行PGQ第一個具名case PASS；第二支top-level setup的normal producer unsettled await，後續ECONNREFUSED/JSON截斷。AI Core launcher stderr 明確為 `NO_GO: resource observation unknown (I/O failure)`，supervisor exit2、owned root實際absent、marker absent，before/after hashes相同。這不是產品assertion失敗，也不能當PGQ PASS。Node summary 1/4中的兩項為setup失敗檔案，非完整16具名case。

查既有tmp_artifact_lifecycle.py resource observation：此訊息來自掃描流程OSError後fail-closed；log未保存底層errno或entry，不能斷言是Chrome ephemeral-file race、scan-limit、容量不足或特定filesystem問題。假說H1：該次profile觀測瞬時I/O；H2：持續host/permission/filesystem異常。既有fail-closed行為保留，不修改AI Core/sensor/Rule24。

Mainline裁決：沿使用者「推上去 繼續／繼續」的S8開發驗收授權，只做一次獨立managed session的四支PGQ串行重驗，略過已PASS targeted，fresh admission/readiness/cleanup均不變；相同I/O再現即停，不做第二次盲retry。此probe辨識是否持續，不能證明特定底層根因已修復。成功亦保留首輪FAIL與限制。沒有新增browser裸啟動或unset sandbox。
