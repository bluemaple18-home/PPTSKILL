# Host04 existing browser evidence 唯讀續核

固定候選仍 `2db6185d13a6713700d0186758b1261ff23b9d85`。這是 Reviewer 對既有實體 receipt／artifacts 的 fresh 讀取與 hash 核對，**不是 Reviewer fresh browser 執行**。

已讀 `host-acceptance-04/crop/acceptance.json` 與 `browser-repair1-artifact-verification.json`，未讀 Mainline verdict／visual-check。source.html 實體 SHA256 與 acceptance 相符；以 source 內 renderer 原本的 componentTreatments 參數產生本候選 runtime，完整 editor script 與 source 相符。第一次用預設空 treatments 比對不符是 Reviewer 核對參數差異，已限縮定位並以實際參數比對成功，不是候選 source drift。

| 項目 | 1280×720 | 1600×900 |
|---|---:|---:|
| Records | 45 | 45 |
| Raster pixel cases | 24 | 24 |
| 有效 pixel checks | 1235 | 1240 |
| Artifact 實體 bytes＋SHA256 比對 | 40/40 | 40/40 |
| receipt expected/actual RGBA 容差重算 | 全≤4、pass一致 | 全≤4、pass一致 |
| targetClosed | true | true |
| page/network/http/remote/console errors | 全0 | 全0 |
| preview vs final 可見區域最大差 | 0.000027087 | 0.000030687 |

80個 artifacts 都由 Reviewer 親自讀取bytes並重算SHA256，沒有直接採用提供的 verification.json true。截圖內容之 pixel sampling 執行仍屬原 host harness；Reviewer重算的是receipt裡實際/預期RGBA的判定，沒有另跑browser oracle。

已直接觀看四張既有 screenshot：

- 1280-crop-preview-portrait-open.png
- 1280-crop-preview-portrait-actions.png
- 1600-crop-preview-landscape-open.png
- 1600-crop-preview-landscape-actions.png

看到修後decorative dialog的雙preview、成對number/range欄位、原圖AXIS、人工確認前後與可见的操作按鈕；portrait和landscape結果框呈不同target比例。這些只有decorative分類，不證明Evidence多一組保護欄位在雙viewport的全部可用性；其補充仍PENDING。

F1的host evidence是synthetic persisted event，沒有宣稱真BFCache導航命中。host04也有raw-observe、reset-refresh的fault後resize/load pixel cases，支持原F2 observe子路徑和F3修復；**沒有涵蓋本次新重現的舊disconnect/removeEventListener after-effect throw，因此不能關閉F2。**

Code targeted結果維持：F1 CLOSED、F2 OPEN/P2、F3 CLOSED、F4 CLOSED、F5 CLOSED；P0=0/P1=0/P2=1/P3=0。F5現在另外得到修後host04 pixel／visual證據支持。

本次未跑full 78files、browser、PGQ、ZIP lifecycle或installer；僅確認ZIP實體hash與固定candidate一致。host03不充當修後證據，host01/02歷史NOT_PASS不抹除。正式host04最終supervisor/lifecycle/PGQ16与Evidence visual補充截至本addendum尚待提供／核對。即使這些稍後PASS，仍需處理F2殘留或由Owner明確裁決，不能逕寫Independent GO。

Receipt snapshot／逐項核對：`host04-acceptance-snapshot.json`、`host04-evidence-check.json`。Fresh Node tests：`fresh-focused.tap`、`fresh-scoped.tap`。Fresh probes：`repair-probes.mjs`、`repair-probe-results.json`。
