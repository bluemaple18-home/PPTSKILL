# P0-VQ3-S3 Bounded Motion / Effect Receipt

- 日期：2026-09-09
- 狀態：`IMPLEMENTED / AUTOMATED GATES PASS / BROWSER MOTION GATES PASS / OWNER MOTION GATE PENDING`
- 範圍：S1／S2 已核准靜態 composition 上的 Style + semantic-role effect routing。
- 不包含：版面重設、schema 擴充、S1／S2 art-direction repair、P0-R7。

## Contract

- effect language 由 Golden Design Grammar 的 cover archetype 決定。
- motion personality 由 StyleSpec 決定。
- treatment 只依 semantic role 決定，不允許 per-element 隨機選擇。
- 每個 Style 最多兩個 primary effect families。
- supporting copy 立即可讀；動態不承載必要 claim。
- normal resting state 與 reduced-motion 使用相同 layout boxes。

## Implemented routing

- Typography Hero：`hard-field-accent`；title=`hard-cut-field`、visual anchor/component=`brand-device-accent`、process=`staggered-sequence`。
- Information Led：`static-precision`；title=`hard-rule`、visual anchor/component=`outlined-surface`、process=`progressive-reveal`。
- 共用：metric=`folio-emphasis`、diagram/rule/chart=`rule-draw`、supporting copy=`none`。

## Evidence

- `pnpm test`：68 / 68 pass（含 S3 focused tests 與完整 regression suite）。
- 四份 browser receipt：兩個 Style × normal/reduced；每份含 1600×900 與 1280×720。
- 所有 runs：traceback、console、pageerror、network failure、HTTP error、geometry issues 皆空。
- normal mode 在兩種 viewport 均觀察到 diagram、visualAnchor、title、metric、process、componentFocus 六個 changed roles。
- normal mode 的 initial/resting `layoutBox` 相同；normal/reduced 的 resting `layoutBox` 亦逐角色一致。
- reduced mode 所有內容立即可見，沒有 transition requirement。
- S3 reduced-motion montage 對 Owner-approved static baseline：Information Led pixel-identical；Typography Hero 僅 0.0564% channels 有 rasterization 差異、mean delta 0.0089，構圖與 layout boxes 不變。
- GIF preview 只作 Owner motion review；JSON trace 才是狀態與幾何證據。

## Remaining authority

Owner 尚未裁決 motion personality、節奏與角色 treatment 的視覺品質。自動化 PASS 不等於 Owner motion PASS；S3 與 CP-VQ3 均維持 pending。
