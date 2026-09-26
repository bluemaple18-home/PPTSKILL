# Core3 observer ENOENT：有界重播

Status: `DIAGNOSTIC_REVIEW_PASS / AI_CORE_DECISION_REQUIRED / HOST_BLOCKED`

目標：承接Owner「繼續」，把既有observer診斷的缺口收斂為可重播證據。產品candidate `9ce7396`、code `f3d8a11`維持CODE GO；本卡不改產品，不是新Repair generation。

範圍：一份PPTSKILL evidence診斷腳本，read-only import AI Core原scanner，以少量短命temp fixture在entry列舉／stat／open邊界精準注入單一檔案動作。先一條require-complete命令證明同ENOENT stop，再加穩定control、rename、symlink替換、目錄消失、unknown I/O與budget反例。只證明scanner如何反應，不推論Host04原entry類型或新放行政策。

驗收：固定AI Core HEAD/source SHA與PPTSKILL reviewed code/ZIP/protected身份；真實stat返回的errno與phase可分辨；control成功、各反例維持現行fail-closed；temp root清除；原scanner未改；保存RED command與matrix原始結果。缺適用host修復仍BLOCKED。

分工：Mainline可直接完成單檔有界診斷；不另起Worker／review迴圈。CodeGraph已定位sample_resource_budget→scan_resource_artifacts→visit及cleanup共用接點。

禁區：不patch／fork canonical scanner、不修改AI Core或安全契約、不catch-all忽略ENOENT、不放寬budgets、不啟browser／PGQ、不merge/push/deploy、不開Core4。下一步若需變更scanner政策，交AI Core owner依原handoff裁決，不能以本卡自動授權放行。

結果：原scanner的ENOENT完整觀測失敗已重播（exit1）；8案contract診斷完成（exit0），包含rename後資料仍存在的漏算反例。不是host PASS。詳 `evidence/edx-core-3-undo-redo/observer-race-receipt-20260926.md`；原產品與scanner均未改。下一步在AI Core原handoff內裁決恢復策略並取得fixed SHA/host證據，不能盲目重跑PGQ。

獨立review：2026-09-27 Owner交回447ce01 review，8/8診斷、RED exit1與身份/清理核對，未發現阻塞問題。此卡診斷範圍審查完成；Host04根因及恢復策略仍未驗收。詳 `evidence/edx-core-3-undo-redo/observer-independent-review-20260927.md`。
