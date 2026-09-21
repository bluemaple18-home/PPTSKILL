# EDX-WP1-S9 — Bounded multi-selection alignment

Status: REVIEW_CANDIDATE / INDEPENDENT_REVIEW_PENDING
Branch: `codex/edx-wp1-s9-align-selection`
Base: `f7537c4`
Depends on: S8 COMPLETE；Product `3065bcb8745e3109531eb6f155e930a0b3c24c15` targeted independent re-review GO。
traces_to: `BACKLOG.md §10.1 Decision 4`、`§10.3 EDX-WP1`、`§10.4 Operation Registry`、`§10.5 portability`、`§10.8 product simplicity`。


## Latest host acceptance — 2026-09-21

正式 host 已補齊 alignment 1280×720／1600×900 各 13 checks PASS（10 base + 3 S9）；affected PGQ 16 unique named PASS 精確為首輪 8 + bounded retry 8，非單輪 16/16。首輪 scan-limit supervisor stop 原始 evidence 完整保留；retry Browser.close／supervisor／cleanup 全 PASS，兩輪 owned roots 均已回收。Source 11/11、protected 4/4、ZIP hash MATCH；產品與 ZIP 相對 `c5c6dac` 未改。最新 receipt：`evidence/edx-wp1-s9/mainline-receipt.md`；handoff：`handoff_20260921_edx_wp1_s9_review.md`。目前待 Independent Review，不是 GO／closure。

## Historical checkpoint — 2026-09-21（c5c6dac）

- 六種 `align-selection` 已進既有 Unified Operation Registry；Node／portable runtime 共用 geometry helper。任一 target 缺 canonical geometry、非法／重複／foreign target 皆整筆原子拒絕；no-op 保持 canonical state。
- Multi-selection contextual alignment toolbar 只在 2+ selection 顯示；align 成功／失敗皆保留 selection；export clone 移除 toolbar／selection chrome。沒有新增第二 selection state、renderer、schema 或 dependency。
- RED 保留於 `evidence/edx-wp1-s9/red.log`；fresh focused **185/185 PASS**，full non-browser（排除四支 browser-backed PGQ）**390/390 PASS**，`git diff --check` PASS。
- Browser harness 已沿既有 attach-only runner 新增 `--alignment-regression`；managed attach/no-spawn regression PASS。正式 1280×720＋1600×900 尚未執行：本 task `CODEX_SANDBOX=seatbelt`，AI Core `2d78d8e18d42156f43f12f0ebc6997914ec64328` 會在 managed browser launch 前 fail-closed；未清旗標、未繞 routing。
- Fresh ZIP lifecycle PASS：2,281,550 bytes；SHA-256 `b4ba66f24d6780d6899f6bc1c48f5d2f32cf03fb3878091d28636c2ec3e0db57`。Source freeze 11/11；protected untracked 4/4 與 S8 baseline MATCH。
- 因 fresh host browser 與受影響 PGQ 仍 pending，目前是 **checkpoint，不是 independent review candidate**；不 merge／push／deploy，不開 S10。

## Objective

把 S8 的 editor-local multi-selection 接到第一條 bounded semantic mutation：`align-selection`。只做同一 slide 內 2+ components 的六種對齊；一次 UI action 只產生一筆 atomic operation，沿既有 `composition.geometryOverrides` canonical authority。

## Fixed contract

1. Operation：`align-selection`；target 為 `{ slideId, elementIds }`，`elementIds` 至少 2 個、stable、唯一、皆為同頁 component；value 為 `{ alignment }`。
2. alignment allowlist：`left`、`center-x`、`right`、`top`、`center-y`、`bottom`。
3. 對齊基準是選取集合 canonical geometry 的 bounding box：left/top 取 min edge，right/bottom 取 max edge，center 取 bounding-box center 並 deterministic round 到 integer。
4. 所有 target 必須已有 canonical geometry override。任一缺 geometry、target 不存在、重複、跨 role、非法 alignment 或計算後違反 safe area，整筆 fail，DeckSpec 不變；不得讀 DOM box 來升格 canonical truth，也不得偷偷 initialize。
5. Node editor 與 portable browser runtime 共用同一 geometry helper；batch 只在全部 next boxes 驗證通過後一次寫入 candidate。
6. Descriptor 維持 Unified Operation Registry：mutates `composition.geometryOverrides`；preserves content/style/motion/background/otherSlides；QA invalidation = geometry/overflow/readability；portable serialization = json。
7. UI 只在 multi-selection（>1）顯示最小 contextual alignment controls；單選/0 選取隱藏。操作成功後 selection 保留，不建立第二份 selection state。
8. Context controls / selection chrome 不得進 export；另存/reopen 不帶 selection truth。既有 single Moveable、snap、keyboard、Selecto selection semantics 不回歸。
9. Align click 若形成 canonical no-op，不增加 semantic revision；成功 mutation 一次 action 至多一次 revision/operation。

## Non-goals

- distribute / equal-gap
- group drag/resize、Moveable group transform
- group/ungroup、lock/unlock、batch delete
- Undo/Redo/history/draft/recovery（WP3）
- schema migration、WP2 content/asset editing、AI bridge
- 任意 DOM/CSS patch authority

## Acceptance

- RED→GREEN：descriptor/validator、六種 alignment、bbox semantics、missing geometry/invalid/duplicate/foreign 原子拒絕、no-op。
- Mounted public runtime：多選才顯示 controls；click 後 canonical 對齊且 selection 保留；失敗不改 spec；payload reads / whole-spec serialization 不進 pointer hot path；export 無 contextual controls/selection marker。
- Focused：S3/S4/S5/S7/S8/S9 + export cleanup 全通過；full non-browser 重新裁決。
- Browser：1280×720、1600×900 至少驗 multi-select→align-left→align-center-x、selection retained、export/offline reopen、errors=0、managed cleanup。若 browser runtime 無可用 managed host，保留為 pending，不繞過安全 routing。
- Fresh ZIP build/install/smoke/uninstall、SHA-256、source/protected hashes、`git diff --check`。
- 完成停在 independent review candidate；不 merge/push/deploy，不開 S10。

## Source decision

CodeGraph 未能穿透 generated editor closure，依 repo 規則改用 bounded `rg` / source read。既有 authority 已足夠：`OPERATION_DESCRIPTORS` + `executeOperation` 負責 canonical mutation；`multi-selection.js` 只持 editor-local selection；`component-geometry.js` 提供 geometry validate/update；`mountComponentInteraction` 負責 selection/UI。S9 不新增 registry、DB、state model 或 dependency。
