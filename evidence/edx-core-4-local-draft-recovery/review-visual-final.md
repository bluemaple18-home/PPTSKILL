# Core4 正式 host 實圖最終複審

- Reviewer thread：`01a0f06e-7022-78e2-9fca-42b1dc5c9a8d`（Newton）。
- Review root：`evidence/edx-core-4-local-draft-recovery/host-acceptance-04/browser/`。
- 結論：**FINAL HOST VISUAL GO**。

## Findings

- P1：無。
- P2：無。
- P3：`1600-restore-offered.png` 位於既有 motion 的中間幀，左上標題與數個投影片元素尚未完全展開。Stable 的 `1600-restored.png`、`1600-offline-reopen.png` 幾何、字形與內容完整一致，1280 offered 畫面也能完整顯示；證據較符合 capture timing，而非 Core4 recovery UI 引入的持續裁切或 layout shift，因此非阻塞。

## 實圖與互動結論

- 1280、1600 的 restore-offered 畫面中，「恢復本機草稿」與「捨棄舊草稿，改存目前編輯」完整可讀，未互相遮擋或超出 viewport。
- Recovery tray 與既有「編輯文字／編輯版面」同列，沒有壓住主要投影片內容；play mode 未洩漏額外 status span。
- Restored 與 offline reopen 畫面中，兩顆 recovery buttons 已消失，既有控制列位置與可讀性正常。
- Receipt 的真 mouse click、`elementFromPoint` hit-test、尺寸與 viewport 檢查補足靜態截圖無法證明的可點擊性。

## 剩餘風險

目前沒有一張 1600 restore-offered 且 motion 完全 settled 的靜態圖，故 capture-timing 判定仍有低度推論。後續 screenshot harness 可等待 `animationend`／`transitionend` 或在驗收模式停用 motion；本卡無需為此修改產品。
