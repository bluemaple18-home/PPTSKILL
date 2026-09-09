# P0-VQ2-R1 Composition Grammar / Anchor Semantics Repair Receipt

- 日期：2026-09-09
- 狀態：`AUTOMATED GATES PASS / OWNER VISUAL GATE PENDING`
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

- Information Led：`pass`。主視覺是與真實 subtitle 對應的三段流程，不再是 fake network。
- Typography Hero：`pass`。主標與內容字形共同承擔焦點，沒有固定 folio recipe。
- Graphic Brand Field：`weak`。repetition / crop / rhythm 已有明確規則，仍需 Owner taste verdict 判斷品牌張力。
- Company Fixture：`not-scored`，僅驗證 geometry 並標示 fixture-only。

## Remaining authority

Automated gate 只防 regression，不代替 Owner 審美裁決。P0-VQ2-R1 在 Owner 檢視 montage 前不得標記 COMPLETE。
