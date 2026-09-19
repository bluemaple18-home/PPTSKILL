# EDX-WP1-S1-R1 — Editor Chrome Export Cleanup Seam

**Status:** READY TO START
**traces_to:** `EDX-WP1-S1 Acceptance 4`, `EDX-WP1-S1 Acceptance 7`, `EDX-10.1.8`, `EDX-10.3/WP1`, `EDX-10.5`, `EDX-10.8`

## Objective

在不加入 Moveable／Selecto／Floating UI dependency、也不實作 editor interaction 的前提下，為正式 `PPTSKILLEditor.exportHtml()` 建立單一、bounded、可測的 editor-only chrome cleanup seam。Export 必須移除 allowlisted Moveable controls、Selecto selection與context toolbar，同時保持 embedded DeckSpec、presentation DOM、live editor DOM與既有 background cleanup語意不變。

## Measured gap

- Fresh browser evidence `evidence/edx-wp1-s1/browser-adoption-rerun.json` 已證明 Shift多選、drag、resize、真實snap、toolbar positioning、console／pageerror／network與managed lifecycle均PASS。
- 同一 evidence在正式產品fixture注入三種candidate-shaped editor chrome後，`exportHtml()` 同時保留`moveable-control-box`、`selecto-selection`與context toolbar；`exportChromeCleanup=false`。
- `serializeHtml()` 目前只清除 `contenteditable`、`data-editor-selected`與background runtime state，尚無可擴充的editor-only chrome contract。

## Contract

- First-party marker：`data-pptskill-editor-chrome`。任何未來vendor control root或context toolbar必須由PPTSKILL wrapper加上此marker；vendor不得自行擁有export policy。
- Bounded legacy/candidate selectors：`.moveable-control-box`、`.selecto-selection`、`[data-pptskill-context-toolbar]`。只移除匹配的chrome root，不做模糊class substring、任意`[contenteditable]`以外的DOM猜測或全域vendor掃描。
- Cleanup只作用於export clone；live DOM、selection、controls與toolbar在export後仍存在且可繼續使用。
- Marker／selector只代表editor chrome，不得套在`.slide`、`#deck-spec`、`[data-edit-target]`或其他presentation truth上。若contract被誤用於canonical/presentation node，export必須fail loud，不得靜默刪除內容。
- 不把chrome cleanup state寫入DeckSpec、CompositionSpec、history、portable metadata或第二套registry。

## Acceptance

1. RED：direct與browser regression在現行HEAD重現三種chrome均出現在export；failure精準指向`exportChromeCleanup`。
2. GREEN：`exportHtml()`與`prepareExport().html`均不含first-party marker、Moveable controls、Selecto selection或context toolbar。
3. Embedded DeckSpec在export前後deep-equal；export後reopen／recipient parse仍取得相同canonical identity與slide set。
4. Presentation DOM保持完整：slide count、`data-edit-target`集合、文字與component IDs不變；不得以整頁HTML diff冒充cleanup authority。
5. Live editor DOM不被mutation：export後原頁的controls／selection／toolbar仍存在，後續既有text patch或export仍可執行。
6. Contract誤標`.slide`、`#deck-spec`或`[data-edit-target]`時fail loud；不允許cleanup selector吞掉canonical content。
7. Existing background runtime／contenteditable／selected-slide cleanup regression持續PASS；ZIP／recipient reopen／20 MiB gate不退化。
8. Focused direct＋managed browser、PGQ/EDX compatibility、full regression、syntax與`git diff --check` PASS；browser hooks在navigation前註冊且console／pageerror／network為0。

## Blocking edges / checkpoint

- 已滿足：EDX-WP1-S1 static、interaction與lifecycle evidence完成；唯一blocking assertion為export cleanup。
- Current frontier：本repair card。
- Blocked：三個dependency的final `GO | REJECT`、任何dependency commit、stable-ID migration、Operation Registry mutation與EDX-WP1正式interaction implementation。
- Checkpoint：本卡 independent review GO後只回到EDX-WP1-S1 adoption decision；不得自動安裝dependency或開WP1下一功能slice。

## Likely files

- `runtime/deck-editor.js`
- focused direct export test
- focused managed-browser export／reopen regression
- `research/edx/wp1-editor-core-dependency-spike.md`與machine-readable receipt（只在驗收後更新）

## Verification / TDD

- RED：使用目前已重現的三種chrome fixture/probe，先證明正式export漏出。
- GREEN：最小clone-only cleanup helper／selector contract；禁止提前建立Operation Registry或vendor adapter。
- Direct：canonical identity、presentation targets、live DOM與mis-mark fail-loud。
- Browser：export → offline reopen → recipient parse，console／pageerror／network與lifecycle cleanup。
- Full regression、fresh ZIP lifecycle、`git diff --check`。

## Non-goals

- 不加入、vendor或bundle Moveable／Selecto／Floating UI。
- 不實作selection、drag、resize、snap、toolbar positioning、stable IDs、geometry overrides、Undo/Redo或AI bridge。
- 不修改DeckSpec／CompositionSpec schema，不開EDX-WP2～WP4。
- 不merge、push、deploy或發布。
