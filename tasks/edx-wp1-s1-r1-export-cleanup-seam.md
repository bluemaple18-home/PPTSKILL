# EDX-WP1-S1-R1 — Editor Chrome Export Cleanup Seam

**Status:** COMPLETE — INDEPENDENT REVIEW GO
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

- 已滿足：EDX-WP1-S1 static、interaction、lifecycle 與 export cleanup evidence 完成；R1 independent review 已 GO。
- Current frontier：EDX-WP1-S1 dependency adoption decision checkpoint。
- Blocked：任何dependency commit、stable-ID migration、Operation Registry mutation與EDX-WP1正式interaction implementation，直到 adoption decision 明確落定。
- Checkpoint：只做三個候選的 `GO | REJECT | DEFER` 裁決；不得因 R1 GO 自動安裝dependency或開WP1下一功能slice。

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

## Candidate result — 2026-09-19

- 正式 `serializeHtml()` 已接入單一 clone-only cleanup seam；`prepareExport().html` 與 `exportHtml()` 共用同一 contract。
- Allowlist：`data-pptskill-editor-chrome`、`.moveable-control-box`、`.selecto-selection`、`[data-pptskill-context-toolbar]`。誤標 `.slide`／`#deck-spec`／`[data-edit-target]` 或包住 presentation truth 時 fail loud；editor chrome 可正常位於 presentation 容器內而不取得 canonical authority。
- Direct focused：5/5 PASS；syntax、`git diff --check` PASS。
- Fresh managed browser：PASS。`exportChromeCleanup`、`exportCanonicalStable`、`exportPresentationStable`、`liveCanonicalStable`、`livePresentationStable`、`liveEditorChromePreserved`、`misMarkFailsLoud` 全為 `true`；recipient reopen PASS；console／pageerror／network／HTTP errors 全 0；managed lifecycle exit 0 且 owned root 已清除。證據：`evidence/edx-wp1-s1/browser-export-cleanup-r1.json`、`evidence/edx-wp1-s1/browser-export-cleanup-r1-lifecycle.json`。
- Non-browser regression：200/200 PASS。Fresh ZIP install/smoke/uninstall PASS；2,149,207 bytes；SHA-256 `0fb680c0c0c3427bc6f36b47c58004d820a5fecb21cd24419042f9fe6c97bdf8`。
- 本 Native3 sandbox fresh 重播既有 PGQ browser-backed suite 時，`browser-geometry-qa.mjs` 在 Chrome 啟動階段回 `Chrome DevTools port 未就緒`；這是 runner environment blocker，未形成產品 finding。Independent reviewer 需在可啟動 Chrome 的環境補跑既有四個 browser-backed files，再決定本卡 GO。
- 三個 dependency 維持 `DEFER`；未新增 dependency、未修改 DeckSpec／CompositionSpec schema、未開始正式 EDX interaction implementation。

## Independent review repair — 2026-09-19

- Reviewer fresh replay：export／recipient reopen 功能 assertions 全 PASS，既有 PGQ browser compatibility 16/16 PASS，non-browser 200/200 PASS；但 standalone browser runner 在成功後刪除 Chrome profile 時出現 `ENOTEMPTY`，另確認 direct focused 實際為 5/5 而非 8/8，因此判定 REQUEST CHANGES。
- 根因：standalone Chrome 收到 `SIGTERM` 後尚未退出，runner 已立即遞迴刪除 profile；Chrome 的延遲寫入與 profile cleanup 形成 teardown race。
- Repair：runner 僅在 process 尚存時送出 `SIGTERM`，bounded 等待 exit 最多 2 秒，再以 `maxRetries: 5`／`retryDelay: 100` 清除 profile；未改 exporter、DeckSpec、presentation 或 dependency scope。
- GREEN：syntax、direct focused 5/5、`git diff --check` PASS；fresh standalone managed-browser export→offline reopen PASS，console／pageerror／network／HTTP 全 0，process exit 0 且 profile cleanup 不再拋錯。
- Independent re-review：GO。PGQ browser compatibility 16/16、non-browser 200/200、fresh export → offline reopen、console／pageerror／network／HTTP 與 scope boundary 全部通過；R1 正式 COMPLETE。

## Non-goals

- 不加入、vendor或bundle Moveable／Selecto／Floating UI。
- 不實作selection、drag、resize、snap、toolbar positioning、stable IDs、geometry overrides、Undo/Redo或AI bridge。
- 不修改DeckSpec／CompositionSpec schema，不開EDX-WP2～WP4。
- 不merge、push、deploy或發布。
