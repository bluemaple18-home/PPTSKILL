# EDX-WP1-S1 — Editor Core Dependency Spike Receipt

**Status:** COMPLETE — MOVEABLE + SELECTO GO；FLOATING UI REJECT FOR WP1
**Decision baseline:** `main@a63051f328f95ba92f3826616685f92b9accbbbb`
**Task:** `tasks/edx-wp1-s1-editor-core-dependency-spike.md`

## Decision snapshot

| Candidate | Pinned version | Classification | Current decision | Reason |
|---|---:|---|---|---|
| Moveable | `0.53.0` | ADAPT | **GO** | Fresh drag／resize／real snap均 PASS；R1 independent review 已證明 allowlisted controls 不進 export。後續只可映射成 bounded operation payload，不得把 transform DOM當 canonical。 |
| Selecto | `1.26.3` | ADAPT | **GO** | Fresh marquee／Shift多選與 Moveable handoff PASS；R1 independent review 已證明 Selecto chrome 不進 export。selection 只屬 editor-local state。 |
| `@floating-ui/dom` | `1.8.0` | REFERENCE / REOPEN-ON-GAP | **REJECT FOR WP1** | 套件 positioning／viewport collision 本身 PASS，但沒有 measured evidence 證明既有原生/CSS positioning 不足；依 minimum-sufficient gate 不新增 dependency。 |

採用裁決已完成：Moveable＋Selecto 允許進入後續 WP1 implementation card；Floating UI 本輪不採。這不等於 dependency 已安裝；dependency commit、stable-ID migration、Operation Registry mutation與正式 EDX interaction implementation仍需下一張 implementation card 明確授權。

## Official package evidence

- Moveable：官方 [npm package](https://www.npmjs.com/package/moveable)／[GitHub repository](https://github.com/daybrush/moveable)，version `0.53.0`，MIT。
  - Registry integrity：`sha512-71jS9zIoQzMhnNvduhg4tUEdm23+fO/40FN7muVMbZvVwbTku2MIxxLhnU4qFvxI4oVxn75l79SbtgjuA+s7Pw==`
  - Packaged LICENSE SHA-256：`77f98221f8531e87aa227c0a8d63c17c903dd4d36daf24bdc48296b09e06a25e`
- Selecto：官方 [npm package](https://www.npmjs.com/package/selecto)／[GitHub repository](https://github.com/daybrush/selecto)，version `1.26.3`，MIT。
  - Registry integrity：`sha512-gZHgqMy5uyB6/2YDjv3Qqaf7bd2hTDOpPdxXlrez4R3/L0GiEWDCFaUfrflomgqdb3SxHF2IXY0Jw0EamZi7cw==`
  - Packaged LICENSE SHA-256：`f0a8acccf5e11935501025a8035e78c9d44007e68f17344783d44810075e92aa`
- Floating UI DOM：官方 [npm package](https://www.npmjs.com/package/@floating-ui/dom)／[GitHub repository](https://github.com/floating-ui/floating-ui)，version `1.8.0`，MIT。
  - Registry integrity：`sha512-yXSrzeHZBTZadLOlfyhCkJHNeLJnHRnRInwdZ40L7ZiaAtrBwoYlsDrX3v5zB1Utk7CLfzcOVnVVWoXEky7Ceg==`
  - Packaged LICENSE SHA-256：`0e4c9a9b6c71019cbbea3bdc20b01223110a9035700f9c960c8fcbf78c2325ce`

Packages只安裝於 `/tmp/pptskill-edx-wp1-s1.*`，使用 exact versions與 `pnpm install --ignore-scripts`；repo `package.json`／lockfile／runtime均未修改。

## Bundle / portable cost

以 esbuild `0.28.2`、IIFE、bundle＋minify實測：

| Bundle | Minified bytes | gzip bytes |
|---|---:|---:|
| Moveable only | 248,913 | 81,518 |
| Selecto only | 64,476 | 20,351 |
| Floating UI DOM only | 13,296 | 5,446 |
| Combined tree-shaken harness | 290,306 | 94,997 |
| Combined inline HTML artifact | 291,197 | not applicable |

目前交付 ZIP 為 2,148,747 bytes；即使以未壓縮 inline增量估算，仍遠低於12 MiB warning／20 MiB hard fail。這只證明體積可接受，不代表採用決策通過。

## Architecture mapping

- 現有 renderer 以 `data-edit-target="slides.<slideId>..."` 投影 canonical DeckSpec；components已有 stable `id`，但 keyPoints仍以 array index定位。
- 現有 `PPTSKILLEditor.applyLocalPatch()` 只允許 title／subtitle／keyPoint content與同 type component patch；每次回到 sanitizer，非法 region fail loud。
- `exportHtml()` 會同步 canonical spec、移除 `contenteditable`／selection chrome並清理 background runtime；這條 canonical/export seam必須保留。
- DeckSpec／CompositionSpec目前沒有 bounded geometry override contract。Moveable的 live `transform`／width／height不能直接序列化；EDX implementation前必須先有 stable element identity與 allowlisted operation payload，例如：

```json
{
  "type": "move-element",
  "target": { "slideId": "slide-1", "elementId": "title" },
  "payload": { "x": 80, "y": 48 },
  "mutates": ["composition.overrides.geometry"],
  "preserves": ["content", "style", "motion"]
}
```

- Moveable handles／guides、Selecto marquee／selection與Floating UI toolbar全部只能存在於 editor-local layer；export cleanup必須有直接 regression。

## Minimum-sufficient decision

- **Why not less：** 原生 pointer events可做單一 drag，但不直接提供 group target、resize handles、snap guideline與跨 input normalization；Moveable／Selecto仍值得實測，而非先手刻通用 primitive。
- **Why not more：** 不吸收 rotate、warp、clip、round、pinch、infinite canvas、React wrappers或Scena editor；EDX只需 bounded drag／resize／snap／selection。
- **Floating UI checkpoint：** 只有 contextual toolbar在多 viewport／edge collision下證明原生CSS不足，才採用；否則REJECT以省 dependency。
- **Do not absorb：** package DOM state、raw CSS transform、arbitrary target selector、history、serialization、toolbar state、runtime CDN與任何第二 canonical model。

## Fresh browser rerun / blocker

- 使用 `ai-core/scripts/tmp_session.py browser`、fresh owned profile、loopback CDP與temp Git harness。
- ai-core bounded repair已修正 lifecycle JSON parser、Moveable vanilla API與evidence path；parser regression 3/3 PASS。
- Fresh rerun：marquee、Shift多選、drag、resize、真實snap guideline event與toolbar viewport placement全部 PASS。Move operation為`translate(239px, 0px)`，target落在`x=344`；Shift selection精準包含`slide-1/title`與`slide-1/evidence`。
- Console／pageerror／network failure／external HTTP全為0；lifecycle exit `0`，profile與owned root cleanup PASS。
- 產品 fixture注入三種候選 editor chrome後呼叫正式 `PPTSKILLEditor.exportHtml()`：canonical DeckSpec前後一致，但輸出同時包含`moveable-control-box`、`selecto-selection`與context toolbar。`exportChromeCleanup=false`是目前唯一blocking assertion。
- Machine-readable evidence：`evidence/edx-wp1-s1/browser-adoption-rerun.json`。

## Repair 1 export cleanup evidence

- `tasks/edx-wp1-s1-r1-export-cleanup-seam.md` 已實作 bounded clone-only cleanup seam；first-party marker與三個明確 selector共用同一 exporter contract。
- Direct focused 5/5 PASS；fresh managed-browser export／reopen PASS。Export 後 chrome 全數移除，embedded DeckSpec、presentation snapshot、live canonical／presentation與live editor chrome均保持；mis-mark canonical node會 fail loud。
- Browser evidence：`evidence/edx-wp1-s1/browser-export-cleanup-r1.json`；managed lifecycle：`evidence/edx-wp1-s1/browser-export-cleanup-r1-lifecycle.json`。
- Non-browser regression 200/200 PASS；fresh ZIP lifecycle PASS，2,149,207 bytes，SHA-256 `0fb680c0c0c3427bc6f36b47c58004d820a5fecb21cd24419042f9fe6c97bdf8`。
- 目前 Native3 sandbox 無法 fresh 啟動舊 `browser-geometry-qa.mjs` raw Chrome；independent review 需補跑既有 PGQ browser-backed compatibility。這不改變 R1 managed-browser PASS，也不授權 dependency adoption。
- Independent review 已補跑既有 PGQ browser compatibility 16/16 PASS；reviewer 發現 standalone editor acceptance 在功能 PASS 後可能因 Chrome profile teardown race 回 `ENOTEMPTY`。R1 repair 已加入 bounded process-exit wait 與 profile removal retry，fresh export／reopen exit 0；direct focused 數字亦更正為 5/5。Independent re-review 最終 GO；R1 COMPLETE，三候選仍維持 DEFER，現在進入 adoption decision checkpoint。

## Adoption decision closure

- **Moveable GO**：相對於原生 pointer events，已量測的 resize handles、snap guideline、group target／input normalization 是實際缺口；bundle與portable成本可接受，且 canonical/export boundary 已由 R1 關閉。
- **Selecto GO**：marquee／Shift multi-select 與 Moveable handoff 有 fresh browser evidence；自行重做通用 selection primitive 沒有更小，也沒有現成 PPTSKILL seam 可替代。
- **Floating UI REJECT FOR WP1**：目前沒有「不用它就做不到」的證據；contextual toolbar 先沿用 native/CSS positioning。只有 fresh multi-viewport／edge-collision 對抗證明 native seam 不足，才可重開。
- Next frontier：另切 EDX-WP1 implementation card，先處理 backward-compatible stable element identity＋bounded operation path，再接 Moveable／Selecto。不得在本 research closure 直接安裝套件或開正式 interaction implementation。
