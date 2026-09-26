# R1 targeted review：CODE GO

reviewedSHA：`8e6094582547205db70f6dccce369d694f50154b`；parent/base：`c3724ce6b9e2584b9a25a41bf617edf818011e26`。三個 delivery 檔的工作樹 SHA256、Git commit blob SHA256 與交接值全部一致，完整值見 verification.json。worktree clean；完整 R1 diff check exit0。delivery delta 只有 scanner/tests/docs，其餘均為本候選的 R1 evidence。

範圍僅原 P1（首次 fstat／replay fresh stat 超額遺失）、P2（首次 fstat nlink 遺失）及修復直接回歸。不增加一般 review、效能重構或另一修復鏈。已先以 /Users/matt/ai-core CodeGraph 查 scanner/sample/caller 邊界，再核對候選 delta；沒有以 canonical source 當作修復版本。

## 原 findings 的閉合

- **P1 CLOSED**：`scripts/tmp_artifact_lifecycle.py:1150` 在 regular fresh stat（含 replay）取得樣本後即查 ceiling；`:1153` 保存完整首次 fstat，`:1156` 立即查 ceiling。原 observed_peak／replay_peak 現均以 `bytes=128/64` 拒絕，沒有等待後續縮檔。這些檢查不累加 totals，正常 entry.stat 仍只計一次。
- **P2 CLOSED**：`:1161` 將 opened.st_nlink 納入 ENOENT 恢復資格。原 transient_hardlink 的首次 fstat=2 現在一次列舉即拒絕；正常無 race 的硬連結仍允許依 entry 計數。
- **同 P1 remaining 接點通過**：`:1202` 保存找回 entry 的已計大小／路徑，`:1218` 以 `total_bytes - found_size + remaining_size` 查 ceiling，files 不加一；found 是 tuple，零長度檔仍能正確辨識。未改回傳計數為原子快照。

本限定範圍未發現殘留 P0/P1/P2/P3 finding；原 c3724ce6 的 NO-GO 與 corrections 均保持原 bytes。新 verdict 僅適用本 R1 SHA。

## Reviewer fresh 證據

1. `fresh-suite.raw.log`：**50/50 PASS，3.351 秒，exit0**。完整原47＋新增3選集，包含 Python sleep unit；没有 PGQ。不是引用 Writer/Mainline 測試結果。
2. `original-probe.raw.jsonl`：原 probe.py 未改，**18/18 符合契約，exit0**，原三個反例正確拒絕。全18情境 descriptor open/close 多重集合相符。
3. `direct-probe.raw.jsonl`：**5/5 符合契約，exit0**。獨立生成真實 fixture、以系統呼叫真實 metadata 控制時序，沒有偽造 stat 結果。覆蓋已掃 sibling=64 bytes、同 parent prefix=8 bytes，加找回檔的末端 fstat：
   - 初始找回8、remaining16、cap87 → 拒絕 `bytes=88/87; files=3/3`。
   - 相同樣本、cap88 → 允許，回 `(80,3)`，無雙算；sample 取得後已恢復檔案到8 bytes。
   - remaining 縮至0、cap80 → 回 `(80,3)`，不負計數或重加files。
   - 找回檔0 bytes、cap72 → 回 `(72,3)`，不誤判未找回。
   - 正常 hardlink nlink2、cap88/files4 → 回 `(88,4)`，不擴大拒絕範圍。
   五例 descriptor 全部關閉。

精確命令見 commands.md；各 raw 的 exit code 與 source/history 身份見 verification.json。本輪 fixture 已全清；僅殘留 git 工具的 xcrun_db cache，已隨專屬 fixtures 目錄刪除。原 receipt、corrections、probe.py hash 前後一致。candidate/canonical/PPT產品均未修改；未啟 Chrome/PGQ、merge/push/activation。未將有界測試推論為所有競態皆已驗證。

## 保留限制

**HOST_BLOCKED / NOT_ACTIVATED**。此為 targeted CODE GO，不是 whole-card GO，也沒有證明 Host04 修復。flat regular-only parent、singlelink、fresh stat/open 成功、同 parent 找回、原 deadline／累計 entry 邊界仍保留；cleanup/nonbrowser 沿既有拒絕契約。正常掃描成本及 Host04 適用性仍需合法 host 證據，R1 未新增效能評測。

初輪主線小 fixture 成本（6.92x／8.29x）只作歷史採用風險，不視為本 R1 fresh 效能結果或真 Chrome 效能。無需為本 verdict 擴效能修復。Mainline 可依此固定 SHA 的 code 裁決處理後續既有程序；本 Reviewer 沒有授權或執行 activation。
