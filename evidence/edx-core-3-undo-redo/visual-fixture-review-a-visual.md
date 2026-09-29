# Reviewer A：本輪 visual fixture 實圖驗收

日期：2026-09-29。裁決：**VISUAL GO**；本窄域無新增阻塞 finding。**不裁決整體 host GO**，不以此收據宣稱 PGQ、process-group teardown 或 Core3 最終 closure 已完成。

## 範圍與獨立性

唯讀核對 `host-acceptance-visual-fixture/undo-redo/acceptance.json`、其 source/export 身分及本輪四張 PNG。已透過 `view_image` 實際觀看下列四張原圖；沒有以 JSON、mock 或舊 smoke 代替視覺驗收。沒有閱讀其他 Reviewer verdict、啟動 browser/host/PGQ、等待 PGQ 或修改 source/control/既有 review。本次唯一新增檔案為本收據。

## 實際視覺判定

| Viewport | fixture-red.png | selected.png |
| --- | --- | --- |
| 1280×720 | A/B 位於標題文字區，字形與「成果，不鎖在工具裡」疊合，原問題可見。 | 標題完整可讀；A/B 移至左下方，均可見且未被底部工具列遮住。 |
| 1600×900 | 同樣可見 A/B 與標題疊合，RED 不是單純 gate 文案。 | 標題完整可讀；A/B 分別留在左下方，沒有隱藏或移出 viewport。 |

兩組實图中右側「座標保持一致」及其藍色選取框、標題原本的位置與大小、副標題、背景和工具列視覺一致。RED 的標題像素理應受 A/B 遮擋，故不把 RED/GREEN 標題區像素完全相同當作 invariance 條件；核對的是標題本身量測未變，而遮擋被移除。

## Fresh 唯讀核對

以 `/Users/matt/ai-core/.venv/bin/python -B -` 執行記憶體內 JSON/檔案 assertions，exit 0，輸出 `ALL ASSERTIONS PASS`。未重跑任何產品或 host suite。

- acceptance 頂層 pass；兩個 viewport 各 pass、12 checks，visualFixtureGate 各 PASS。
- 每個 viewport 的完整 `candidate == restored == green.measurement` 深度相等，包含 viewport、四個元素的 text、visible、inlineStyle、top、font、tracking、bounds。不是只檢查 top 回到 600。
- RED/GREEN 各自的 title、rightquote 完整元素物件均等於 candidate。A/B 的 RED top 為 120px、GREEN 為 600px；text 正確、visible=true、完整邊界在 viewport 內。
- 獨立由矩形重算交集面積：1280 RED A/B 為 7215.75／6868.1162109375；1600 RED 為 11272.5／10729.423828125。兩組 GREEN 均為 0，與 receipt 記錄一致。RED issues 恰為 `title-overlap:A`、`title-overlap:B`，GREEN issues 為空。
- 四張 PNG 的實際路徑、bytes、SHA-256、PNG signature、IHDR 尺寸均符合 acceptance；實際觀看內容符合各自 phase。
- source.html 實際 SHA 符合頂層與兩個 visual sources。pageUrl 解碼後各指向本輪 `1280-export.html`／`1600-export.html`，檔案 SHA/bytes 亦符合各 run 的 export artifact。截圖是 export 頁經互動後的狀態，不能稱為未變更 source.html 的直接截圖。

固定本次讀取身分：

| 檔案 | bytes | SHA-256 |
| --- | ---: | --- |
| acceptance.json | 35395 | `5ca402c122fa8a78d1ed3874aba4e2ad798f79b7f44fc18cf20a5c390b0afc90` |
| 1280-fixture-red.png | 49808 | `594706e5898556ec775300b45afe02d4d23e5f0a2fe6a1077779a543ac837d7f` |
| 1280-selected.png | 50423 | `4672b61c7f5aba83909bf65e62e7dfd0d9313420ccfba9c7872232936ced3d28` |
| 1600-fixture-red.png | 60255 | `c908de545c06d86a11195cbbe9a65c379922000d6d46e0ea7a1a7064c0f50e1d` |
| 1600-selected.png | 61297 | `e0349db0405f2652b2a1841ace987d513a4465c5dfa5dc638929e142bd0e376c` |

source.html SHA-256：`cf306af2dba61c4fa2e939b7ab087edd482a6a7225ed0d0ba096550a9e4708b3`。兩個 export.html SHA-256 均為 `0693aa557b8835c56f4f207fd07d6834d344f58dd0d2f2f08fe656e4afdc3f76`。

## 邊界

本輪實證支持正常執行路徑的完整「已量測狀態」restore，並與四張實圖一致；不把該相等宣稱為整份 DOM 或所有異常 finally 分支的 fresh runtime 證明。字型 CSS 字串、tracking 及幾何 invariance 已核對，未另驗字型二進位。12 checks 為本輪 host 所產生記錄，本 Reviewer 沒有重跑功能操作。

PGQ 在派工時仍執行；本次沒有查其後續狀態，也未核對最終 controller/client receipt、runtime 同 PGID、absence、cleanup、產品/ZIP/core before-after。這些留給另行指定的完整 host raw closure。既有 client receipt I/O P2 維持非阻塞，本輪未修或重審。完成本收據後停寫。
