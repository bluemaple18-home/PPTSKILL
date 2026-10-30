# S15 視覺核對

visual_route：沿既有 PPTSKILL editor 暗色控制列／native dialog，留 canvas 為主體。
product_type：離線簡報editor；audience：桌面版面編輯者；information_density：小型工具表單。
primary_layout_move：右下既有控制列加一個「插入文字」，modal置中單一textarea及取消／插入。
palette_strategy：既有暗底、淺字、focus淡藍；asset_strategy：實際UI screenshots，無新增素材。
anti_patterns_to_avoid：不擴ribbon／新框架，不加裝飾或第二份editor state。

Mainline實際檢視host-pointer-repair/insert-text-ui/下1280-s15-toolbar.png、1280-s15-dialog.png、1600-s15-toolbar.png、1600-s15-dialog.png。兩viewport按鈕與完整控制列均可見；dialog textarea／label／取消／插入未裁切，focus outline清楚，背景遮罩與inert有browser assertion支持。S15卡限定既有desktop1280×720與1600×900，不冒稱mobile驗收。

| 項目 | score | 觀察 |
|---|---|---|
| Focal point | pass | modal輸入框明確，背景退後 |
| Hierarchy | weak | label／input清楚，但取消與插入採既有dialog同權重native按鈕，主要動作視覺區分有限 |
| Spacing rhythm | pass | textarea與footer留白，兩viewport位置穩定 |
| Density fit | pass | 單一輸入任務，toolbar新增一項仍完整可見 |
| Layout originality | pass | 沿既有editor，無行銷hero／feature cards |
| Material honesty | pass | 真browser UI與固定fixture，無假截圖 |
| Interaction affordance | pass | focus outline、button label可辨，inert/disabled由runtime assertions補證 |
| Color discipline | pass | 沿既有中性色與focus色，無多餘漸層 |
| Responsive integrity | pass | 本卡兩個desktop viewport未見toolbar/dialog clipping；mobile未驗 |
| AI smell | pass | 具體工具用語，無模板介紹或裝飾區塊 |

visual_acceptance：PASS（9 pass／1 weak／0 fail），不因單一低優先視覺建議擴scope。
repairs_made：本輪未為視覺另改產品。
remaining_risk：固定插入geometry不會自動避障或縮字；長文字與既有內容可能重疊／裁切，沿卡明列界線。此四張截圖是toolbar/dialog狀態，新增文字／offline幾何以canonical與DOM/browser assertions驗，不將空dialog截圖冒稱所有內容狀態已逐圖檢視。
