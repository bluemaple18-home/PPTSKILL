# P0-VQ2-R1 Composition Grammar / Anchor Semantics Repair Receipt

- 日期：2026-09-09
- 狀態：`COMPLETE / OWNER VISUAL GATE PASS`
- 基準 commit：`26859a6ad5435334aa6b63f7e64615579404af18`
- 根因：semantic visual anchor 被降級成 decorative primitive；token 差異被誤當成 perceptual composition 差異。
- 範圍：既有三個 AI archetype 的 grammar → renderer 轉譯與 structural diversity gate。
- 不包含：新 archetype、Company Fixture 美化、P0-VQ3、full-deck generation、treatment-specific motion repair。

## 修復

1. Golden grammar 新增 spatial relationship catalogs：`anchorRelationship`、`visualFlow`、`overlapPolicy`、`edgeBehavior`、`copyAnchorRelationship`、`focalPoint`、`silhouette`。
2. Information Led 只從 subtitle 的實際分段內容產生 semantic sequence；少於兩段時 fail-safe 降級為 neutral visual system。
3. Graphic Brand Field 移除 hard-coded orbit，改為由 title 內容決定尺度與位移的 bounded modular cadence。
4. Typography Hero 移除 fixed `01 + bar`，改為內容字形導出的 `edge / stack / outline` bounded variants。
5. diversity validator 改比 renderer-level title/anchor region、overlap、dominant axis、quadrant map、copy relation 與 silhouette；不再靠 DOM class 名稱過關。
6. 依 Owner 指定，四張封面的 display/body 皆改為 `Microsoft JhengHei` / `Microsoft JhengHei UI` 優先，macOS 無此字體時才 fallback 至 `PingFang TC`。

## 驗證

- `pnpm test`：57/57 PASS。
- 1600×900 與 1280×720 browser geometry：四張皆 PASS。
- Traceback / console / pageerror / network failure / HTTP error：四張皆為空。
- 禁用 recipe 回歸：`information-network`、`brand-orbit`、fixed `content:"01"` 均有測試阻擋。

## Visual critique

- Information Led：`PASS`。真實 subtitle 內容已成為 semantic visual anchor，可作為 `information-led-cover` 有效 baseline。
- Typography Hero：`PASS`。目前三個 AI route 中完成度最高；typography 本身已成為 visual anchor，可作為 `typography-hero` baseline。
- Graphic Brand Field：`WEAK PASS / FUTURE REFINEMENT TARGET`。已移除 orbit 並建立 repetition / crop / rhythm / modular cadence，但仍偏 generator-like，與內容語義的關係及 graphic-device maturity 仍可提高。不阻擋 P0-VQ3。
- Company Fixture：`not-scored`，僅驗證 geometry 並標示 fixture-only。

## Gate verdict

- `functional_gate`: PASS
- `structural_diversity_gate`: PASS
- `geometry_gate`: PASS
- `owner_visual_gate`: PASS
- `owner_ideal_quality_ceiling`: NOT YET REACHED

Owner Visual Gate PASS 只代表本版已跨過 engineering demo、fake visual anchor 與 same-layout-different-color 的失敗狀態，架構與 visual grammar 足以進入下一階段。這不代表封面已達最終精品品質、不允許後續改善，或 Golden Design Grammar 已達設計上限。

Automated tests 只能防 regression，Owner visual verdict 仍是視覺品質的最終 authority。
