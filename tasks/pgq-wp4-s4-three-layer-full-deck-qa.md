# PGQ-WP4-S4 — Three-Layer Readability and Full-Deck QA Closure

**Status:** COMPLETE — INDEPENDENT REVIEW GO
**traces_to:** `PGQ-D05`, `PGQ-D09`, `PGQ-D11`

## Objective

沿用 Slice 1～3 的 Representative Sample、trusted browser evidence、bounded repair budget 與 approval freeze，補齊 G7 尚未落地的三層可讀性及逐頁 full-deck QA。Sample approval 只保留為代表頁 checkpoint；交付判定必須對同一 canonical artifact 的每張 slide 完成 hard checks，並記錄具引用理由的 Layer-2 advisory 與同 identity 的 Layer-3 Owner confirmation。

## Measured gap

- Slice 1～3 已閉環 representative selection、hard gate、repair budget、human sample freeze、scope-aware feedback planning 與 affected-only invalidation。
- 現有 trusted producer 只以 representative sample 建立 approval authority；尚無單一 release decision 證明 full deck 每頁均已檢查。
- PGQ-D11 要求 Layer 2 結構／閱讀風險只能是有引用理由的 advisory，Layer 3 必須保留 Owner／製作者對本 deck 的明確確認；目前兩層均未契約化。
- `sampleCount=0` 已能跳過人工 sample wait，但尚無完整 release gate 證明它不會同時跳過逐頁 QA。

## Input / output contract

- Input：portable HTML artifact、artifact 內 sanitized DeckSpec、optional approved sample freeze、同一 artifact identity 的 bounded advisory items、Owner confirmation，以及既有 repair history。
- Layer 1 由 packaged trusted browser producer 對 artifact 內全部 slides 產生 content integrity、geometry、static readability、animation interference evidence；caller 不得自報 PASS、slide coverage、artifact fingerprint 或 full-deck verdict。
- Layer 2 只接受 allowlisted risk code、受影響 slide IDs、具體 `evidenceRefs` 與 `reason`；狀態只可為 `advisory | resolved | accepted-risk | unknown`，不得升格為客觀 PASS 或覆蓋 Layer 1 failure。
- Layer 3 必須由 Owner／製作者明示確認，並綁定同一 artifact／DeckSpec／contract identity；identity 改變即失效。未確認時只能 `awaiting-owner`，不得宣稱 release PASS。
- Output：immutable three-layer receipt、每頁 Layer-1 coverage、unresolved advisory、Owner confirmation state、共用 repair-budget decision、`samplePassDoesNotImplyFullDeckPass=true` 與單一 `pass | repair | blocked | awaiting-owner` release decision。
- Repair 次數沿用 Slice 2 的 `slideId + issue code` history，不因 sample/full-deck 或 Layer 1～3 切換而重置；本 slice 只輸出既有 allowlisted repair action，不自行改文、拆頁或 mutation。

## Acceptance

1. Trusted producer 的 coverage 必須與 embedded DeckSpec slide IDs 完全一致；缺頁、多頁、duplicate ID、NOT_RUN／UNKNOWN 或任一 hard-check failure 均 fail closed。
2. Sample PASS／freeze、`sampleCount=0` 或 Owner confirmation 均不能替代 Layer 1 full-deck checks；偽造 full-deck PASS／coverage／identity 必須被拒絕。
3. Layer-2 advisory 必須逐項引用已收集 evidence 與 slide；未知 code、缺引用、錯 artifact identity、任意 score 或客觀 PASS 文案均 fail loud。
4. Layer-2 unresolved risk 只能導向 `repair | blocked | awaiting-owner`；`accepted-risk` 必須由 Layer-3 confirmation 明示涵蓋，不得自動接受。
5. Layer-3 confirmation 綁定同一 artifact identity；content、composition、style、motion、contract 或 slide set 改變後不得沿用舊確認。
6. 同一 issue 最多兩次 repair，第三次前 blocked；計數跨 sample/full-deck 與各 layer 共用，保留 last-success artifact。
7. 不 secret shrink-to-fit、不自動 shortening／split／semantic change；需要內容或頁數變更時回到既有 human confirmation boundary。
8. Direct 與 installed CLI parity；Focused、WP4 compatibility、PGQ targeted、full regression、fresh ZIP lifecycle、managed browser、syntax 與 `git diff --check` PASS。

## Blocking edges / checkpoint

- 已滿足：PGQ-WP4 Slice 1～3 COMPLETE 且 independent review GO；trusted producer、stable identity、repair budget 與 sample freeze 可重用。
- Frontier：已關閉。G7／WP4 completion candidate 已完成驗收並取得 independent review GO；不需要另開 Slice 5。
- Checkpoint：不預設 Slice 5。若實作發現必須新增 renderer primitive、任意 LLM judge、第二套 evidence store 或自動內容 mutation，停止並回 Mainline 重切，不把 scope 塞入本卡。

## Likely files

- `runtime/representative-qa-evidence.js`（抽出可覆蓋指定／全部 slide 的 trusted producer seam）
- `runtime/representative-qa-gate.js` 或最小 `runtime/full-deck-qa.js`
- `runtime/workflow-cli.mjs`
- focused direct／installed／browser tests
- packaged Skill／thin adapters（只同步唯一 CLI contract）

## Non-goals

- 不新增 QA service、DB、ledger、workflow engine、per-layer agent、任意 AI score 或第二套 DeckSpec truth。
- 不執行自動文案改寫、split slide、renderer primitive、profile write 或 Golden grammar 更新。
- 不把 Layer-2 advisory 冒充 deterministic hard gate，不把 Owner confirmation 冒充 browser evidence。
- 不重開 WP1～WP3、WP4 Slice 1～3、EDX、Slice 5、merge、push 或 deploy。

## Verification

- TDD RED：partial/duplicate coverage、sample shortcut、caller-authored PASS/identity、stale Owner confirmation、unreferenced advisory、unknown advisory、accepted-risk 未獲涵蓋、repair count reset。
- Direct/installed CLI parity；WP4 Slice 1～3 compatibility。
- Managed Chrome：static／normal × supported viewports；console、pageerror、network、HTTP、geometry、content integrity、motion interference 與 lifecycle cleanup。
- PGQ targeted、full suite、fresh ZIP install/smoke/uninstall、syntax、`git diff --check`。

## Candidate result

- Implementation commit：`807f805`；task／frontier commit：`499abf9`。
- Focused Slice 4：8/8 PASS；WP4 Slice 1～4 compatibility：28/28 PASS；full regression：211/211 PASS。
- Managed local Chrome 由 trusted producer 跑 static／reduced／normal × 1600×900／1280×720；完整 coverage、console／pageerror／network／HTTP／geometry／content integrity／motion gate 均由 receipt contract 驗證。Static／reduced 的 required-target visibility 最終權威為同 renderer、viewport、DPR、font 與 final-state 條件下的 canonical/candidate raster signal；DOM/style/hit-test 只保留 cheap precheck。
- 對抗測試證明單頁 visible-content mismatch 只產生該頁 `content_integrity` issue，且 sample/full-deck 共用兩次 repair budget；caller-authored PASS／coverage／evidence、stale Owner identity、無引用 advisory 與跳過 Layer 2 均 fail closed。
- Fresh ZIP install/smoke/uninstall PASS；2,148,747 bytes；SHA-256 `0011b5736ed58d47e5b3a6b95fbb418d653f4a6aedd385d26ff2cf0b87ddd710`。
- Syntax 與 branch-range `git diff --check` PASS；Codex Native3 independent re-review 對鎖定 HEAD `5ede238311ddaf83c1ee4055761f7a73ed5ad6db` 給出 GO。Slice 4 COMPLETE；不開 EDX 或後續 Slice。

## Review repair 1

- 前次 P1 證明 hidden required title 會被舊 `visible()` 排除，且 global motion PASS 被複製到各頁。Producer 現從 canonical render 列出每張 slide 的 required `data-edit-target`，沿 element→slide ancestor chain 驗證 `display`／`visibility`／effective opacity 與 non-zero box，輸出逐頁 `requiredVisibility` evidence。
- Static readability 只在該頁 geometry 與 static required targets 全 PASS 時通過；animation interference 另要求 normal required targets 與 motion runtime PASS，不再只有 global motion verdict。
- 原始 `#decision [data-effect-title]{opacity:0!important}` probe 先重現 `Missing expected rejection`，修後 browser receipt `requiredVisibility=fail`，full-deck decision 對該頁回 `static_readability`＋`animation_interference` repair；其他頁不受影響。
- Repair commit：`d39fbe9`；更新後 gates 如上，等待 independent re-review。

## Review repair 2

- Re-review P1 證明 `clip-path: inset(...100%...)` 保留 box／opacity，仍可繞過 Repair 1。共同錯誤假設修正為：required target 必須有足夠實際 painted hit area，不能只以 CSS layout properties 推論。
- Producer 現逐頁 scroll 至 viewport，對每個 canonical target 以 3×3 browser hit-test 取樣；少於 5 個有效 samples 或 painted coverage 低於 50% 即 `painted_area_insufficient`。這同時受 ancestor visibility、clip-path、stacking/cover 與 non-zero box 約束。
- 同一 probe 同時保留 `decision opacity:0` 與新增 `guardrails clip-path`；RED 為 clip target 未出現 fail，修後兩頁在 static／normal 各自精準產生 readability／animation issues，正常 deck 不誤殺。
- Repair commit：`fe255b1`。WP4 compatibility 28/28 PASS；full regression 以 serial browser lifecycle 211/211 PASS（並行跑曾有單一 Chrome DevTools port 啟動競爭，該檔單獨 7/7 PASS）；等待 independent re-review。

## Review repair 3 — raster visibility authority

- 第三次 P1 證明 `filter: opacity(0)` 仍可保留 layout、computed opacity 與 hit-test，property enumeration 已不足以作 final visibility authority。Owner 明示授權只在 Slice 4 acceptance contract 內升級，不新增 renderer、service、canonical truth、Slice 5 或 EDX。
- Producer 在同一 Chrome、renderer、viewport、DPR=1、font-ready 與 deterministic static/reduced final state，依 canonical `data-edit-target` identity 對每個 required target 各取 normal raster 與僅隱藏該 target 的 raster；兩者差值量化 target 實際 pixel contribution，再與 canonical render 的同 target signal 比較。每 channel delta `<12` 視為 AA/subpixel noise；candidate coverage `<60%` 分類 `partially_occluded`，energy `<40%` 分類 `insufficient_contrast`，signal 接近零分類 `fully_invisible`。
- `static_readability` 現要求 static＋reduced 每頁 raster PASS；`animation_interference` 要求同一 final-state raster PASS 加 normal motion PASS。Normal motion 不再把 global resting-visibility verdict 複製為每頁結果。
- 同一 browser test 保留 `opacity:0`、full clip-path、ancestor `filter:opacity(0)`，另加入 partial clip、低 opacity 與 canonical identity 缺失 probes；六張受影響頁各自產生精準 repair，其餘頁不受污染。Focused 8/8、WP4 compatibility 28/28、PGQ targeted 94/94、full regression 211/211 PASS。

## Review repair 4 — normal resting-frame raster

- Re-review P1 證明 `html:not(.motion-static)` 可讓 target 只在 normal mode 不可見；前版 normal receipt 在 motion trace 內 `forceStatic()` 後才跑 geometry，且 raster 僅 static／reduced，導致 Layer-1 錯誤 PASS。
- RED 在同一 adversarial test 加入 `html:not(.motion-static) #problem [data-effect-title]{filter:opacity(0)!important}`；舊 receipt 明確回 `rasterVisibility=not_applicable`。
- Producer 現對 normal 重新載入 canonical/candidate，同 renderer／viewport／DPR／font 下把 motion roots 推到 resting frame並等待 1300ms，但不呼叫 motion `forceStatic()`、不建立 `.motion-static`；只凍結 background 避免 animation pixel noise。Normal raster 成為 `animation_interference` 的逐頁必要 evidence，static readability 仍由 static＋reduced raster 負責。
- Reviewer probe 現只產生 `problem.animation_interference`，不污染該頁 static readability 或其他頁。Focused 8/8、WP4 compatibility 28/28、full regression 211/211、fresh ZIP lifecycle PASS。

## Review repair 5 — canonical spatial authority

- Re-review P1 證明 normal raster 原先跟著 candidate target box 移動；`translateX(400px)` 雖改變閱讀位置，target-only raster signal仍近似 canonical，因此可能錯誤 PASS。
- RED 在同一 normal adversarial artifact 加入 `#metrics` title 的 `translateX(400px)`；舊 receipt 沒有 `position_mismatch`。
- Candidate capture 現固定使用 canonical target 的 slide-relative coordinates，不再跟隨 candidate box；同時比較 canonical/candidate normalized box。位置差超過 slide 的 0.5% 分類 `position_mismatch`，尺寸差超過 1% 分類 `size_mismatch`，再進 coverage／energy visibility分類。
- Probe 現只產生 `metrics.animation_interference`，不誤標 static readability 或其他頁。Focused、full regression 211/211、fresh ZIP lifecycle PASS。

## Review repair 6 — slide-root spatial authority

- Re-review P1 證明 Repair 5 的 target box 與 raster clip 都相對 candidate slide；normal-only `#proof{transform:translateX(400px)}` 會讓整張 slide 與 target 一起移動，target normalized box 不變，capture 又跟隨 candidate slide，因而可能錯誤 PASS。
- RED 加入獨立 slide-root displacement probe；舊 receipt 未輸出 `slide_position_mismatch`，證明 target-level authority 不足以綁定 viewport position。
- Canonical signal 現攜帶 slide absolute page box 與 required target absolute canonical page clip。Candidate capture 固定使用 canonical page coordinates，不再跟隨 displaced candidate slide；另比較 canonical/candidate slide page position與尺寸，tolerance 分別為 slide dimension 的 0.5% 與 1%，超界輸出 `slide_position_mismatch`／`slide_size_mismatch`。既有 target `position_mismatch`／`size_mismatch` 與 raster visibility classification維持不變。
- Probe 只使 `proof.animation_interference` fail；target-only transform仍精準使 `metrics.animation_interference` fail，其餘 visibility／contrast／clip／missing identity probes均保留。Focused browser regression PASS；full regression 211/211；fresh ZIP install/smoke/uninstall PASS。Implementation commit：`1acdeb8`；ZIP 2,148,747 bytes，SHA-256 `0011b5736ed58d47e5b3a6b95fbb418d653f4a6aedd385d26ff2cf0b87ddd710`。
