# PGQ-WP3 Slice 2 Receipt — E Sweep / Role-aware Text Entrance

**Verdict:** READY FOR REVIEW
**Branch:** `codex/pgq-wp3-s2`
**Base:** `main@b0e1623cfb843df63027e3dc06710541e7067f36`

## Delivered

- `plan-new` 新增 allowlisted `underline-sweep`；targets 只允許 optional `content.title` 接 required `content.subtitle`，role 由 ref 派生，不接受 selector、CSS、duration 或私密 metadata。
- Planner 只在既有七種 primitive、非 `none` motion intensity 與 target canonical text 非空時回 `available`；不改 WP2 selection、content 或 content hash。
- CompositionSpec 沿既有 sanitizer、Node/browser editor、renderer embed、export 與 recipient reparse 往返；未知欄位移除，失配 contract fail loud。
- Renderer 對核准 title／subtitle 使用 bounded opacity/transform entrance；subtitle 以 1px accent pseudo-element `scaleX(0→1)` 做 L→R sweep，不新增 primitive 或任意 CSS 入口。
- 共用 runtime 支援 slide-visible replay、system reduced-motion、forced-static 與缺少 IntersectionObserver 的 static fallback；NumberFlow 路徑維持原 capability truth。
- Packaged Skill 與 Codex／Claude Code／Gemini adapter 均明示 B odometer 與 E underline sweep 的 allowlisted 使用邊界。

## Browser evidence

- Normal：`browser-normal.json` — 2/2 viewports PASS；replay reset 快照為 title/subtitle opacity `0`、underline `scaleX(0)`，70ms 中間態為 title 已開始而 subtitle/underline 仍隱藏；終態、layout stability 與 forced-static PASS。
- Browser editor 把 title/subtitle 改為 `Browser edited title`／`Browser edited subtitle` 後 export；匯出 HTML 已由 Chrome 真實 reopen，embedded DeckSpec、motion metadata、兩個 text entrance targets 與畫面終態一致，`recipientBrowser.status=pass`。
- Reduced：`browser-reduced.json` — 2/2 viewports PASS；replay=false、完整文字與 underline 終態立即可見。
- Forced static：`browser-static.json` — 2/2 viewports PASS；缺少 IntersectionObserver 時完整終態立即可見。
- 三模式的 traceback、console、pageerror、network failure、HTTP error 與 geometry issue 均為 0。
- 代表 HTML：65,757 bytes；SHA-256 `4d6480ffd129868f04c4f54200db943705de5a540c30d5d4bec70d70752798c7`。
- `browser-normal.png`、`browser-reduced.png`、`browser-static.png` 與 normal motion frames 已人工抽查；文字可讀、細底線存在、終態幾何一致。

## Verification

- Slice 2 focused：5/5 PASS。
- WP3 Slice 1/2 + WP2 + R5/R7 targeted：46/46 PASS。
- Full regression：177/177 PASS。
- Slice 1 NumberFlow fresh browser regression：normal 2/2、reduced 2/2 PASS；invalid metric rollback、replay、forced-static 無回退。
- Syntax checks、debug scan、`git diff --check`：PASS。
- Fresh ZIP：1,929,199 bytes，低於 20 MiB；SHA-256 `7a84ae95a66a290d0f8edb8c317170ec0eb774098329c4b81f13b618b864b546`；fresh install/smoke/uninstall lifecycle PASS，Gemini CLI 維持 missing/UNVERIFIED。

## Review repairs

- Browser harness 原本只以 Node reparse exported HTML；已改為將匯出檔重新載入同一隔離 Chrome context，核對 recipient DOM、embedded DeckSpec、motion metadata 與 resting state。
- Packaged instructions 原本只提 B odometer；已補 E underline sweep，並以 fresh ZIP regression 確認 Skill 與三個 adapter 都含相同邊界。
- Subtitle-only 是合法 target set；evaluator 現只驗證實際 targets，不再錯誤要求未選取的 optional title 非空。
- `replaySlide()` 原本只等兩個 animation frame，未讓 320ms + 120ms delay 的退場完成，browser harness 又只驗終態而形成假陽性。Repair 1 改為以 bounded `motion-resetting` class 暫停 transition、強制提交完整 hidden state，再恢復 transition 播放 title→subtitle；harness 現直接驗 reset 與 70ms 中間序列，修補前同一 assertion 為 RED、修補後 2/2 viewports GREEN。

## Deferred boundary

- Grouped keyPoint reveal、專業 timeline、背景 effects、Vanta／Three.js／p5.js、14 類背景 vocabulary、WP4 與 EDX formal integration 均未開始。
- 本 receipt 是 Slice 2 review candidate，不代表已 merge、已 push 或整個 PGQ-WP3 COMPLETE。
