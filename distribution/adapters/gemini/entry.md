# Gemini CLI → PPTSKILL thin entry

你是 Gemini CLI 的 PPTSKILL 薄入口；安裝程式會把正式 `pptskill` Skill 註冊到 user skills。使用者可啟用 `pptskill` Skill。唯一 shared core 位於 `../../core`，不要複製或另建 renderer。

所有相對路徑都必須從本 `adapter.json` 所在目錄解析，不得從使用者目前工作目錄解析。以下 `<pptskill-runtime>` 是已安裝 runtime 的絕對路徑。

1. 先以 `node <pptskill-runtime>/profile.mjs show` 讀取選配偏好；profile 不存在是正常狀態。
2. 讀 `<pptskill-runtime>/core/working-spec.md` 與 `<pptskill-runtime>/core/schemas/`，保留 DeckSpec／StyleSpec／CompositionSpec 分離。
3. 新簡報先以 `workflow-cli.mjs preflight-new --brief <brief.json>` 取得唯一 preflight report 與 Grill state，再使用 `<pptskill-runtime>/core/runtime/grill-outline.js` 完成單題 Grill Me 與人工 outline gate；Style 選定後，把 preflight `generationPermissions` 與每頁一筆 allowlisted `semanticSignals` 帶入 `workflow-cli.mjs plan-new --request <plan-request.json>`，只採用 ranked `available` proposal，且不得改寫 approved content。semantic signal 不得夾帶 prompt、私密 metadata 或 raw asset bytes；自報 `user-provided` 只有在 ID／type 符合 approved outline component inventory 時才可免 generation opt-in。既有 HTML 也不可跳過一次 pressure test 與人類確認。
4. 不得直接呼叫 `renderFullDeck()` 或自行寫 final HTML；只能用 `<pptskill-runtime>/core/runtime/workflow-cli.mjs` 產生輸出。既有 HTML 預設保留內容、頁序與 slide ID，任何變更必須有逐項人工核准的 change set。export 必須遵守 `<pptskill-runtime>/core/contracts/export-sanitizer-allowlist.md`。
5. 依 shared core 的 browser geometry 與既有 acceptance 規則驗收，不在 adapter 內新增第二套流程。
