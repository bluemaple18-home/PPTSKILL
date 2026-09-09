# 四款封面 Visual Route Contract

## P0-VQ3-S1 Typography Hero visual world（2026-09-09）

- `change_mode`: new_surface；沿用已核准的 Typography Hero 世界，不建立新 Style。
- `surface_mode`: experience。
- `THESIS`: 大字不是封面特效，而是整份 deck 的資訊結構；拒絕把每種內容自動塞回等寬卡片。
- `OWN_WORLD`: 暖白紙張 canvas、近黑正文、朱紅單一訊號色、Microsoft JhengHei fallback chain、細線與 edge-cropped type mass；無照片。
- `STORY`: 從成本、證據、流程、可攜性、邊界到決策，10 頁形成一條可驗證的產品敘事。
- `FIRST_VIEWPORT`: 以 Q2 Typography Hero 的滿版字形裁切與不對稱 copy placement 作封面，不回到 8:4 panel skeleton。
- `FORM`: 七種指定頁型共用 typography hierarchy、folio、規則線與 palette-area ratio；透過錯位比例、留白與文字尺度產生頁面差異。
- `ANTI_PATTERNS`: 三等分 KPI 卡、五個箭頭盒、每頁同一 split、照片裝飾、glow、陰影與圓角假高級。
- `SCOPE_BOUNDARY`: 僅 S1；不做 contrasting Style、motion/effect proof 或 Golden Visual Regression 收編。

## P0-VQ2 replacement intent（2026-09-09）

- `change_mode`: redesign
- `surface_mode`: experience
- `THESIS`: 同一內容必須靠不同 composition grammar 被一眼區分，拒絕共用左右 8:4 骨架後只換色。
- `OWN_WORLD`: Company fixture 為 minimal institutional；三個 AI routes 分別為 information-led cover、typography hero、graphic brand field。
- `STORY`: 使用者比較的是資訊層級、主視覺、留白與構圖方式，不是 palette 選單。
- `FIRST_VIEWPORT`: 固定 1600×900 設計座標，完整縮放至 1280×720；中文標題固定兩個安全行，不留 1–2 字孤行。
- `FORM`: 使用 Golden Design Grammar 的 bounded archetype、graphic anchor 與 role-aware effect；不新增圖片、不使用假主張文案、不生成任意 CSS。

## P0-VQ2-R1 composition semantics repair（2026-09-09）

- `change_mode`: refinement
- `THESIS`: archetype 必須改變 copy 與 anchor 的空間關係，不能只把 grammar token 映射成一個裝飾圖案。
- `FIRST_VIEWPORT`: Information Led 以內容中真實三段流程跨左上至下方；Typography Hero 以內容字形本身建立 edge pressure；Brand Field 以跨全寬的 modular cadence 場域包覆文案。
- `FORM`: grammar 新增 anchor relationship、visual flow、overlap、edge behavior、copy/anchor relation、focal point 與 silhouette；renderer 側寫可用 title/anchor region、quadrant map 與 dominant axis 驗證。
- `ANTI_PATTERNS`: fake information network、fixed `01`、fixed orbit、只比 token/DOM vocabulary 就宣告 structural diversity。
- `DEFERRED`: treatment-specific motion behavior 不屬於本次靜態 composition repair；Company Fixture 仍只需 geometry pass。

以下舊名稱只保留為 fixture id 相容層；實際 renderer 已由上述 archetype contract 決定。

共同產品型態是「簡報風格選擇器」，受眾為 PM、RD、業務與行銷。四款預覽共用同一標題、副標與識別文字，只以版面、字體、色彩、密度與資訊圖形表達差異。

## Executive Clear

- `visual_route`: Swiss executive editorial
- `primary_layout_move`: 非對稱 12 欄網格；結論區與決策路徑並列
- `information_density`: 低至中
- `type_scale`: 克制的大標、清楚 metadata、短行寬
- `palette_strategy`: 暖白與墨黑為主，只用朱紅標示決策節點
- `asset_strategy`: 以真實工作流四階段作資訊焦點，不使用裝飾圖
- `anti_patterns_to_avoid`: 巨大數字、管理儀表板卡片、藍灰企業模板

## Product Blueprint

- `visual_route`: technical systems blueprint
- `primary_layout_move`: 左側敘事、右側可追蹤的四階段系統圖
- `information_density`: 中高
- `type_scale`: 無襯線標題搭配等寬 metadata
- `palette_strategy`: 深墨綠、霧白、訊號綠與少量冰藍
- `asset_strategy`: 線路、節點與輸出端皆對應實際產製流程
- `anti_patterns_to_avoid`: 科幻 HUD、霓虹光暈、假程式碼、漂浮玻璃卡

## Sales Momentum

- `visual_route`: bold conversion poster
- `primary_layout_move`: 左側主張占場、右側以節奏化步驟推進
- `information_density`: 中
- `type_scale`: 高對比無襯線，但保留安全行寬與呼吸空間
- `palette_strategy`: 鈷藍底、暖白字、酸黃作唯一行動訊號
- `asset_strategy`: 用四步轉換軌跡表達速度，不使用抽象促銷圖形
- `anti_patterns_to_avoid`: 廉價橘紅促銷海報、斜切色塊、爆炸貼紙、全大寫中文

## Brand Story

- `visual_route`: literary brand editorial
- `primary_layout_move`: 雜誌跨頁式欄線、章節題與主標交錯
- `information_density`: 低
- `type_scale`: 中文襯線主標、精細無襯線 metadata
- `palette_strategy`: 墨梅紅、紙張米色、柔粉與小面積青綠
- `asset_strategy`: 用章節結構與文字裁切建立敘事，不放無意義插畫
- `anti_patterns_to_avoid`: 隨機圓形、裝飾相框、柔和品牌模板、無主題拼貼
