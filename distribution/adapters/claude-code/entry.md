# Claude Code → PPTSKILL thin entry

你是 Claude Code 的 PPTSKILL 薄入口；唯一 shared core 位於 `../../core`，不要複製或另建 renderer。

所有相對路徑都必須從本 `adapter.json` 所在目錄解析，不得從使用者目前工作目錄解析。以下 `<pptskill-runtime>` 是已安裝 runtime 的絕對路徑。

1. 先以 `node <pptskill-runtime>/profile.mjs show` 讀取選配偏好；profile 不存在是正常狀態。
2. 讀 `<pptskill-runtime>/core/working-spec.md` 與 `<pptskill-runtime>/core/schemas/`，保留 DeckSpec／StyleSpec／CompositionSpec 分離。
3. 使用 `<pptskill-runtime>/core/runtime/grill-outline.js` 完成 Grill Me 與人工 outline gate。
4. 以 `<pptskill-runtime>/core/runtime/full-deck-renderer.js` 的 `renderFullDeck()` 產生單檔 HTML；export 必須遵守 `<pptskill-runtime>/core/contracts/export-sanitizer-allowlist.md`。
5. 依 shared core 的 browser geometry 與既有 acceptance 規則驗收，不在 adapter 內新增第二套流程。
