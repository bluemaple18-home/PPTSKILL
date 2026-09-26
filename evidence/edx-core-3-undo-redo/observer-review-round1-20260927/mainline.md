# 獨立 review 與主線重播

Reviewed candidate：c3724ce6b9e2584b9a25a41bf617edf818011e26，CODE NO-GO，P1 1／P2 1。

主線 fresh 重播原 probe：18 cases，15 符合契約；transient_hardlink／observed_peak／replay_peak 三例失敗，exit 1，全部 descriptor 關閉。原 raw 見 ../observer-review-mainline-replay-20260927.jsonl。上列 gzip 為原 Reviewer 檔案原 bytes 保存；manifest 記錄原 SHA。

事實更正：Reviewer 46/46 是實際選集；其排除 slow_resource_scan 測試的理由有誤，source:770 只啟動 Python sleep，不是 PGQ。原47選集不構成 browser／PGQ 執行。本更正不影響三個反例或 NO-GO。

交原 Writer 做本卡唯一一次 bounded repair，固定後交原 Reviewer targeted re-review。候選尚未啟用，canonical AI Core／PPTSKILL delivery 不改，HOST_BLOCKED 維持。
