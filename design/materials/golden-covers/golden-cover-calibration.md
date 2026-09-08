# Golden Cover Calibration

Owner calibration date: 2026-09-08

狀態：`PARTIAL`。本包已建立 reference evidence，但資料仍不完整，Golden Design Grammar v1 **不得宣告 COMPLETE**。

## Owner 決策

明確 Reject：

`05, 06, 07, 12, 15, 19, 22, 25, 30, 34, 36, 38A, 49, 53, 54`

明確 Accept：

`56–62`

其他 01–62 中沒有明確 Accept／Reject 的項目均為 `provisional_keep`，不得視為正式 Owner-approved Golden。

## 已知 Owner 設計判斷

- 目標是真正的 16:9 presentation cover / title slide。
- 必須有清楚的 title hierarchy。
- 可以有照片，但照片必須參與整體構圖，不是隨便右邊塞一張。
- 可接受跨產業風格，不應建立「產業模板」分類邏輯。
- 少元素可以，但必須靠比例、裁切、字級、grid、留白形成張力。
- 避免 generic Canva / AI-template look。
- 避免制式 50/50 左圖右字或左字右卡片骨架。
- 避免單純靠漸層、glow、陰影、圓角假裝高級。
- 靜態構圖必須先成立，動畫不能救醜版面。
- Golden Cover Library 是 design evidence，不是要 pixel-copy 第三方模板。

## 本機 evidence 狀態

- 找到圖片檔：33（兩個壓縮檔合計；其中 `封存.zip` 內有一組位元組相同的重複檔）。
- 已可靠對應：18。
- accepted：7（56–62）。
- rejected：1（38A）。
- provisional：10（39–42、44–48、51）。
- unresolved：15。
- 缺少圖片的 01–62 reference id：01–38、43、49、50、52–55；38A 另有圖片。
- 對應方法：只用檔名前綴或本機 manifest URL basename；沒有使用圖片內容與壓縮順序猜號。

## 初步設計標註邊界

只記錄肉眼可明確辨識的封面骨架、主視覺、標題位置、圖片處理、字體人格、留白、圖形與 surface。未知值維持空白；所有 effect 與 motion 欄位均保持 `null`，因靜態圖片不足以證明。

這些 tag 是 VQ1 的 intake evidence，不是固定模板，也不代表每個 provisional reference 已獲美感核准。

## 下一個 blocker

要完成 Golden Design Grammar v1，仍需補齊要被升格為正式 Golden Set 的缺圖、可追溯來源與 Owner 決策。這張卡不授權進入 P0-VQ2。
