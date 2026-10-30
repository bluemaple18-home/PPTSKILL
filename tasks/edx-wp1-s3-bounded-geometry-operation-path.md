# EDX-WP1-S3 — Bounded Component Geometry Operation Path

**Status:** COMPLETE — INDEPENDENT REVIEW GO；尚未整合 main

**Reviewed commit:** `51494b35e5462311d37d1411793bc14780483359`

**Evidence:** `evidence/edx-wp1-s3/mainline-receipt.md`；`handoff_20260920_edx_wp1_s3_review.md`。
**traces_to:** `EDX-20260914 10.1 Decisions 1/7/8`, `EDX-20260914 10.4 Unified Operation Registry`, `EDX-20260914 10.5 Shared schema / portability rules`

## Objective

在不安裝 Moveable／Selecto、也不建立 selection／drag UI 的前提下，替既有 stable target pair `{slideId, elementId}` 建立第一條可攜的 component geometry contract。`move-element`／`resize-element` 必須只更新 canonical CompositionSpec 的 bounded override，並閉環 sanitizer → renderer → Node/browser editor → export → reopen → recipient parse；live DOM transform、viewport座標與任意 CSS 皆不得成為 truth。

## Minimum contract

- 新 geometry state 必須位於既有 CompositionSpec 的 optional bounded override seam；legacy deck 未帶 override 時保持原本視覺與可讀性，不升 schemaVersion、不建立第二 layout store。
- S3 僅允許 `component` target role。Title／subtitle／keyPoint geometry、group、多選與 slide root 不在本卡。
- `move-element` payload 使用 1600×900 canonical slide coordinate 的 absolute `{x, y}`；`resize-element` 使用 absolute `{width, height}`。不得保存 pointer delta、viewport-scaled value、raw `transform`、selector或CSS string。
- 欄位、型別、finite/integer規則、最小尺寸與safe-area邊界必須由單一 deterministic validator定義；未知欄位、stale target、非component role、NaN／Infinity、負尺寸與越界一律fail loud。
- Renderer只從canonical override產生bounded presentation style；不得回讀live DOM推導canonical state。Content-only edit不得清除geometry override。
- Duplicate slide可保留slide-local override並藉新slide ID維持target pair唯一；component被移除或不存在時不得留下可生效的orphan override。
- `OPERATION_DESCRIPTORS` 新增且只新增 `move-element`／`resize-element`；Node與browser enforcement共用同一allowlist truth。Browser公開descriptor snapshot須immutable，順便關閉S2保留的non-blocking P2。

## Prior art gate

| Prior art | Classification / license / pin | 本 Slice 使用 | Why custom |
|---|---|---|---|
| Moveable `0.53.0` | GO / ADAPT / MIT / integrity 已鎖 | **不安裝**；只用其未來會輸出的absolute geometry payload形狀作邊界參考 | Moveable提供gesture與handles，不提供PPTSKILL canonical schema、sanitizer或portable export authority。 |
| Selecto `1.26.3` | GO / ADAPT / MIT / integrity 已鎖 | **不安裝** | S3是single component target operation，不需要marquee或selection runtime。 |
| donor editor | ADAPT / research snapshot | 參考8px grid與guided direct manipulation語意 | donor的DOM transform／HTML-as-truth不可攜，也不能取代CompositionSpec。 |
| Floating UI `1.8.0` | REJECT FOR WP1 | 不使用 | 本卡沒有toolbar positioning measured gap。 |

Bundle / portable cost：不得新增dependency、vendor bundle或CDN；只增加schema metadata、bounded runtime mapping與tests。12 MiB warning／20 MiB hard gate不變。

## Acceptance

1. RED→GREEN：legacy deck無geometry override仍可sanitize/render/export/reopen，canonical content/composition既有欄位與視覺路徑不變。
2. 合法component target可經Node與browser `executeOperation()`執行move／resize；只改該slide／element geometry override，content、style、motion、background與其他slides保持。
3. Export→offline recipient reopen後，embedded DeckSpec、rendered position/size與recipient parse一致；live DOM中間值不被序列化。
4. 1280×720與1600×900下由同一canonical coordinate重建相同比例位置；不得因viewport zoom把scaled pixel寫回canonical。
5. Unknown operation/payload key、wrong role、stale slide/element、non-finite value、負尺寸、低於minimum或超出safe area全部fail loud；失敗不得部分mutation。
6. Duplicate保留自己的override；刪除slide／移除component不產生shared override、ghost target或orphan runtime style。
7. Existing `edit-text`與legacy adapters持續PASS；content edit保留manual geometry。Browser descriptor snapshot不能被mutation擴張或改寫metadata。
8. Browser geometry QA在static／normal與既有雙viewport持續PASS；console／pageerror／network／HTTP為0。若刻意越界，應由operation validator或既有geometry gate精準拒絕，不得secret clamp後冒充PASS。
9. Focused direct＋browser、DeckSpec/renderer/editor/export compatibility、full regression、fresh ZIP install/smoke/uninstall、syntax與`git diff --check` PASS；20 MiB gate量真正交付ZIP。

## Blocking edges / checkpoint

- 已滿足：EDX-WP1-S1 dependency decision；EDX-WP1-S2 stable identity＋`edit-text` operation path，已於`main@2d87f2491497df8e1b345df2ee95588b25f4fb8b`完成。
- Current frontier：本 Slice。
- Blocked until GO：Moveable／Selecto dependency install、drag/resize handles、snap guides、marquee／Shift多選、toolbar、keyboard nudge、history、AI bridge與後續Slice。
- Checkpoint：S3 independent review GO後，才可另切vendor interaction Slice；不得在本卡順手接Moveable／Selecto。

## Likely files

- `runtime/deck-spec.js`
- `runtime/full-deck-renderer.js`
- `runtime/deck-editor.js`
- focused tests／browser acceptance／fixtures／candidate receipt

## Verification / TDD

- 先用public interfaces建立move／resize、legacy migration、viewport independence、export/reopen、orphan cleanup與fail-loud RED。
- 最小GREEN；只建立component-only vertical path，不抽象完整Operation Registry，不引入vendor。
- 重跑既有PGQ browser-backed gates，確認geometry/readability/raster authority未被manual override繞過。
- 收工記錄exact tests、browser lifecycle、ZIP bytes/SHA、scope scan與review range。

## Non-goals

- 不安裝或bundle Moveable／Selecto／Floating UI。
- 不做mouse/touch drag、resize handles、snap、marquee、Shift multi-select、align/distribute、toolbar或keyboard nudge。
- 不做title／subtitle／keyPoint geometry、rotation、warp、crop、group/lock、typography override、history、draft/autosave或AI bridge。
- 不merge、push、deploy或開後續Slice。

## 獨立 review closure

- Owner 回傳 verdict：GO；P0 0／P1 0／P2 1／P3 0，綁定上述 reviewed commit。
- Reviewer 獨立重驗 source SHA、focused 26/26、non-browser full 214/214、diff check 與 ZIP SHA 均 PASS。
- Reviewer 無法 fresh browser rerun：受管 Chrome 被其環境的自動安全審核拒絕，native DevTools 無可連 port；browser 結論僅核對本 candidate 已提交的 PGQ 28/28 與 static／normal 雙 viewport evidence，不宣稱 reviewer fresh runtime PASS。
- 殘留 P2：`runtime/component-geometry.js:48` 的 `transform:none!important`／`scale:none!important` 壓掉 component motion 的 scale／translate；canonical geometry 保持正確，但 descriptor 的 motion preservation 並非完整視覺效果保留。
- P2 不阻擋 S3 closure，不在本輪直接修改 reviewed code。後續另行裁決 projector 只清除舊 inline style、投影 position／size 的修法，並補 normal-mode moved-component motion regression，同時保留 canonical geometry／export authority。
- Mainline 接受 GO；本輪只落 review closure 文件，不 merge／push／deploy、不安裝 vendor、不開下一 Slice。
