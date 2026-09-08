# Golden Cover Library

本目錄是 PPTSKILL 的本機 reference evidence，不是可複製模板庫。Owner 已確認 `封存.zip` 內全部圖片都是可接受參考；是否能還原歷史 reference id 是另一個獨立欄位。

## 本次來源

指定的 `~/Downloads/PPTSKILL-Golden-Covers` 資料夾在執行時不存在，因此只讀取 Owner 提供的兩個本機壓縮檔：

- `PPTSKILL-Golden-Covers.zip`：包含決策 manifest 與一張可直接對應的 `38A` 圖片。
- `封存.zip`：包含 32 個 Owner-accepted 圖片檔；只以本機 manifest URL basename 或檔名對應 reference id。

沒有執行壓縮檔內的腳本、沒有連網、沒有下載或生成圖片。所有 repo 圖片均為原始位元組複製，未改圖、未轉檔。

## 分類規則

- `accepted/`：Owner 明確接受，且找到可驗證編號的圖片。
- `rejected/`：Owner 明確拒絕且找到可驗證編號的圖片。
- `provisional/`：保留目錄結構；本次 Owner 澄清後為空。
- `unresolved/`：Owner 已接受，但檔名與本機 manifest 都無法可靠對應 reference id；不使用內容或壓縮順序猜號。

目前共有 33 個圖片檔：Owner accepted 32、rejected 1、provisional 0。其中 17 張 accepted 圖片已對號，另有 15 張 accepted 圖片保留在 `unresolved/` 等待歷史編號證據。實際可對應的 reference id 為 `38A, 39–42, 44–48, 51, 56–62`。

## Manifest

`golden-cover-references.json` 每筆保存 repo 檔名、原檔名、Owner 決策、`reference_id_status`、對應依據與保守的靜態設計標註。未知欄位維持 `null` 或空陣列；靜態圖片不推測 effect 或 motion。

## 邊界

- 不依產業建立模板路由。
- 不 pixel-copy 第三方圖稿。
- Owner 接受不等於允許 pixel-copy；只吸收可重組的設計文法。
- unresolved 可以參與文法歸納，但不得捏造歷史 reference id。
- 不開始 P0-VQ2 封面重畫。
