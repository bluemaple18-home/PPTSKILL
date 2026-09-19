# EDX-WP1-S1 — Editor Core Dependency Spike Receipt

**Status:** BLOCKED — FRESH BROWSER EVIDENCE INCOMPLETE
**Candidate identity:** `main@26463dd1702a267527407db1467ec5ca2e3e912a`
**Task:** `tasks/edx-wp1-s1-editor-core-dependency-spike.md`

## Decision snapshot

| Candidate | Pinned version | Classification | Current decision | Reason |
|---|---:|---|---|---|
| Moveable | `0.53.0` | ADAPT candidate | **DEFER** | License、integrity與 bundle 已通過 static gate；仍缺 fresh offline browser drag／resize／snap evidence。只能輸出 bounded operation payload，不得把 transform DOM當 canonical。 |
| Selecto | `1.26.3` | ADAPT candidate | **DEFER** | License、integrity與 bundle 已通過 static gate；仍缺 fresh marquee／Shift多選與 Moveable handoff evidence。Selection永遠是 editor-local chrome。 |
| `@floating-ui/dom` | `1.8.0` | DIRECT_REUSE candidate | **DEFER** | 體積小且責任單一；仍缺 toolbar collision的 fresh browser evidence，也需先證明原生 CSS不足以滿足 viewport boundary。 |

沒有 candidate取得 GO；EDX-WP1 implementation、dependency commit、stable-ID migration與 Operation Registry mutation仍 blocked。

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

## Browser attempt / blocker

- 使用 `ai-core/scripts/tmp_session.py browser`、fresh owned profile、loopback CDP與temp Git harness。
- 前兩次在Chrome前由lifecycle fail closed：一次拒絕放寬容量上限，一次拒絕非Git repo root；兩項前置條件均已修正。
- 第三次 Chrome 實際啟動，stderr記錄 `DevTools listening on ws://127.0.0.1:51215/...`；temporary runner沒有觀察到父層 `browser-starting` event，因而未連線、未導航、未取得 console／pageerror／network與互動 assertions。
- Lifecycle已輸出 `session.json`，owned root `/private/tmp/aic-b-ee73586e1e924f15862bd41dd79959c1` 已不存在，cleanup PASS。
- 依同一 browser blocker第三次停止規則，不做第四次啟動。這不是產品或 dependency assertion failure，但不足以宣告browser acceptance PASS。

## Required next evidence

下一輪只能從已修正的 lifecycle event parser開始，做一次 bounded fresh replay，必須同時取得：

1. marquee與Shift多選；
2. Moveable drag／resize operation events與snap guide行為；
3. Floating toolbar viewport collision；
4. zero console／pageerror／requestfailed／external HTTP；
5. editor chrome不進可攜輸出；
6. lifecycle exit `0`與owned root cleanup。

上述 evidence 完成前維持 `BLOCKED / DEFER`，不切 EDX-WP1 implementation。
