---
id: PRESENTATION-V0.1-PLAN
status: ready-for-implementation
type: implementation-plan
spec: presentation-skill/working-spec.md
jira: not-applicable
jira_reason: v0.1 僅建立本機實作切片；未授權建立外部追蹤項目。
---

# v0.1 垂直實作計畫

## 目標、邊界與規劃規則

本計畫只落實 `working-spec.md` 的 v0.1：以現有 Codex、Claude Code、Gemini runtime 的薄入口，產出離線單檔 HTML 簡報與可重播證據。每張卡都交付一條可操作的路徑，而非先完成全部 UI、全部 schema 或全部文件。

- 不建立資料庫、中央 runtime、常駐 renderer、FSM 服務、第二套 lifecycle 或無限 retry loop。
- 流程狀態與 receipt 只留在 artifact／manifest；同一問題最多修復兩次，第 3 次交由人類選擇，並保留最後成功 artifact。
- 所有 `traces_to` 引用既有穩定 ID；本計畫的 `PS-*` ID 永不重編。若日後移除切片，保留 tombstone，不重用 ID。
- 敘事與美感為 advisory；不得單獨讓 release 通過。所有 release 都要有 deterministic evidence 與人類核准。

## 追溯與 preflight

| 切片群 | traces_to | 覆蓋說明 |
|---|---|---|
| PS-001、PS-002 | US-002、US-003；FR-003、FR-004、FR-005；SC-003 | 先證明單檔 HTML 的三模式與本機驗證可運行 |
| PS-003 | US-001；FR-001、FR-002；SC-001 | 真實 HTML/CSS 四 Theme 封面與人工選款 receipt |
| PS-004、PS-005 | US-001、US-003；FR-001、FR-002、FR-003；SC-001、SC-002、SC-004 | brief／outline、artifact lineage、單檔與畫面證據 |
| PS-006、PS-007 | US-001、US-002；FR-004、FR-006；SC-001 | profile precedence 與三個 runtime 的薄入口 |
| PS-008 | US-001、US-002、US-003；FR-001 至 FR-006；SC-001 至 SC-004 | 完整 release path 與可重播封裝 |

執行任何 mutation 前，實作者必須完成 trace preflight：確認 `PS-*` 無重複、每張卡至少有一個 `traces_to`、所有 blocking edge 已通過，以及每張卡有可執行的驗證。未解的 **TF-002** 是 non-blocking；入口找不到 profile 時採無記憶模式。任何 dangling trace、未解 blocking decision 或缺少驗證方式均為 Critical，不能開始該 slice。

建議 preflight 指令（在新增 validator 後由其延伸支援 plan／spec 的靜態檢查）：

```sh
pnpm --dir presentation-skill exec node tools/validate-plan.mjs \
  --spec working-spec.md \
  --plan implementation-plan.md
```

## 依賴圖與 current frontier

```text
PS-001 → PS-002 → CP-01 → PS-003 → PS-004 → PS-005 → CP-02
                                                        ├→ PS-006 → PS-007 → CP-03 → PS-008 → CP-04
                                                        └───────────────────────────────────────────────┘
```

| 目前 frontier | 可立即開始的原因 | 尚未解除的 blocking edge |
|---|---|---|
| **PS-001** | 僅需本機 fixture，不依賴 brief、Theme、profile 或外部 runtime | 無 |

其餘切片必須依上圖 forward-only 推進；不得跳過對應 checkpoint。`PS-006` 在 PS-005 後可開始，但 `PS-008` 必須等待 PS-006 與 PS-007 都完成。

## 切片

### PS-001｜內部三頁功能測試樣本：三模式可操作路徑

- **traces_to**：US-002；FR-003、FR-005；SC-003
- **depends_on**：無
- **blocking_edges**：無；完成後解除 PS-002。
- **input → output**：固定的三頁功能測試 fixture → 可離線開啟的 `deck.html`，包含播放、前後導航、presenter、重排、複製、刪頁、另存控制。Presenter 顯示當前講稿、下一頁提示、來源、進度，播放預設隱藏。
- **deterministic／advisory**：控制切換、頁面計數、操作結果與講稿可見性是 deterministic；功能測試用詞與視覺設計是 advisory。
- **gate_type**：`cmd_gate`（功能 smoke）。
- **acceptance**：功能測試樣本可在 fresh state 開啟；每項指定操作成功；一般播放不顯示 presenter 資訊；講稿 fixture 不含機密。此樣本只測 runtime，不構成正式簡報頁數限制。
- **verification**：`pnpm --dir presentation-skill exec node --test tests/ps-001-functional-sample.test.mjs`
- **likely_files**：`presentation-skill/runtime/deck.js`、`presentation-skill/fixtures/functional-test-sample.json`、`presentation-skill/tests/ps-001-functional-sample.test.mjs`
- **rollback**：刪除新增 runtime／fixture／測試檔；不修改 `working-spec.md`，最後成功 HTML fixture 保留作診斷證據。
- **TDD**：適用；先寫從使用者操作可觀察到的 smoke test，再做最小 UI 與狀態更新。

### PS-002｜功能測試樣本 validator 與 capability probe

- **traces_to**：US-002、US-003；FR-003、FR-004、FR-005；SC-003
- **depends_on**：PS-001
- **blocking_edges**：PS-001 的樣本操作 smoke 必須 pass；完成後解除 PS-003。
- **input → output**：PS-001 的 `deck.html` 與 fixture → `render-evidence.json` 的 capability probe（`canRead`、`canRender`、`canScreenshot`、`canSave`）、三模式 smoke 與 gate receipt。
- **deterministic／advisory**：probe、操作序列與 receipt schema 是 deterministic；人工對 presenter 易用性的意見是 advisory，若不適用可移除 presenter 後重驗。
- **gate_type**：`schema_gate` + `cmd_gate`。
- **acceptance**：validator 對 `pass`／`fail`／`blocked` fail-loud；同一問題第 3 次修復時停止並輸出人類選擇資訊；fail 不覆寫最後成功 evidence。
- **verification**：`pnpm --dir presentation-skill exec node tools/validate-sample.mjs --deck fixtures/deck.html --evidence fixtures/render-evidence.json`
- **likely_files**：`presentation-skill/tools/validate-sample.mjs`、`presentation-skill/runtime/capability-probe.js`、`presentation-skill/tests/ps-002-validator.test.mjs`
- **rollback**：移除 validator／probe 與其測試；保留最後一份成功 evidence，避免回退時喪失可重播證據。
- **TDD**：適用；先覆蓋 capability 為 false、receipt fail、第三次修復三種失敗路徑。

### CP-01｜最小 runtime checkpoint

只有 PS-001、PS-002 均 pass 才能繼續。重新在 fresh state 執行樣本 validator，確認三模式、七項操作與 capability probe 有 receipt；若結果是 blocked，停在 CP-01，交由人類選擇 runtime 等價能力或縮減範圍。

```sh
pnpm --dir presentation-skill exec node tools/validate-sample.mjs --deck fixtures/deck.html --evidence fixtures/render-evidence.json
```

### PS-003｜四 Theme 真實封面預覽與選款 receipt

- **traces_to**：US-001；FR-001、FR-002；SC-001
- **depends_on**：CP-01
- **blocking_edges**：CP-01 必須 pass；完成後解除 PS-004。
- **input → output**：固定的真實標題／副標 fixture 與四套 token → 四張 16:9 真實 HTML/CSS 預覽與 `theme-preview-manifest.json`（含選定 Theme 和 receipt）。這是可操作的選款 path；PS-005 才把它接到真實 outline。
- **deterministic／advisory**：四個預覽皆由同一內容 fixture 渲染、manifest schema、選擇記錄是 deterministic；Theme 偏好與美感意見是 advisory，但需人類選定才 pass。
- **gate_type**：`schema_gate` + human approval。
- **acceptance**：恰有四張 16:9 預覽，文字與資料層級相同、Theme 名稱可見；未選定 Theme 不得進 `theme_selected`。
- **verification**：`pnpm --dir presentation-skill exec node tools/validate-theme-preview.mjs --manifest fixtures/theme-preview-manifest.json`
- **likely_files**：`presentation-skill/themes/*.js`、`presentation-skill/runtime/theme-preview.js`、`presentation-skill/tools/validate-theme-preview.mjs`、`presentation-skill/tests/ps-003-theme-preview.test.mjs`
- **rollback**：移除新增 Theme 預覽實作與 manifest；已選 receipt 保留但不作 release 依據。
- **TDD**：適用於 manifest 與內容一致性；純視覺微調可不做 TDD，改由 screenshot evidence。

### PS-004｜Grill Me 到 brief／outline 的可追溯 artifact

- **traces_to**：US-001、US-003；FR-001、FR-002、FR-006；SC-004
- **depends_on**：PS-003
- **blocking_edges**：PS-003 的 manifest schema 與選款 receipt 必須 pass；完成後解除 PS-005。
- **input → output**：需求／素材／Grill Me 回答與可用 profile → `brief.md`、`outline.json`。outline 為每頁生成唯一 slide ID、主張、來源事實／摘要／推論／未知分層、beat、轉場與講稿。
- **deterministic／advisory**：schema、slide ID 唯一性、必填 metadata 與 profile precedence 是 deterministic；受眾判斷、敘事與講稿內容是 advisory，仍需產製者確認 outline。
- **gate_type**：`schema_gate` + `trace_gate` + human approval。
- **acceptance**：brief 必含受眾、目的、主張、證據、CTA、限制與未知；outline metadata 完整且 slide ID 無重複；客戶／專案內容不寫回 profile；沒有 outline 確認不得進 full build。
- **verification**：`pnpm --dir presentation-skill exec node tools/validate-outline.mjs --brief fixtures/brief.md --outline fixtures/outline.json`
- **likely_files**：`presentation-skill/runtime/grill-brief.js`、`presentation-skill/schemas/outline.schema.json`、`presentation-skill/tools/validate-outline.mjs`、`presentation-skill/tests/ps-004-outline.test.mjs`
- **rollback**：移除新增 artifact 產生器與 schema；保留最後通過的 brief／outline 作為下一次輸入，不自動覆寫。
- **TDD**：適用；先測重複 slide ID、缺來源分層與 profile 寫入專案內容均 fail。

### PS-005｜真實 artifact 驅動的單檔 deck 與雙尺寸證據

- **traces_to**：US-001、US-002、US-003；FR-001、FR-002、FR-003、FR-005；SC-001、SC-002、SC-004
- **depends_on**：PS-004
- **blocking_edges**：PS-004 的 outline_confirmed receipt 必須 pass；完成後解除 PS-006 與 PS-008 的 artifact 依賴。
- **input → output**：已確認的 brief／outline、PS-003 選定 Theme、PS-002 的 runtime validator → 真實內容的 `deck.html` 與 `render-evidence.json`，包括單檔／無外鏈、資產載入、目標投影與較窄尺寸 screenshot／overflow。
- **deterministic／advisory**：artifact 關聯、HTML 外鏈掃描、資產載入與兩尺寸 evidence 是 deterministic；畫面美感／說服力 review 是 advisory，不能單獨放行。
- **gate_type**：`cmd_gate` + `schema_gate` + `recompute_gate`。
- **acceptance**：deck 從 outline 重新建置可得到相同 slide ID；CSS、JS、必要資產內嵌；fresh state 的兩尺寸 evidence 完整；overflow 未處理、資產失敗或外鏈即 fail。
- **verification**：`pnpm --dir presentation-skill exec node tools/validate-deck.mjs --deck fixtures/deck.html --outline fixtures/outline.json --evidence fixtures/render-evidence.json`
- **likely_files**：`presentation-skill/runtime/build-deck.js`、`presentation-skill/tools/validate-deck.mjs`、`presentation-skill/tests/ps-005-deck-evidence.test.mjs`
- **rollback**：移除 builder／validator 的本次變更；保留最後成功 deck 與 evidence，不以失敗 build 覆蓋。
- **TDD**：適用於外鏈、asset、overflow、ID 對照；畫面設計本身以 screenshot review 驗收。

### CP-02｜內容到畫面的 artifact checkpoint

PS-003 至 PS-005 完成後，從同一 brief／outline 重新產製 deck，驗證 Theme receipt、slide ID、metadata、單檔、資產與雙尺寸 evidence。任何 deterministic fail 回到產生該 artifact 的 slice；advisory feedback 只能建立修正候選，不得繞過 gate。

```sh
pnpm --dir presentation-skill exec node tools/validate-deck.mjs --deck fixtures/deck.html --outline fixtures/outline.json --evidence fixtures/render-evidence.json
```

### PS-006｜跨專案 profile precedence 與更新時機

- **traces_to**：US-001；FR-006；SC-001、SC-004
- **depends_on**：CP-02
- **blocking_edges**：CP-02 必須 pass；完成後解除 PS-008 的 profile 依賴。
- **input → output**：可選的跨專案 profile、專案／當次要求、Grill Me 與成品驗收結果 → 可解釋的 effective profile 與更新候選 receipt。
- **deterministic／advisory**：precedence（當次／專案覆蓋 profile）、禁止客戶／專案內容寫入、只在明確「以後都這樣」或確認後更新，是 deterministic；偏好內容與是否儲存是人類決策。
- **gate_type**：`trace_gate` + human approval。
- **acceptance**：Grill Me 最後一題摘要套用偏好並詢問調整；製作中不打斷，改動只收為候選；完整驗收後才詢問保存；找不到 profile 時無記憶模式仍可走通。
- **verification**：`pnpm --dir presentation-skill exec node --test tests/ps-006-profile-precedence.test.mjs`
- **likely_files**：`presentation-skill/runtime/profile.js`、`presentation-skill/tests/ps-006-profile-precedence.test.mjs`、`presentation-skill/fixtures/profile.json`
- **rollback**：移除 profile resolver；保留原 profile 檔且不寫入未確認候選。
- **TDD**：適用；先測覆蓋順序、未確認不寫入與敏感專案內容拒絕。

### PS-007｜Codex／Claude Code／Gemini 薄包裝

- **traces_to**：US-001、US-002；FR-004、FR-006；SC-001
- **depends_on**：PS-006
- **blocking_edges**：PS-006 的無記憶與 profile precedence test 必須 pass；完成後解除 PS-008。
- **input → output**：同一 artifact contract、capability probe 與 effective profile → 三份最薄入口說明，各自只映射讀取、渲染、截圖、儲存的既有能力與無記憶 fallback。
- **deterministic／advisory**：入口所引用 artifact、必填 capability probe 與 fallback 說明是 deterministic；各 runtime 的選用工具是 advisory，不能改寫共同契約。
- **gate_type**：`trace_gate` + `schema_gate`。
- **acceptance**：三入口均不要求 ai-core、資料庫、中央 runtime 或 profile 必然存在；每個入口都能產出相同六份 artifact 的路徑，並在能力不足時明示 blocked／fallback。
- **verification**：`pnpm --dir presentation-skill exec node tools/validate-wrapper-contract.mjs --root .`
- **likely_files**：`presentation-skill/entrypoints/codex.md`、`presentation-skill/entrypoints/claude-code.md`、`presentation-skill/entrypoints/gemini.md`、`presentation-skill/tools/validate-wrapper-contract.mjs`
- **rollback**：移除各入口文件／薄 mapping；共用 artifact contract 與 runtime 不變。
- **TDD**：不適用；此卡主要是文件與契約 mapping，使用 deterministic contract scan 取代。

### CP-03｜可攜入口 checkpoint

逐一執行 wrapper contract scan，並以無 profile 的固定 fixture 重跑 PS-005 所需輸出。三個入口不得引入新服務或改變 `deck.html`／manifest schema；任一入口 drift 即停在 CP-03。

```sh
pnpm --dir presentation-skill exec node tools/validate-wrapper-contract.mjs --root .
```

### PS-008｜E2E release 與可轉傳打包

- **traces_to**：US-001、US-002、US-003；FR-001 至 FR-006；SC-001 至 SC-004
- **depends_on**：CP-02、CP-03
- **blocking_edges**：兩個 checkpoint 都必須 pass；若 capability probe 的 `canRender` 或 `canScreenshot` 為 false／unknown，必須停在 evidence 前或採既有等價能力，不能 release。
- **input → output**：一組需求／素材、可用或無記憶 profile、已選 Theme、六份 artifact 與 receipts → 可離線轉傳的 `deck.html`、最終 `render-evidence.json`、`release-manifest.json` 與 human approval。
- **deterministic／advisory**：完整 artifact schema、hash／位置、receipt、兩尺寸畫面、三模式、資產與外鏈驗證是 deterministic；最終敘事與美感 review 是 advisory，human approval 則是 release 的必要條件。
- **gate_type**：`recompute_gate` + `schema_gate` + `cmd_gate` + human approval。
- **acceptance**：E2E 僅在全部 required checks pass 且 release manifest 引用有效 evidence 後進入 `released`；fail／blocked 留在現狀，保留最後成功 artifact；不得自動第 3 次修復或自動發布。
- **verification**：`pnpm --dir presentation-skill exec node tools/validate-release.mjs --manifest fixtures/release-manifest.json`
- **likely_files**：`presentation-skill/tools/validate-release.mjs`、`presentation-skill/tests/ps-008-e2e.test.mjs`、`presentation-skill/fixtures/release-manifest.json`
- **rollback**：撤回本次 release manifest 與可重建輸出，不刪除最後成功 artifact；不執行外部發布或帳號操作。
- **TDD**：適用於 release manifest、阻塞與保留路徑；人工核准與美感 review 以 evidence record 驗證。

### CP-04｜v0.1 release checkpoint

完成 PS-008 後，重跑 release validator，檢查六份 artifact、forward-only receipts、capability probe、required checks 與核准結果；另跑格式檢查。只有這個 checkpoint pass 才可回報 v0.1 可交付。

```sh
pnpm --dir presentation-skill exec node tools/validate-release.mjs --manifest fixtures/release-manifest.json
git diff --check
```

## 執行順序與停止條件

1. 僅從 current frontier 的 PS-001 開始；每完成一張卡才重算 frontier。
2. 每 2–3 張卡必跑 CP-01、CP-02、CP-03；checkpoint fail 不得跳到下一群。
3. 相同問題的第三次失敗，一律輸出 `blocked` receipt、保留最後成功 artifact，停止等待人類選擇；不得用 loop、背景重試或額外 runtime 迴避。
4. 任何將 scope 擴大到 PPTX、公開發布、外部服務、資料庫或中央 renderer 的提案，均是新 frontier，不屬本計畫。
