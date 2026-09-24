# Core3 Repair 3 主線 checkpoint

Status: `PRODUCT_CANDIDATE_4a405cf_NO_GO / OWNER_REPLAN_REQUIRED / HOST_OBSERVER_BLOCKED`
Base product：`60a05ce33924dfd92c2977d743b24afc408dd207`（NO-GO）；Owner 已授權一次 bounded Repair 3。第一個 Repair3 產品 commit `5b588f7` 已被獨立 Reviewer 判 NO-GO，保留為失敗候選；目前產品／ZIP 候選為 `4a405cf`，不得把前者或 Host04 舊 evidence 當成新候選驗收。

## 已量測故障與修正

原 review-round-03 三個 P1：gesture restore 投影拋錯卻留下 geometry/history、控制列 setter 同步重入 Undo、reorder 失敗留下 pending 文字。新 regression 首輪 0/3，`5b588f7` 修到 3/3；其 code review 另測出 restore／status setter 同步重入 P1，以及 rollback 的第二次 `insertBefore` 失敗留下錯誤 DOM 順序 P2。後四項 fresh RED 為 0/4，見 `repair3-review-red.tap.gz`；`4a405cf` 的 7 個 Repair3 cases 全 PASS，見 `repair3-review-green.tap`。

`4a405cf` 中，gesture 收尾仍在原 interaction/controller，`finishing` 僅阻止 history replay，`gesturing` 保留實際 pending gesture 語意，避免 Core2 group drag 誤拒；提交後的 `restore` 與控制列 refresh 在原 operation rollback 範圍內。reorder 從 syncText 前保存 canonical/history/DOM snapshot，失敗時回退 pending 文字與順序；第二次 DOM rollback 使用原型 primitive，之後驗證 sibling 順序，無法回復時明確拋出 rollback 失敗。

## Fresh 主線驗證

- `4a405cf`：Core3 Repair3 targeted 7/7；Core2＋Core3 54/54；非 browser 全量 **1026/1026 PASS**，80 支測試檔，明確排除四支 host-only PGQ。原始 TAP 見 `repair3-review-green.tap`、`repair3-core2-core3.tap`、`repair3-nonbrowser-v3.tap.gz`。
- ZIP build／安裝／smoke／卸載 lifecycle PASS，見 `distribution-probe-repair3-v2.json`；ZIP 2,326,485 bytes，SHA-256 `a1dd5d23c61ff183d61cda4dd8cd132f33be85a64fce5dcb8de6f9280c0ec7d2`；封包 `runtime`／`schemas`／`contracts` 共 75 檔與來源 byte-match。10 個 source 和 4 個 protected hash 見 `source-hashes-repair3.json`。
- `git diff --check` PASS；四個 protected untracked 未修改。

## 失敗歷史與驗收邊界

首次 Repair3 全量 1021/1022，唯一失敗是舊 stable-identity 測試固定單參數函式簽名；更新檢查後 1022/1022，兩輪原始 TAP 分別為 `repair3-nonbrowser.tap.gz`／`repair3-nonbrowser-green.tap.gz`。後續一輪 1025/1026 揪出 `finishing` 誤阻 Core2 group drag，見 `repair3-nonbrowser-v2.tap.gz`；分離 `finishing` 與 `gesturing` 後才得 1026/1026。三輪失敗沒有改寫成單輪全綠。

AI Core scanner SHA 仍為 `427162d34af5be6f3269c418f141716130909ce3fea82b5e3b4431732ebfdd6c`，Host04 的 ENOENT／`IO_ERROR_OBSERVED` 尚無適用修復 receipt。本 task 是 sandbox，沒有啟正式 Chrome；`4a405cf` 的 browser 雙 viewport、四支 PGQ、managed cleanup 均 **PENDING**。兩名盲 Reviewer 對 `4a405cf` 均判 NO-GO，去重後 P1 2／P2 1；主線重播見 `review-round-05.md`、`review-round-05-repro.mjs`／`.json`。依本卡一輪 bounded Repair3 停損，不再修改產品、不盲重跑 Host05，待 Owner 對 `tasks/edx-core-3-transaction-boundary-replan.md` 裁決。未 merge／push／deploy，也未開 Core4。
