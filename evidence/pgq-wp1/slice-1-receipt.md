# PGQ-WP1 Slice 1 — Preflight / Brief Upgrade Receipt

**日期：** 2026-09-14
**狀態：** COMPLETE — INDEPENDENT RE-REVIEW GO
**基線：** PR #1 head `1f5318c6da968c8450d25e847233c3a866006725`

## 已實作

- 新增 pure deterministic `runtime/preflight-brief.js`，沿用既有 workflow，不建立第二套引擎。
- Comparable numeric claims 只以 `metric + period + population + unit + currency` 分組；同 context 不一致才報 conflict，且只有明確 `supersedes` 全部衝突 claims 才自動解決。
- Fact、derived、inference 分流；correlation／unknown evidence 不得靜默升格為 causal inference。
- Absolute delta、percent change、percentage-point change 由 code 重算；percent change 的 baseline 為零時 fail loud。
- 只有影響 content、evidence 或 decision 的 high-impact unknown 會形成 preflight question；known answer 不重問。
- 圖片與圖表生成個別採 explicit opt-in，預設皆為 false。
- Shareable source refs 使用 compact allowlist，不帶 local path、raw body、prompt、Grill transcript 或 source contents。
- Preflight questions 接入既有 `createGrillState()`，優先於普通問題、維持一次一題，且不能取代既有 required Grill／pressure-test gate。
- Main 與 Appendix 共用同一份 outline 及 15 頁上限；Drop 不計頁數，也不表示刪除 source material。
- `schemas/outline.schema.json` 僅新增 backward-compatible optional `section: main | appendix`；legacy outline 保持有效。
- 既有 post-approval exact human change-set gate 未放寬。

## Review repair

- P1 真實入口：新增既有 `workflow-cli.mjs preflight-new --brief <brief.json>` 命令；packaged Skill、三個 thin adapters 與 R11 preparation tool 都走同一 seam。Installed-runtime integration test 已證明素材中的 numeric conflict 會成為真正的第一個 Grill question。
- P1 非貨幣數字：`population`／`currency` 缺值 canonicalize 為 `null`，不再因缺 `currency` 靜默跳過 comparable conflict；缺少必要的 `metric`／`period`／`unit` 則轉成 high-impact context question。
- P1 causal／derived dead-path：同一 `preparePreflightBrief()` 現在輸出 `causalWarnings` 與 `derivedRecalculations`；不受證據支持的因果句、重算 mismatch 與無法重算的 derived claim 都會進入既有 preflight-question gate。Installed-runtime integration test 同時驗證 causal correlation warning 與 `30 → computed 20` mismatch。

## 明確延後

Portable DeckSpec 的 shareable claim／derivation／source refs round-trip 尚未實作。下一 slice 若啟動，必須同時關閉 schema、sanitizer、renderer preservation、browser editor clean/export、recipient reparse 與 old-version compatibility；不得只加欄位，也不得攜帶原始檔、私密路徑或 review reasoning。

Percentage-point helper 目前採輸入值同尺度直接相減；`ratio`（0.20）與 `percent`（20）表示法的顯示契約尚未鎖定。接 UI／文案前必須先決定 canonical scale，避免 ×100 誤差；本次兩個 P1 修補沒有假裝關閉此 P2。

WP2 chart、WP3 motion、WP4 QA expansion、Evidence DB、第二套 outline／workflow 均未開始。

## 驗證

- `node --test tests/pgq-wp1-preflight.test.mjs`：17/17 PASS。
- R2 + R11 targeted：13/13 PASS。
- WP1 + R2 + R11 + distribution targeted：44/44 PASS。
- `pnpm test`：134/134 PASS。
- `git diff --check`：PASS。

## 獨立 re-review

- Verdict：**GO**。
- 未發現阻塞問題。
- 原剩餘 P1 已關閉：causal warning、derived mismatch、recalculation failure 均進入既有 preflight-question gate；packaged `preflight-new` installed-runtime 路徑已穿透。
- 前兩個 P1 無回退：唯一 packaged preflight seam 正常；非貨幣 numeric conflict 與缺必要 context gate 正常。
- Reviewer 重跑 WP1 + R2 + R11 + distribution targeted：44/44 PASS；full regression：134/134 PASS；`git diff --check`：PASS。

## 結論

PGQ-WP1 第一個 bounded vertical slice 已完成，未重開 P0-R11-R1 或任何已完成 visual/release architecture。WP1 整體尚未因本 slice 自動宣告完成；DeckSpec source-ref round-trip 保持 deferred。
