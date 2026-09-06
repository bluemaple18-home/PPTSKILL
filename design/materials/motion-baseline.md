# PPTSKILL Motion Baseline

這份材料是從 AI Core `frontend-design-gate` 的 Motion Director 原則薄層吸收而來，供 PPTSKILL ZIP 自己攜帶；員工端不需要安裝 AI Core。

## MVP 允許的基本動效

只保留五種容易理解、低風險、可 deterministic render 的效果：

1. **fade-up**：標題、副標、eyebrow 以 opacity + 小幅 translateY 進場。
2. **stagger reveal**：條列、卡片、流程節點依序進場；總 stagger 應控制在約 500ms 內。
3. **line grow**：分隔線、流程線、圖表 bar 由左到右展開。
4. **soft scale**：圖片、proof panel、主要視覺區塊以非常小的 scale 差進場，不做大幅 zoom。
5. **number pop**：章節號、KPI、大數字以短距離位移 + 小幅 scale 進場。

## Style personality

- `corporate`：最克制；短距離、短 stagger、快速 ease-out。
- `premium`：稍慢、留白感較強、soft-scale 更明顯但仍克制。
- `energetic`：位移與 stagger 稍大，適合 sales / launch 類風格。
- `playful`：保留小幅 scale personality，但 MVP 不加入 bounce / rotation 等高刺激效果。
- `none`：完全停用動效。

## 硬邊界

- 動效只使用 `opacity`、`transform` 與既有 element 的 scale；不 animate width / height / margin / top / left。
- 動效不能改變 DeckSpec content，也不能靠動畫掩蓋 layout 問題。
- overlap / overflow / off-canvas 仍由 geometry QA 判定；QA 必須在 reduced-motion 狀態下量測靜態幾何。
- 所有輸出必須支援 `prefers-reduced-motion: reduce`，reduce 狀態下 content 立即可見且沒有位移。
- 不為每張 slide 叫 LLM 手寫動畫 code；motion 由 StyleSpec 的 `motion.personality / durationMs / easing` 驅動共用 runtime。
- MVP 不引入 Anime.js 等外部 runtime dependency；CSS transition + IntersectionObserver 足以完成這五種基本效果。未來只有在 SVG path / timeline / drag 等確實需要時再評估外部 animation library。
