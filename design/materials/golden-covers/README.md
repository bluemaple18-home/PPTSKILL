# Golden Cover Library

本目錄保存 PPTSKILL 由本機 reference evidence 衍生出的 manifest 與設計語法，不是可複製模板庫。Owner 對原始 reference 的設計判斷仍保留在 metadata；raw image bytes 因缺少可驗證的 public redistribution license，不進公開 repository。

## 本次來源

指定的 `~/Downloads/PPTSKILL-Golden-Covers` 資料夾在執行時不存在，因此只讀取 Owner 提供的兩個本機壓縮檔：

- `PPTSKILL-Golden-Covers.zip`：包含決策 manifest 與一張可直接對應的 `38A` 圖片。
- `封存.zip`：包含 32 個 Owner-accepted 圖片檔；只以本機 manifest URL basename 或檔名對應 reference id。

當時沒有執行壓縮檔內的腳本、沒有連網、沒有下載或生成圖片。原始圖片只作設計研究輸入；公開 tree 僅保留衍生 metadata／grammar，不保存 raw binaries。

## 分類規則

- `accepted/`：Owner 明確接受，且找到可驗證編號的圖片。
- `rejected/`：Owner 明確拒絕且找到可驗證編號的圖片。
- `provisional/`：保留目錄結構；本次 Owner 澄清後為空。
- `unresolved/`：Owner 已接受，但檔名與本機 manifest 都無法可靠對應 reference id；不使用內容或壓縮順序猜號。

歷史來源共有 33 筆圖片紀錄：Owner accepted 32、rejected 1、provisional 0。其中 17 筆 accepted record 已對號，另有 15 筆 accepted record 保留 unresolved identity。公開 repository 的 raw reference image 數量為 0。實際可對應的 reference id 為 `38A, 39–42, 44–48, 51, 56–62`。

## Manifest

`golden-cover-references.json` 每筆保存 repo 檔名、原檔名、Owner 決策、`reference_id_status`、對應依據與保守的靜態設計標註。未知欄位維持 `null` 或空陣列；靜態圖片不推測 effect 或 motion。

## 邊界

- 不依產業建立模板路由。
- 不 pixel-copy 第三方圖稿。
- 不重新散布沒有 public redistribution clearance 的 raw reference image。
- Owner 接受不等於允許 pixel-copy；只吸收可重組的設計文法。
- unresolved 可以參與文法歸納，但不得捏造歷史 reference id。
- 不開始 P0-VQ2 封面重畫。
