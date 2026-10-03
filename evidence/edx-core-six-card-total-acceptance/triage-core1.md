# Core1 整合重播失敗診斷

## 已凍結證據

- `feature-host-01`：1280×720 的 drag 成功，SE resize 後 canonical 仍為 640×480，期待 600×400；browser console/page/network 均空，target／Chrome／owned root 正常關閉。
- 舊 Core1 host04 曾通過相同 viewport 的 SE resize；新整合版尚不能宣告總驗收通過。
- 新鮮 1034/1034 非 browser 測試通過，只能證明離線路徑。

## 可否證假說（依序）

1. SE handle 的滑鼠事件未進入 Moveable：觀察 mousedown target、mouse move、preview geometry；若 preview 出現則否證。
2. 事件有進入且 preview 正確，但 release 時 finish／交易拒絕：觀察 release 前後 DOM 與 canonical、狀態文字；若 preview 未出現則否證。
3. 既有驗收 fixture 的固定縮放期待已不適用：對照目前產品的公開 geometry 規則與同樣用戶操作；只有明確產品契約變更才能成立，單次失敗不能據此改 assertion。

第二次執行僅針對 Core1、同一產品與 ZIP，加入驗收端 trace，不更動 runtime。若確認產品缺陷，先做最小修復與焦點驗證。不得用未通過的總驗收宣告 6/6 最終 GO。

## 根因與結果

`feature-host-02` capture-phase 事件顯示 SE 控制點中心的 pointerdown／mousedown 命中 `.pptskill-editor`；CSS 原定 editor `z-index:10000`、layout Moveable `z-index:9999`。因此假說 1 成立，假說 2 否證；沒有證據支持放寬固定 geometry 期待。只提高 Moveable 層級到 10001 並補 hit-test，`feature-host-03` 兩個 viewport 各 45/45 PASS。前兩輪 NOT_PASS 收據保留。
