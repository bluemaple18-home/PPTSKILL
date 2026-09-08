# Golden Cover Calibration

Owner calibration date: 2026-09-08

狀態：`REFERENCE INTAKE COMPLETE / GRAMMAR CONTRACT IMPLEMENTED / PROVENANCE PARTIAL`。Owner 已確認本次 `封存.zip` 內全部 32 張圖片都是可接受參考；歷史編號缺口不再阻擋這批素材參與文法歸納。正式 runtime contract 已建立於 `../golden-design-grammar.v1.json`，但依 Owner 原始限制，完整歷史 provenance 補齊前不宣告整體 Golden Design Grammar v1 `COMPLETE`。

## Owner 決策

明確 Reject：

`05, 06, 07, 12, 15, 19, 22, 25, 30, 34, 36, 38A, 49, 53, 54`

本次新增明確 Accept：

`封存.zip` 內全部 32 張圖片。已還原 reference id 的部分為 `39–42, 44–48, 51, 56–62`；另外 15 張仍為「Owner accepted / reference id unresolved」。

先前明確 Reject 決策仍有效；未出現在本次壓縮包、也沒有其他決策證據的歷史 01–62 項目，不因這次澄清自動升格。

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
- Owner accepted：32（17 張已對號、15 張待對號）。
- rejected：1（38A）。
- provisional：0。
- reference id unresolved：15；這 15 張仍是 Owner accepted。
- 缺少圖片的 01–62 reference id：01–38、43、49、50、52–55；38A 另有圖片。
- 對應方法：只用檔名前綴或本機 manifest URL basename；沒有使用圖片內容與壓縮順序猜號。

## 初步設計標註邊界

只記錄肉眼可明確辨識的封面骨架、主視覺、標題位置、圖片處理、字體人格、留白、圖形與 surface。未知值維持空白；所有 effect 與 motion 欄位均保持 `null`，因靜態圖片不足以證明。

這些 tag 是 VQ1 的 intake evidence，不是固定模板。Owner 已核准素材集合；標註工作由 AI 完成，不再要求 Owner 逐張補 tag。

## Corpus-level design grammar intake

整包可歸納為六個可重組結構族，而不是 32 個模板：

1. **Active negative space**：大面積留白本身承擔層級與張力，常搭配窄幅照片、全景帶或單一 offset block。對應 `minimal-institutional`、`architectural-negative-space`。
2. **Image–type asymmetry**：文字與照片採刻意不均等的空間關係；照片可能全高、偏置、圓形、橢圓、菱形或被硬邊 mask 裁切。重點是主次與裁切，不是固定左右分欄。
3. **Full-bleed editorial**：照片建立整頁場景，文字以對比、遮罩或局部暗化直接進入畫面，不另塞一張裝飾卡。
4. **Typography hero / cropped type**：標題以極大字級、粗細對比、描邊或多行斷句成為第一視覺；圖片退為場景或第二錨點。
5. **Object / product hero**：車、設備、手機、建築或人物工作場景是單一可辨識錨點，文字圍繞物件配置，而非與素材搶焦點。
6. **Graphic brand field / information-led anchor**：少量硬邊色塊、細線、圓環、filmstrip 或重複品牌幾何建立可辨識結構，但不生成假資料或假關係圖。

共同文法：

- Title hierarchy 通常由一個明確 display role 主導，再以小型 subtitle／identity／date 收尾；避免所有文字同權重。
- Dominant region 必須明確，常見為偏置大圖、大留白、全幅場景或水平圖帶；不要把「50/50」當禁用數字，真正要排除的是機械式、被動的左右容器。
- 圖片處理優先順序為：全幅場景、刻意非對稱裁切、單一幾何 mask、窄幅／全景 image window；不得只是右側塞圖。
- Surface 以平面色域、硬邊分區、照片場與少量細線為主；圓角、陰影、glow 只能是從屬語彙。
- 靜態圖沒有 motion 證據，因此 `effect_language` 與 `motion_personality` 維持 `null`；後續動態只能服務既有層級與 reveal。
- 同一視覺世界可重組 title placement、dominant region、image treatment、negative space 與 graphic language；禁止把 reference 做成 pixel-copy template。

## 後續邊界

這批 Owner-approved corpus 已完成 `VQ1-GRAMMAR-001` 的正式資料契約整理，不需 Owner 再逐張標註。歷史缺號只列為 provenance debt；除非未來要恢復完整 01–62 對照，否則不阻擋文法 contract 使用。本次仍不開始 P0-VQ2 重畫封面。
