# Reviewer B：獨立實圖 visual verdict

日期：2026-09-29。**VISUAL GO：兩個 viewport 的 fixture 遮標題問題已由本輪實際 PNG 證實修正。** 此判定只涵蓋四張圖與對應 visual acceptance，**不是整體 host GO**。依交付當下狀態 PGQ 尚在執行；本 reviewer 未查等候其完成、不判 PGQ／最終 cleanup／整體 host closure。

## 實際看圖，不只讀 JSON

以 `view_image` 逐張開啟本輪 `host-acceptance-visual-fixture/undo-redo/` 的四張 PNG：

| PNG | 實際視覺觀察 |
| --- | --- |
| 1280-fixture-red.png | A/B 字形與左上標題重疊，標題出現明顯字形干擾；右側「座標保持一致」及其選取框仍在原位。 |
| 1280-selected.png | 標題完整可讀；A/B 明確可見於左下，與標題分離，也沒有移出畫面或被底部 toolbar 蓋住。右側文字、框與把手觀感不變。 |
| 1600-fixture-red.png | 同樣可見 A/B 疊入標題造成字形碰撞，尤其標題中段；右側元件與其他版面維持。 |
| 1600-selected.png | A/B 清楚位於左下，標題不再受其遮擋；右側元件與下方 toolbar 位置和 RED 一致。 |

兩組結果均支持「移動測試 fixture」的修復，而不是把 A/B 隱藏、刪除、移出 viewport 或重寫標題。這不是對所有字距、字型美觀或整張投影片作重新設計審核。

## acceptance 與實際檔案交叉核對

唯讀解析本輪 acceptance.json，所有 assertions 通過：

- acceptance status=pass；1280×720、1600×900 各 **12 checks**，run status=pass，visualFixtureGate status=PASS。
- 每個 viewport 的 **candidate == restored == green.measurement** 完整物件相等。A/B inlineStyle、可見性、文字、top、bounds 等均包含在比較中；不把這個 measurement equality 擴稱為未量測之全 DOM snapshot equality。
- RED 與 GREEN 中的 **title/rightquote 整個 element measurement 都等於 candidate**，包括 text、visible、inlineStyle、font、tracking、bounds。標題字體描述 `900 54px / 62.64px`、tracking `-4.05px`；右側字體描述 `900 64px / 75.52px`、tracking `-3.52px`，RED/GREEN 未變。這是 CSS 描述與目視一致性，不是另行識別實際 fallback font 檔案。
- RED A/B 均 visible=true、top=120px，gate issues 恰為 `title-overlap:A`、`title-overlap:B`；GREEN 均 visible=true、top=600px，gate pass=true、issues=[]。

| viewport | RED A/B bounds y | GREEN A/B bounds y | RED overlap area A / B | GREEN overlap area |
| --- | --- | --- | --- | --- |
| 1280×720 | 96 / 96 | 480 / 480 | 7215.75 / 6868.1162109375 | 0 / 0 |
| 1600×900 | 120 / 120 | 600 / 600 | 11272.5 / 10729.423828125 | 0 / 0 |

1280 的 A/B bounds 為144×96，1600為180×120；符合 .8／1 viewport scaling。所有 PNG 實際 signature、IHDR width/height、檔案 bytes、SHA256 與各 phase screenshot record 一致；沒有拿舊 owned-group 截圖或 mock PNG 充數。

## 固定身份

本次讀取的 acceptance.json SHA256：
`5ca402c122fa8a78d1ed3874aba4e2ad798f79b7f44fc18cf20a5c390b0afc90`

本輪 source.html SHA256：
`cf306af2dba61c4fa2e939b7ab087edd482a6a7225ed0d0ba096550a9e4708b3`

sourcePath 指向同一 run 的 source.html；兩個 visual.sources 的 sourcePath/sourceSha256 與 acceptance 相同，並已重算現存 source bytes。pageUrl 分別為本 run 的 `1280-export.html`、`1600-export.html`，符合既有 reopen 流程，未冒稱截圖時仍直接顯示初始 source URL。

| PNG | bytes | SHA256 |
| --- | ---: | --- |
| 1280-fixture-red.png | 49808 | `594706e5898556ec775300b45afe02d4d23e5f0a2fe6a1077779a543ac837d7f` |
| 1280-selected.png | 50423 | `4672b61c7f5aba83909bf65e62e7dfd0d9313420ccfba9c7872232936ced3d28` |
| 1600-fixture-red.png | 60255 | `c908de545c06d86a11195cbbe9a65c379922000d6d46e0ea7a1a7064c0f50e1d` |
| 1600-selected.png | 61297 | `e0349db0405f2652b2a1841ace987d513a4465c5dfa5dc638929e142bd0e376c` |

## 交回與邊界

**獨立 visual verdict：GO，未發現本次 A/B fixture 視覺修復的阻塞。** 完整 host 的 PGQ、observer runtime、退出碼、root/marker/PID cleanup、before/after 身份鏈尚未在本 receipt 裁決；等待 Owner 另交完整 raw 後才做 final closure，不在此等候或輪詢。

未 launch、未重跑測試、未修改 delivery/control/既有 review；僅新增本 receipt，完成即停寫。
