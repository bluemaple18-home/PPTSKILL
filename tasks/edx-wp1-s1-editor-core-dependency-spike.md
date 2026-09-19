# EDX-WP1-S1 — Editor Core Dependency Spike

**Status:** READY TO START
**traces_to:** `EDX-10.1.1`, `EDX-10.1.4`, `EDX-10.1.8`, `EDX-10.2`, `EDX-10.3/WP1`, `EDX-10.5`, `EDX-10.7`, `EDX-10.8`

## Objective

在不修改 PPTSKILL runtime、不加入正式 dependency 的前提下，對 EDX-WP1 的 `Moveable + Selecto + Floating UI` 做 prior-art-first 實測，回答三者是否能沿用既有 browser editor／DeckSpec／CompositionSpec／geometry gate，支援 bounded drag、resize、marquee、多選、snap 與 contextual toolbar positioning，而不建立第二套 canonical state 或自由畫布。

## Inputs / outputs

- Input：`BACKLOG.md` 第 10 節、`research/editor-prior-art.md`、既有 `runtime/deck-editor.js`、schema／sanitizer／renderer／export 與 geometry gates。
- Temporary harness：只可位於受管 temp directory；不得把 spike dependency、bundle、profile 或 cache 提交到 repo。
- Output：`research/edx/wp1-editor-core-dependency-spike.md`，逐 dependency 記錄 pinned version、來源、license／NOTICE、integrity/checksum、實測 minified／gzip／inline bytes、browser/offline 行為、架構適配、custom delta 與 `GO | DEFER | REJECT`。
- Decision：只能決定是否允許後續 WP1 implementation card 採用；不能直接新增 dependency 或改 runtime contract。

## Acceptance

1. 版本、license、package integrity 與 upstream 狀態來自 official repository／registry evidence；禁止 `latest` runtime import、CDN 或只看 donor 敘述。
2. Bundle 成本以實際 pinned packages 建立最小 browser harness後量測 minified、gzip 與 inline HTML bytes；另列三者合併增量，對照 12 MiB warning／20 MiB hard fail。
3. Fresh browser 在 offline／無 external request 條件下實測：單選、marquee／Shift多選、drag、resize、snap guide、toolbar viewport collision；console、pageerror、requestfailed 為零。
4. 明確驗證 editor DOM state 不是 canonical truth：gesture output只能被映射成 bounded operation payload；selection、guides、handles、toolbar均為 editor chrome，不進 export。
5. 列出 stable element identity 與 Unified Operation Registry 所需 custom delta；不得用套件內部 element reference、任意 CSS或 raw DOM snapshot替代 DeckSpec／CompositionSpec。
6. 對每個 candidate回答 `Why not less / Why not more / Do not absorb`；Selecto 或 Floating UI若可由既有能力充分替代，必須 DEFER／REJECT，不因組合常見而全收。
7. 不修改 runtime、schema、sanitizer、renderer、editor、export、ZIP 或 lockfile；不開始 EDX-WP1 implementation，不開 WP2～WP4。
8. Research artifact、syntax／link check（若適用）、`git diff --check` PASS；independent review對 evidence與結論給出 GO後，才能切 implementation slice。

## Blocking edges / frontier

- 已滿足：PGQ-WP1～WP4 COMPLETE；EDX Owner方向與 mandatory prior-art gate已存在。
- Current frontier：本 research-only spike。
- Blocked：EDX-WP1 implementation、stable-ID schema migration、Operation Registry mutation path與任何 dependency commit。
- Checkpoint：若實測需要第二 renderer、第二 canonical model、中央服務、任意 HTML/CSS patch或放寬20 MiB gate，立即 `REJECT / BLOCK_SCOPE_EXPANSION`。

## Verification

- Official source／registry cross-check與可重現 package checksum。
- Temporary pinned-package bundle與離線 browser harness receipt。
- Browser hooks在 navigation前註冊 console／pageerror／requestfailed；保存精簡 evidence refs。
- Repo status證明僅 task／research control artifacts改動，無 dependency或runtime mutation。
- `git diff --check`。

## Non-goals

- 不實作 drag／resize／selection UI。
- 不新增 npm/pnpm dependency、lockfile、vendored JS、build pipeline或永久 test harness。
- 不決定 WP2 content/asset、WP3 history/motion或WP4 compatibility細節。
- 不 merge、push、deploy或發布新 ZIP。

