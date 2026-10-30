# PGQ-WP4 Slice 4 Candidate Receipt

**Status:** COMPLETE — INDEPENDENT REVIEW GO
**Range:** `e9172136..HEAD`

## Delivered contract

- `qa-full-deck` 只接受 portable artifact 與 bounded request；Layer-1 PASS、checks、coverage、identity 均由 packaged Chrome producer 派生，caller 不得自報。
- Layer 1 完整覆蓋 canonical DeckSpec 的每張 slide；content integrity、geometry、static readability、animation interference 皆有 current evidence ref，partial／duplicate coverage fail closed。
- Layer 2 必須明示 AI review 完成、綁定同一 artifact identity、引用 current trusted evidence，finding count 必須與 bounded advisory 一致；無 review、UNKNOWN、任意 score／code 或舊引用不得通過。
- Layer 3 必須由 human 明示確認且綁定同一 identity；artifact／DeckSpec／contract 改變後舊確認失效。`accepted-risk` 必須逐 code 由 Layer 3 涵蓋。
- Sample approval 與 `sampleCount=0` 均沒有 full-deck release authority。Hard issue 沿用 `slideId + code` 的兩次 repair budget；不執行自動改文、拆頁或 renderer mutation。

## Verification evidence

- Focused Slice 4：8/8 PASS。
- WP4 Slice 1～4 compatibility：28/28 PASS。
- Full regression：211/211 PASS。
- Managed local Chrome：static／reduced／normal × 1600×900／1280×720；trusted producer lifecycle PASS。
- Visible-content tamper：只對受影響 slide 產生 `content_integrity` repair；兩次既有 action 後 blocked。
- Direct／fresh-installed CLI parity：PASS；fresh ZIP install/smoke/uninstall：PASS。
- ZIP：2,148,747 bytes（低於 20 MiB）；SHA-256 `0011b5736ed58d47e5b3a6b95fbb418d653f4a6aedd385d26ff2cf0b87ddd710`。
- Syntax、`git diff --check`：PASS。

## Boundaries

- 無 QA service、DB、ledger、workflow engine、任意 AI score、profile write、renderer primitive 或自動內容 mutation。
- 無 WP1～WP3 reopen、EDX、Slice 5、merge、push、deploy。
- 原有 `.DS_Store`、`CLAUDE.md` 與兩份 HANDOFF untracked files 未動。

## Review repair 1

- Finding：CSS 可將非首張 required title 設為 `opacity:0`，舊 geometry 與 global motion gate 仍可能全部 PASS。
- RED：`tests/pgq-wp4-s4-required-visibility.test.mjs` 初次執行為 `Missing expected rejection`。
- Fix：browser producer 逐頁比對 canonical `data-edit-target`，檢查 target 及 ancestor 的 display／visibility／opacity／box，並輸出 `requiredVisibility`；full-deck mapper 分別把 static 與 normal visibility 綁到該頁 hard checks。
- GREEN：同一 hidden `decision` title 使 browser receipt fail，且 full-deck decision 只回該頁 `static_readability`、`animation_interference` issues；Focused 8/8、WP4 28/28、Full 211/211、fresh ZIP lifecycle PASS。

## Review repair 2

- Finding：fully clipped required title 仍有 non-zero box 與 opacity 1，可繞過 property-only visibility。
- RED：同一 browser test 加入 `#guardrails [data-effect-title]{clip-path:inset(0 0 100% 0)!important}`，receipt 未把該 target 判 fail。
- Fix：每張 slide scroll 入 viewport 後，以 3×3 `elementFromPoint` painted-area sampling 驗證 canonical targets；有效 samples <5 或 coverage <50% fail closed。Opacity probe 與 clip-path probe 同時保留。
- GREEN：兩個 targets 分別只使自己的 static readability／normal animation interference 失敗；WP4 28/28 PASS。Full suite 的並行 Chrome 啟動曾出現單一 DevTools port 環境競爭，該檔單獨 7/7 PASS；改用 serial browser lifecycle 後完整 211/211 PASS。

## Review repair 3 — raster visibility authority

- Finding：ancestor `filter: opacity(0)` 不改 element box、computed opacity 或 hit-test，Repair 2 仍會把整張不可見 slide 判 PASS。這是 acceptance model 缺口，不再追加 CSS 特例。
- RED：在既有 adversarial browser test 加入 `#portable{filter:opacity(0)!important}`，新契約要求的 `rasterVisibility` gate 不存在而 FAIL。
- Fix：static／reduced 模式在同一 Chrome、renderer、viewport、DPR=1、font-ready、forced-final 條件下，依 canonical `data-edit-target` 逐 target 比較 normal raster 與 target-only hidden raster，再以 canonical 同 target signal 校準 candidate coverage/energy。DOM/style/hit-test 保留 precheck，不再是 final authority；normal 只負責 motion 行為，final-state 可見性不再由 global role snapshot 代替逐頁 evidence。
- Classification：近零 signal=`fully_invisible`；coverage ratio `<0.60`=`partially_occluded`；energy ratio `<0.40`=`insufficient_contrast`；canonical identity 在 candidate 缺失=`required_target_missing`；每 channel delta `<12` 當作 AA/subpixel noise。Test 同時驗證 opacity、clip-path、ancestor filter、partial clip、低 opacity 與 target identity removal，且只標記實際受影響頁。
- GREEN：Focused 8/8、WP4 compatibility 28/28、PGQ targeted 94/94、full regression 211/211 PASS；fresh ZIP install/smoke/uninstall PASS，2,148,248 bytes，SHA-256 `20e8dfa552246ba116416c2ca4fcbc7848319f3cae93062da9562db20bcae654`。

## Review repair 4 — normal-motion-only visibility

- Finding：`html:not(.motion-static)` 可只在 normal mode 隱藏 required target；static／reduced raster PASS，而 normal motion trace 在 `forceStatic()` 後才執行其他 visibility checks，導致逐頁 `animation_interference` 錯誤 PASS。
- RED：加入 `#problem` normal-only `filter:opacity(0)` probe 後，browser receipt 回 `rasterVisibility=not_applicable`，精準重現 authority 缺口。
- Fix：normal mode 現重新載入 canonical/candidate，在不呼叫 motion `forceStatic()`、不加入 `.motion-static` 的 resting frame做逐 target raster；motion roots 明確進入 `is-visible` 並等待 1300ms，background 單獨 forced-static 以消除 raster noise。`animation_interference` 現要求該頁 normal raster＋normal motion 均 PASS。
- GREEN：probe 只使 `problem.animation_interference` fail，static readability 仍 PASS；其餘 opacity／clip／filter／contrast／missing-identity probes保持精準。Focused 8/8、WP4 compatibility 28/28、full 211/211、ZIP lifecycle PASS；ZIP 2,148,278 bytes，SHA-256 `9065b7844259ece466169f2b8b975dbab89b2c225008bfa52fa83b9d97037ac0`。

## Review repair 5 — normal positional interference

- Finding：normal candidate raster clip 跟著 target 移動，只比較 coverage／energy；`translateX(400px)` 仍有相似像素 signal，可繞過逐頁 `animation_interference`。
- RED：加入 `html:not(.motion-static) #metrics [data-effect-title]{transform:translateX(400px)!important}` 後，舊 normal receipt未輸出 `position_mismatch`。
- Fix：canonical signal 現攜帶 slide-relative normalized box；candidate normal/hidden screenshots固定採 canonical coordinates，另直接比較 candidate box。位置 tolerance 為 slide dimension 的 0.5%，尺寸 tolerance 為 1%；超界分別輸出 `position_mismatch`／`size_mismatch`。
- GREEN：probe 只使 `metrics.animation_interference` fail，該頁 static readability與其餘頁保持 PASS；既有 visibility、contrast、partial clip、missing identity及 normal-only invisibility probes全數保留。Full regression 211/211、ZIP lifecycle PASS；ZIP 2,148,629 bytes，SHA-256 `8d84d47763845aaf8a4107edf77272bc66139c1e4fd9ee78929c187bcf4673dd`。

## Review repair 6 — slide-root spatial authority

- Finding：normal-only slide-root transform 會讓 target 與 candidate slide 同步位移；Repair 5 的 slide-relative box 不變，且 raster clip 跟隨 candidate slide，故可能錯誤 PASS。
- RED：加入 `html:not(.motion-static) #proof{transform:translateX(400px)!important}`，舊 authority 未回 `slide_position_mismatch`。
- Fix：canonical raster signal 新增 absolute page-space slide box與 target clip；candidate screenshot固定取 canonical page clip，並獨立比較 slide page position／size。位置 tolerance 0.5%，尺寸 tolerance 1%；超界分別為 `slide_position_mismatch`／`slide_size_mismatch`。Target-level position／size及既有 pixel visibility authority不變。
- GREEN：`proof` 只產生 `animation_interference` issue；`metrics` target-only transform仍為 `position_mismatch`，既有 normal-only invisibility、opacity、clip、ancestor filter、partial clip、contrast與 missing identity probes全數精準。Focused browser regression PASS；full regression 211/211；ZIP lifecycle PASS。Implementation commit `1acdeb8`；ZIP 2,148,747 bytes，SHA-256 `0011b5736ed58d47e5b3a6b95fbb418d653f4a6aedd385d26ff2cf0b87ddd710`。

## Independent review result

- Codex Native3 對鎖定 candidate `5ede238311ddaf83c1ee4055761f7a73ed5ad6db` 完成唯讀 re-review並給出 **GO — PGQ-WP4 Slice 4**。
- Branch `codex/pgq-wp4-s4`、tracked-clean worktree與既有四個 untracked files均核對一致；review過程未 repair、merge、push，也未開 EDX／Slice 5。
- Slice 4 COMPLETE，允許由 Mainline執行本地 integration；remote publication仍需另行授權。
