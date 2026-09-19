# EDX-WP1-S2 — Stable Element Identity + Bounded Operation Path

**Status:** READY FOR INDEPENDENT RE-REVIEW
**traces_to:** `EDX-20260914 10.1 Decisions 1/7/8`, `EDX-20260914 10.4 Unified Operation Registry`, `EDX-20260914 10.5 Shared schema / portability rules`

## Objective

在不安裝 Moveable／Selecto、也不實作 drag／resize／marquee UI 的前提下，建立第一條可攜、向後相容的 element identity 與 operation path。舊 DeckSpec 必須可讀；新版 export／reopen 必須保留 identity；第一個 `edit-text` operation 必須由 descriptor allowlist 驗證並更新 canonical DeckSpec，不能把 DOM、selection 或任意 patch 當 truth。

## Minimum contract

- Stable target 是 `{ slideId, elementId }`；slide-local `elementId` 必須符合既有 ID 字元邊界且在同一 slide 唯一。
- `title`／`subtitle` 使用固定 role identity；component 使用既有 component ID；只有目前不穩定的 keyPoints 新增 optional `content.keyPointIds` parallel array。
- 舊 deck 缺 `keyPointIds` 時 deterministic backfill `key-point-01`…；合法既有 ID 必須保留。另存後不得再依文字或 DOM 順序重建 identity。
- Renderer 對所有可直接操作的 title／subtitle／keyPoint／component root 輸出 `data-pptskill-element-id`；`data-edit-target` 保持相容。
- 第一個 descriptor 只做 `edit-text`，定義 input schema、allowed target roles、mutates/preserve scopes、destructive/confirmation、undoable、QA invalidation、portable serialization與unsupported reason。
- `executeOperation()` 只接受 allowlisted descriptor與payload；未知 operation、slide、element、role或非字串 value 必須 fail loud。`applyLocalPatch()` 保持舊 API，改作 bounded adapter，不另寫第二套 mutation truth。

## Prior art gate

| Prior art | Classification / license / pin | 本 Slice 使用 | Why custom |
|---|---|---|---|
| Moveable `0.53.0` | GO / ADAPT / MIT / integrity 已鎖 | **不安裝**；未來只產生 geometry operation payload | 不提供 PPTSKILL canonical identity、schema portability或 mutation authority。 |
| Selecto `1.26.3` | GO / ADAPT / MIT / integrity 已鎖 | **不安裝**；未來只提供 selection input | 不提供 canonical target identity或 operation validation。 |
| donor editor | ADAPT / research snapshot | 參考 stable selection／operation UX | HTML-as-truth 與任意 DOM mutation不符合 portable DeckSpec。 |
| Floating UI `1.8.0` | REJECT FOR WP1 | 不使用 | 無 edge-collision measured gap。 |

Bundle / portable cost：本 Slice 不新增 dependency；僅 schema metadata、DOM attributes與小型 descriptor/dispatcher。20 MiB hard gate不變。

## Acceptance

1. RED→GREEN：舊 fixture 無 `keyPointIds` 可 deterministic migration；合法 supplied IDs deep-preserve；長度不符、重複或非法 explicit IDs fail loud。
2. Sanitizer／validator／renderer／extract／editor／export→reopen 關閉同一 identity chain；新版另存不丟 ID。
3. 每張 slide 的 `data-pptskill-element-id` 唯一；title／subtitle／keyPoint／component identity 可從 canonical spec deterministic resolve。
4. Duplicate slide 仍可保留 slide-local element IDs，並藉新 slide ID 維持 global target pair 唯一；delete/reorder不污染其他 identity。
5. `edit-text` operation 只改指定 title／subtitle／keyPoint；content hash以外的 composition/style/motion/background/component與其他 slide保持。
6. Legacy `editText`、`editKeyPoint`、`applyLocalPatch`持續PASS，且 adapter最終走同一 operation path。
7. 未支援 `move-element`／`resize-element`、任意 HTML/JS/CSS、DOM geometry與 selection state全部fail loud；不提前建立 overrides、history、AI bridge或 vendor adapter。
8. Focused direct、existing editor/export、DeckSpec/renderer compatibility、full non-browser regression、fresh ZIP install/smoke/uninstall、syntax與`git diff --check` PASS。若 runtime DOM attribute／browser export path受影響，補 fresh export→offline reopen gate。

## Blocking edges / checkpoint

- 已滿足：EDX-WP1-S1 dependency decision；Moveable與Selecto GO / ADAPT，Floating UI REJECT。
- Current frontier：本 Slice。
- Blocked until GO：dependency install、Moveable drag/resize/snap、Selecto marquee、多選、geometry overrides、history、正式 AI bridge。
- Checkpoint：本 Slice independent review GO後，才切 geometry operation Slice；不得直接接 vendor UI。

## Likely files

- `runtime/deck-spec.js`
- `runtime/full-deck-renderer.js`
- `runtime/deck-editor.js`
- focused tests／fixtures／candidate receipt

## Verification / TDD

- 先以 public interfaces 建立 identity migration、duplicate、export/reopen與 operation fail-loud RED。
- 最小 GREEN；不改 schemaVersion、不新增 dependency、不建立第二 renderer/exporter。
- 收工記錄 exact tests、ZIP bytes/SHA、scope scan與 reviewer range。

## Non-goals

- 不安裝或 bundle Moveable／Selecto。
- 不做 drag、resize、snap、marquee、toolbar、keyboard nudge或 selection UI。
- 不做 geometry/typography/motion override schema、Undo/Redo、Operation Registry全 vocabulary或 AI bridge。
- 不 merge、push、deploy或開 EDX-WP1-S3。

## Candidate result — 2026-09-20

- 舊 DeckSpec 缺 `keyPointIds` 時 deterministic backfill；合法 explicit IDs保留，長度／格式／重複錯誤在 sanitizer 前 fail loud。
- Stable target使用 `{slideId, elementId}`；互斥 namespace為`role-*`、`point-*`、`component-*`。舊 component ID即使叫`title`或`key-point-01`也不與新 identity碰撞；legacy非pattern slide ID仍可操作。
- Renderer／browser runtime／export／reopen共用 identity；duplicate保留slide-local IDs並以新slide ID維持target pair唯一。Committed `fixtures/full-deck.html`已由正式renderer重建，避免舊artifact與新canonical schema分歧。
- 第一條 `edit-text` descriptor已定義bounded schema與metadata；Node／browser `executeOperation()`拒絕未知operation、額外root/target欄位、非法element ID、錯誤role與非字串value。Legacy `editText`／`editKeyPoint`／`applyLocalPatch`皆走同一operation path。
- Focused 8/8、targeted editor/schema/renderer 27/27、non-browser regression 208/208 PASS。PGQ browser compatibility serial 16/16 PASS。
- Fresh editor browser export→offline reopen PASS；console／pageerror／network／HTTP全0，exit 0。證據：`evidence/edx-wp1-s2/browser-acceptance.json`。
- Fresh ZIP install/smoke/uninstall PASS；2,151,973 bytes；SHA-256 `12b092000ae6296710e579e446ba7be4527b4ce717c06e78ce036830739a832e`。Syntax與`git diff --check` PASS。
- 未安裝Moveable／Selecto，未新增dependency/lockfile，未做geometry override、drag/resize/snap、marquee、history或AI bridge。

## Repair 1 result — 2026-09-20

- Independent review 發現兩個P1與一個P2：operation path對合法超長legacy slide ID另設200字元限制；bounded namespace可與另一合法legacy ID碰撞；公開descriptor只做shallow freeze而可被mutation擴張role metadata。
- Operation path已移除額外slide ID上限，完整沿用DeckSpec既有非空unique ID domain。Fresh Chrome以234字元slide ID實際完成`applyLocalPatch`→`executeOperation`、export與recipient reopen，三階段ID與編輯文字一致。
- Element identity改為deterministic、bounded、slide-local collision allocator；分配順序按canonical namespace/raw ID排序，不受keyPoint/component array reorder影響。對抗性component與keyPoint suffix collision保持unique且可round-trip。
- Descriptor metadata已deep-freeze；Node/browser enforcement另持有private immutable role allowlist，外部mutation不能擴張operation authority。
- Focused 10/10、targeted 29/29、non-browser 210/210、PGQ browser compatibility serial 16/16 PASS。Fresh editor browser export→offline reopen PASS；console／pageerror／network／HTTP全0，managed lifecycle exit 0。
- Fresh ZIP install/smoke/uninstall PASS；2,152,740 bytes；SHA-256 `f0dff328f707889deac71f8616ab4d06cdc62ade79d7781769756cc40656f2c0`。Syntax與`git diff --check` PASS。
