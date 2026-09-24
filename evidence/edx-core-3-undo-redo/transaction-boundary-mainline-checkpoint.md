# Core3 交易邊界 Mainline checkpoint

Status: `NON_BROWSER_GREEN / CANCEL_RE_REVIEW_PENDING / HOST_OBSERVER_BLOCKED`
Code SHA：`f3d8a11865a5af25f34a08a5b65dccb3fed6914f`。目前仍不能標 Core3 whole-card GO／closure。

最新交付：code `f3d8a11` 修取消投影；Writer新增5/5、focused160/160、full1061/1061（81檔、0 skipped）。主線fresh ZIP lifecycle PASS、75/75 byte-match、protected4/4及歷史hash一致。ZIP **2,329,758 bytes**，SHA256 `862bb19f82b10fab9a244a1c334fed1f39b6edc1ad5c5ff95aebe3cc04daf290`。詳 `transaction-boundary-r07-writer.md`／`transaction-boundary-r07-mainline-hashes.json`。獨立targeted re-review pending，不能宣告GO。Observer唯讀診斷另見 `observer-zoom-out-20260924.md`。

歷史裁決：packaged `2f134de` round-07 一名GO、一名NO-GO。原兩項P1關閉；新增取消投影P1，主線四組fresh重現，見 `review-round-07.md`。以下待重審文字為交付時狀態，已由本裁決取代。

## Round-06 repair交付紀錄

前封包 `b35336d` 的兩名 verdict 為一 GO、一 NO-GO；主線重播兩個 P1，見 `review-round-06.md`。本批修復 public layout mode 與 operation handler 終態副作用回退，未抹掉前次失敗。

- Writer fresh：targeted **12/12**、affected **153/153**、81 檔 full non-browser **1056/1056 PASS**、0 skipped。主線核對原始 TAP 與來源 hash，沒有冒稱主線 fresh full rerun。
- Mainline fresh：ZIP build/lifecycle PASS；75/75 runtime/schemas/contracts byte match、protected 4/4 MATCH、歷史 evidence hash MATCH。
- ZIP：**2,329,448 bytes**；SHA-256 `65534796efd020a434f59d8121a1de09ced2af9db6dd9b945b29fc87323189b1`。
- 詳證：`transaction-boundary-r06-writer.md`、`transaction-boundary-r06-validation.json`、`transaction-boundary-r06-mainline-hashes.json`、`transaction-boundary-r06-distribution-probe.json`。
- 新 code 尚無 independent GO；整卡仍 HOST_OBSERVER_BLOCKED，Crop F2/P2 residual 保留。

以下為前輪歷史（e6f9afa／b35336d），不代表最新候選已通過 review。

## 實作與保留紀錄

本輪 Owner 在 zoom-out 結論後要求繼續。乾淨上下文 native Writer，shared sequential single writer；工具未提供 GPT-5.5 lane，繼承當前可用模型。兩個既有 runtime 承擔同步 owner、private 內部 executor、gesture checkpoint／可驗證回退。Node／portable public mutation 重入拒絕；純 UI／viewport／pointer observation 保留 bounded guard；真正寫入才建立 rollback snapshot。既有 patch text-sync、取消／stale release、API-only VM 等契約維持。

第一個 code `a0fd3e7` 雖 Writer scoped 96/96，Mainline fresh full 得 **1019/1042、23 FAIL**，原始 TAP 以 byte-preserving gzip 保存在 `transaction-boundary-mainline-nonbrowser.tap.gz`。两名 Reviewer 在 Mainline 指示下中止：A 已跑新 focused 16/16，B 未跑；兩人均未做完整獨立裁決／關閉 findings，不能算 GO。相容性修復仍在本次交易邊界範圍內，沒有重開功能鏈。

同輪 regression repair 關閉 19 項 runtime regression，4 項既有 test injection 改接實際 DOM／vendor seam並保留原斷言。Mainline 另指出 UI catch／終態 status 邊界，Writer 以兩項 RED 證明、修復；見 `transaction-boundary-regression-writer.md`。不刪除、覆寫原 FAIL。

## 新 code 的證據

- **Writer fresh**：最終 81 檔 **1044/1044**、0 skipped、exit 0；Core2/Core3/S4 **98/98**。精確路徑、SHA與原始 log 在 `transaction-boundary-regression-full-02.json`／`.tap.gz`、`transaction-boundary-regression-validation.json`；主線核對該 receipt 與固定 code，沒有把它標成 Mainline fresh rerun。
- **Mainline fresh ZIP**：build／install／smoke／uninstall lifecycle PASS；`runtime/schemas/contracts` **75/75 byte-match**；protected **4/4 MATCH**；`git diff --check` PASS。
- ZIP：`dist/PPTSKILL-0.1.0.zip`，**2,328,800 bytes**；SHA-256 `83363c4b026e057a1fa3bf21512900e237b4385cc55e74a6f37873e099e1c580`。
- ZIP／hash 詳證：`transaction-boundary-distribution-build.json`、`transaction-boundary-distribution-probe.json`、`transaction-boundary-mainline-hashes.json`。封包 checkpoint 相對 code SHA 只增加 ZIP／sidecar 與 control/evidence。

## 獨立續審與 host 前置

兩名原 Reviewer 各自對固定新 code＋ZIP 續審，只回報自己重播過的 finding；不互看 verdict。重點為原 reorder nested Undo/operation、gesture finishing、double projection fallback，以及本輪 UI catch／終態 status／內部與公開權限分離／selection與vendor可操作／snap false/true 回歸。新 full non-browser已綠，無須重跑原失敗候選。

AI Core 当前 HEAD 仍 `c23e46555b73a29f16319c657622acb1acc51e7a`，scanner SHA `427162d34af5be6f3269c418f141716130909ce3fea82b5e3b4431732ebfdd6c`，與 Host04 ENOENT／IO_ERROR_OBSERVED 相同；尚無適用修復 receipt。此 task `CODEX_SANDBOX=seatbelt`。本輪未啟 Chrome；新候選 browser／PGQ 仍 pending，不沿用舊 SHA 的 GREEN。即使 code review GO，也要等待 observer 處置及新候選受管 host 驗收後，才能做 Core3 whole-card closure。

未 merge／push／deploy，未開 Core4，未動四個 protected untracked。
