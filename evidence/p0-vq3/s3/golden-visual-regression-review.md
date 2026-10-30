# P0-VQ3 Golden Visual Regression Review Sheet

- 日期：2026-09-09
- Static baseline：S1 Typography Hero、S2 Information Led，皆為 Owner PASS。
- Motion baseline：S3 role-aware effects，Owner Motion Gate PASS。

## Owner-approved static baselines

| Criteria | Typography Hero | Information Led |
|---|---|---|
| Hierarchy | 大字、裁切與尺度建立清楚 title hierarchy | rail、sequence、metric ledger 建立資訊階層 |
| Composition tension | edge crop、inverse、giant numeral 與 closing mass | stepped sequence、evidence band、process rail 與 system axis |
| Negative space | 高低密度交替，保留安靜頁 | 高密度仍保留 quote／transition 呼吸頁 |
| Typography maturity | type-as-visual 已延伸到內頁 | typography 服從 evidence reading，不冒充 editorial hero |
| Visual-anchor quality | title、numeral、quote、metric 輪替 | sequence、metric、process、chart 輪替 |
| Semantic relevance | 07／10 refinement 已保留為後續 selection note | anchor、metric、chart 均由真實 DeckSpec 內容生成 |
| Visual weight | 10 頁 silhouette 可辨識 | 10 頁 silhouette 可辨識，且不是 S1 換色 |
| Palette-area balance | 暖白／近黑／朱紅節奏成立 | 深墨綠／暖白／signal green 節奏成立 |
| Template smell | Owner PASS | Owner PASS；rail／matrix 固化風險列為非阻擋 note |
| Overall maturity | Owner Visual Gate PASS | Owner Visual Gate PASS |

## S3 owner-approved motion baseline

| Semantic role | Typography Hero | Information Led |
|---|---|---|
| title | `hard-cut-field` | `hard-rule` |
| visual anchor / component focus | `brand-device-accent` | `outlined-surface` |
| metric | `folio-emphasis` | `folio-emphasis` |
| process | `staggered-sequence` | `progressive-reveal` |
| diagram / rule / chart | `rule-draw` | `rule-draw` |
| supporting copy | `none`，立即可讀 | `none`，立即可讀 |

兩個 Style 各自最多兩個 primary effect families。動態只使用 opacity、transform、clip-path；不動畫 width、height、margin、top 或 left。

## Review artifacts

- Typography motion preview：`evidence/p0-vq3/s3/typography-motion-preview.gif`
- Information Led motion preview：`evidence/p0-vq3/s3/information-motion-preview.gif`
- Typography normal/reduced：`typography-motion-normal.json` / `typography-motion-reduced.json`
- Information Led normal/reduced：`information-motion-normal.json` / `information-motion-reduced.json`
- Typography static regression montage：`typography-static-regression-montage.png`
- Information Led static regression montage：`information-static-regression-montage.png`
- Static paired comparison：`evidence/p0-vq3/s2/paired-style-comparison.png`

## Owner decision

`P0-VQ3-S3 OWNER MOTION GATE: PASS`（2026-09-09）

`CP-VQ3: PASS`。Typography Hero／Information Led 已證明同一 DeckSpec 可形成兩套 coherent static visual world 與 role-aware motion。非阻擋限制：`hard-cut-field` 保持快速、克制，避免中文字 clipping 被讀成 rendering glitch。
