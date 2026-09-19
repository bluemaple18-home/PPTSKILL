# EDX-WP1-S1 — Editor Core Dependency Spike Receipt

**Status:** R1 EXPORT CLEANUP CANDIDATE PASS — INDEPENDENT REVIEW PENDING
**Candidate identity:** `main@26463dd1702a267527407db1467ec5ca2e3e912a`
**Task:** `tasks/edx-wp1-s1-editor-core-dependency-spike.md`

## Decision snapshot

| Candidate | Pinned version | Classification | Current decision | Reason |
|---|---:|---|---|---|
| Moveable | `0.53.0` | ADAPT candidate | **DEFER** | Fresh drag／resize／real snap均 PASS；R1 fresh managed-browser 已證明 allowlisted controls 不進 export。正式 adoption 仍待獨立 review 與 adoption checkpoint；只能輸出 bounded operation payload，不得把 transform DOM當 canonical。 |
| Selecto | `1.26.3` | ADAPT candidate | **DEFER** | Fresh marquee／Shift多選與 Moveable handoff PASS；R1 fresh managed-browser 已證明 Selecto chrome 不進 export。正式 adoption 仍待獨立 review 與 adoption checkpoint。 |
| `@floating-ui/dom` | `1.8.0` | DIRECT_REUSE candidate | **DEFER** | Toolbar positioning與viewport內收斂 PASS；R1 fresh managed-browser 已證明 context toolbar 不進 export；多邊界必要性仍需 adoption checkpoint 收斂。 |

沒有 candidate取得 GO；R1 只關閉 export-cleanup 技術缺口，dependency commit、stable-ID migration、Operation Registry mutation與正式 EDX interaction implementation仍 blocked。

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
- Direct focused 8/8 PASS；fresh managed-browser export／reopen PASS。Export 後 chrome 全數移除，embedded DeckSpec、presentation snapshot、live canonical／presentation與live editor chrome均保持；mis-mark canonical node會 fail loud。
- Browser evidence：`evidence/edx-wp1-s1/browser-export-cleanup-r1.json`；managed lifecycle：`evidence/edx-wp1-s1/browser-export-cleanup-r1-lifecycle.json`。
- Non-browser regression 200/200 PASS；fresh ZIP lifecycle PASS，2,149,207 bytes，SHA-256 `0fb680c0c0c3427bc6f36b47c58004d820a5fecb21cd24419042f9fe6c97bdf8`。
- 目前 Native3 sandbox 無法 fresh 啟動舊 `browser-geometry-qa.mjs` raw Chrome；independent review 需補跑既有 PGQ browser-backed compatibility。這不改變 R1 managed-browser PASS，也不授權 dependency adoption。

## Required next evidence

下一步是 R1 independent review：補跑舊 PGQ browser compatibility、核對 fresh ZIP／receipt 與 bounded diff。R1 GO 後回到 EDX-WP1-S1 adoption decision；三個候選在該 checkpoint 前持續 `DEFER`，不得自動新增 dependency或開始正式 interaction implementation。
