# Golden Cover Library

本目錄是 PPTSKILL 的本機 reference evidence，不是可複製模板庫，也不是 Golden Design Grammar v1 的完成宣告。

## 本次來源

指定的 `~/Downloads/PPTSKILL-Golden-Covers` 資料夾在執行時不存在，因此只讀取 Owner 提供的兩個本機壓縮檔：

- `PPTSKILL-Golden-Covers.zip`：包含決策 manifest 與一張可直接對應的 `38A` 圖片。
- `封存.zip`：包含 32 個圖片檔；只以本機 manifest URL basename 或檔名對應 reference id。

沒有執行壓縮檔內的腳本、沒有連網、沒有下載或生成圖片。所有 repo 圖片均為原始位元組複製，未改圖、未轉檔。

## 分類規則

- `accepted/`：Owner 明確接受且找到可驗證編號的圖片。
- `rejected/`：Owner 明確拒絕且找到可驗證編號的圖片。
- `provisional/`：不是明確 Accept／Reject，但找到可驗證編號。
- `unresolved/`：檔名與本機 manifest 都無法可靠對應 reference id；不使用內容或壓縮順序猜號。

目前共有 33 個圖片檔：accepted 7、rejected 1、provisional 10、unresolved 15。實際可對應的 reference id 為 `38A, 39–42, 44–48, 51, 56–62`。

## Manifest

`golden-cover-references.json` 每筆保存 repo 檔名、原檔名、決策、對應依據與保守的靜態設計標註。未知欄位維持 `null` 或空陣列；靜態圖片不推測 effect 或 motion。

## 邊界

- 不依產業建立模板路由。
- 不 pixel-copy 第三方圖稿。
- `provisional_keep` 不等同 Owner-approved Golden。
- unresolved 未完成對號前不得升格。
- 不開始 P0-VQ2 封面重畫。
