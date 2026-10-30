# Golden Design Grammar v1

狀態：`IMPLEMENTED / PROVENANCE PARTIAL`

這份材料層把 Owner 核准的 Golden Cover Library 轉成 PPTSKILL 可攜、可驗證的視覺路由契約。它不是模板集，也不包含第三方圖片、HTML、CSS 或外部 runtime dependency。

## 契約組成

- Runtime snapshot：`golden-design-grammar.v1.json`
- Deterministic compiler：`runtime/design-grammar.js`
- Evidence index：`golden-covers/golden-cover-references.json`
- Owner calibration：`golden-covers/golden-cover-calibration.md`

每個 route 至少包含：

- `coverArchetype`
- `titlePlacement`
- `visualAnchor`
- `imageTreatment` / `assetTreatment`
- `typePersonality` / `typeRolePairing`
- `negativeSpaceStrategy`
- `dominantRegionRatio`
- `graphicLanguage`
- `surfaceLanguage`
- `density`
- `effectLanguage`
- `motionPersonality`
- `antiPatterns`
- `evidenceRefs`

## 十個 archetype seeds

`typography-hero`、`full-bleed-editorial`、`architectural-negative-space`、`image-type-asymmetry`、`graphic-brand-field`、`object-product-hero`、`dark-premium-editorial`、`information-led-cover`、`cropped-type-image`、`minimal-institutional`。

這些是可重組的結構族，不是十張固定版型。VQ2 renderer 應依契約選擇真正不同的 composition primitive；不得把它們重新壓回同一個左右分欄，只換色票與字體。

## Runtime 用法

```js
import {
  compileVisualRouteCandidate,
  resolveRoleTreatments,
} from './runtime/design-grammar.js';

const route = compileVisualRouteCandidate({
  coverArchetype: 'full-bleed-editorial',
});

const treatments = resolveRoleTreatments(route, [
  'title',
  'image',
  'supportingCopy',
]);
```

Compiler 只接受 registry 內的 bounded token。未知 archetype、effect language、motion personality 或 semantic role 會 fail loud；輸出不含完整 HTML 或任意 CSS。

## Effect 與 motion 邊界

- `effectLanguage` 最多提供兩個 primary families。
- treatment 由 route 與 semantic role 決定，不隨機指派 DOM node。
- `none` 是一級 motion personality。
- 所有 motion 的 resting geometry 都是 `validated-composition`。
- reduced motion 必須立即顯示全部內容。
- effect 差異不得當成 structural diversity。

## Provenance 狀態

32 張本次封存圖片均為 Owner accepted，其中 15 張缺少可驗證的歷史 reference id。Grammar 使用 `unresolved-XX` 作本機 evidence key，不猜歷史編號。這不阻擋 deterministic contract 使用，但依 Owner 原始限制，完整歷史 provenance 補齊前不宣告整體 Golden Design Grammar v1 `COMPLETE`。
