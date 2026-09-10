# P1-R9 Company Style Pack Receipt

## Status

`P1-R9: COMPLETE / AUTOMATED GATES: PASS / OWNER VISUAL GATE: PASS`

Owner 於 2026-09-10 確認 Company Style 具清楚、可辨識的 Clickforce 公司簡報語言；R9 已封存，可進入 P0-R11。

## Source boundary

- Source fingerprint: `sha256:128fc9c0d8bdac9717bd540e8b6ec28ea812b79eb28ad7f352d040af6413a415`
- Source slides: 7, 1280×720, 16:9
- 原始 PPTX、原始文案、備註與本機路徑不提交、不打入 ZIP。
- 僅保留 reviewed rule、量測值與必要品牌圖像。

## Deterministic checks

- 完整 regression：109/109 PASS。
- Reduced motion browser geometry：1600×900／1280×720 PASS；0 issue、0 console/network/page error。
- Normal motion browser geometry：1600×900／1280×720 PASS；4 個代表角色有狀態變化、resting layout 不變。
- 單檔 DeckSpec reopen：PASS；7 頁與 `clickforce-dark` StyleSpec 可回讀。
- Editor／portable size guard：既有同一路徑保留；最終 HTML 2,660,697 UTF-8 bytes，低於 20 MiB hard limit，PASS。
- 四封面 contract：Company Style＋三個 AI route PASS；公司封面使用既有 `full-bleed-editorial` grammar 與 shared renderer。
- Company cover preview geometry：1600×900／1280×720 PASS；full-bleed background 依 renderer contract 視為構圖場，不誤報為內容碰撞。
- Distribution candidate：Company Style rule、8 個必要品牌素材與 loader 均已進 ZIP；候選 ZIP SHA-256 `644335fed11699cb1b2b54c0c5cbb958408e062ee12993b2b9180c48f0a226aa`。此 SHA 只作 R9 packaging evidence，不是 P0-R11 final release SHA。
- Owner evidence：`company-style-montage-1280x720.png`；正式 verdict = PASS。

## Owner non-blocking notes

- `company-content-gradient` 不得固化成所有低內容量頁的三 bullet 左排 recipe。
- `company-content-dark` 四階段 sequence 不得成為所有 process slide 的固定公司模板。
- 兩行大標 cover 為偏好版本；一行長標仍在 Company Style 合理範圍。

## Known source limits

- chart language: `source_not_present`
- table language: `source_not_present`
- motion source evidence: insufficient；沿用既有 reduced-motion-safe premium preset。
