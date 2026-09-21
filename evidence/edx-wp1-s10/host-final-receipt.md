# S10 host acceptance：blocker 處理完成

狀態：**HOST_ACCEPTANCE_COMPLETE / READY_FOR_MAINLINE_DECISION**。
Product SHA：`902671238980941b321179a4df37e4d867733f14`；接手 checkpoint `209ee3bcf8491d9db5a11d7b51f52c1879bad296`。S10 程式／測試／harness／ZIP 未改。本輪不代做產品 Independent GO 或 closure，不 merge／push／deploy、不開 S11。

## 實測原因與修復

舊 generic `scan limit` 無法區分 deadline 與 entry limit。先只補診斷，維持原時限與所有資源閘門；3 RED→GREEN、109 tests PASS。Owner 在前次停止 receipt 後要求「你處理這件事」，因此進入新觀測／修復 scope，沒有靠換 profile 或 Slice 名稱重置原失敗紀錄。

`scan-diagnostic-observation/launcher.stderr` 真實重現：**deadline 123.794ms > 100ms**；當下 **297/21024 entries、222/10000 files、9,369,886/67,108,864 bytes**。這些是停損當下部分累計，不宣稱完整目錄總量；已確認這次觸發原因是時間窗，不是已觀察到的容量或計數超限。

AI Core 修復 commit：**`e155b3abeabe45c2442bcf86c30236237c84ffaa`**。

- Registered browser layout 沿用 scanner 既有 **5 秒 bounded 觀測窗**；一般 sandbox 仍為 100ms，large-profile 原 5 秒分支不變。
- byte/file/TTL/host reserve/entry/depth/ownership/special-entry/TERM-KILL cleanup 程式或預算未改，Rule 24／Foundation sensor／policy JSON 未改。逾時、超額、unknown 仍 fail-closed。
- 精確診斷包含 reasons、elapsed/timeout、entries、bytes/files、phase。
- **這是 browser 觀測時間契約調整**：同步掃描會延後 TTL 停損及 KILL 升級。跨兩輪 stat 後增長，應容納約 **11 秒＋排程開銷**；不是磁碟硬配額，阻塞 syscall 不受硬時間保證，不宣稱 scan-limit 從此不會再發生。
- Runtime 修復完整離線 regression **112/112 PASS**；Reviewer 指出文件 P2 後只改文件並補跨掃描 mutation test，該新增測試 fresh PASS。不是 113 項單輪 fullsuite。
- Clean native Reviewer Anscombe：初輪 GO、1 個非阻塞文件 P2；targeted re-review **GO，原 P2 關閉**。15 項 targeted 與額外 safety probes 通過。正常 commit hook PASS，未跳過檢查。

Review、closure、commit log 與來源 hashes 保存於 `ai-core-repair/`；AI Core 原卡為 `.work/CARD-AICORE-S10-SCAN-WINDOW-20260921/`。其既有兩份 dirty logs 再驗 hash 未變，不納入提交。工具 GO 與下列產品驗收分開判斷。

## 兩件驗收結果

### 1. S10 雙 viewport browser

沿用已取得的 fresh `host-acceptance/distribution/acceptance.json`：1280×720、1600×900 各 **13 checks PASS**（10 base + 3 S10 aggregated）。真 multi-select 三項→horizontal→vertical→selection retained→export/offline reopen，errors/remote 全 0、targetClosed=true。這組在工具修復前完成，本輪沒有把它冒稱為修復後重新跑過；產品／harness source hashes 一致。

### 2. 四支 affected PGQ

修復後 `repaired-host-pgq/affected-pgq.log`：四支使用 `--test-concurrency=1` **單輪 16/16 named PASS**，fail/skip/cancel 全 0，約 699 秒。content-integrity、sample-approval、full-deck-qa、required-visibility 全覆蓋，不借用早期部分 PASS 湊數。

`repaired-host-pgq/controller-receipt.json` 鎖定 AI Core commit 與 scanner SHA；readiness／PGQ／Browser.close／supervisor 全 exit 0，沒有再發生 scan-limit。Owned root `/private/tmp/aic-b-190f0ea9d2764dcbb62d1793f8d9e17d` 已回收、isolation marker absent；收尾實檔再核對不存在。

## Integrity 與歷史

`host-final-verification.json`：S10 source **11/11 MATCH**、protected **4/4 MATCH**；ZIP **2,282,450 bytes**，SHA-256 **`664bc72f696e21d1d5ca891506411c737ff7f114c891658d7d5670e8b06ebd64`**，未重建。AI Core runtime 與修復 commit 相符。

`host-acceptance/`、`pgq-only-retry/`、`scan-diagnostic-observation/` 的所有 FAIL、traceback、scan-limit 與 cleanup 證據都保留；舊 `host-receipt.md` 是修復前停止狀態。新 PGQ PASS 不覆寫它們，也不表示舊 supervisor exit 2 曾經 PASS。

下一步：交回 Mainline 裁決與整理 S10 Independent Review handoff；產品還沒有獨立 review verdict。本 receipt 證明要求的 host-runtime 工作已完成。

保存 diagnostic PGQ log 時只清除兩行尾端空白以符合 diff check，錯誤內容與結果未改。
