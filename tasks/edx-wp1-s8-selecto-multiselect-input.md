# EDX-WP1-S8 — Selecto bounded multi-selection input

Status: COMPLETE — Product `3065bcb8745e3109531eb6f155e930a0b3c24c15`; targeted independent re-review GO，P0/P1/P2/P3=0；S8 closed
Branch: `codex/edx-wp1-s8`
Base: `9188b787ad964b92a129a5cff8f7067b08c0f4ea`
Depends on: S7 COMPLETE；Selecto `1.26.3` S1 adoption **GO / ADAPT**。
traces_to: `BACKLOG.md §10.1 Decision 4`、`§10.2 Selecto`、`§10.3 EDX-WP1`、`§10.5 portability`、`§10.8 product simplicity`。
Trace preflight: S7 closure已清；Selecto version/license/integrity/bundle evidence已存在；本卡有明確browser與export驗證；無Critical blocker。


## P1 targeted repair — 2026-09-21

獨立 Reviewer 對 `fd7fc9a` 判 NO-GO：focusin 換頁未清 selection，方向鍵可寫入上一頁 geometry。共用 `select(id)` 現在只在 identity 改變時先 `layout?.clearSelection()`；同頁 focus 保留選取。Mounted RED 重現 canonical mutation；fresh S8 10/10、focused 174/174、non-browser 379/379、ZIP lifecycle PASS，protected 4/4 MATCH。本輪不重跑 browser／PGQ；既有 evidence 僅繼承，不代表新 candidate fresh browser。詳細 receipt：`evidence/edx-wp1-s8/focusin-repair/receipt.md`。Targeted independent re-review 已 GO：reviewed product `3065bcb8745e3109531eb6f155e930a0b3c24c15`，P0/P1/P2/P3=0；原 focusin wrong-slide mutation P1 關閉。Reviewer fresh 驗 S8 10/10、focused 174/174、non-browser 379/379、20/20 source 與 protected 4/4 hashes、ZIP 身分與 diff check；browser／PGQ 僅核對既有 evidence，未冒稱 fresh rerun。詳 `evidence/edx-wp1-s8/independent-rereview.md`。S8 closure 不改 reviewed product／ZIP。

## Historical acceptance — 2026-09-21（fd7fc9a）

Host runtime 已完成正式 managed browser：1280×720、1600×900 各 15 checks PASS（10 base + 5 S8 aggregated checks）；四支 affected PGQ 串行 16/16 PASS。fresh focused 172/172、full non-browser 377/377、ZIP lifecycle PASS；最終 ZIP 2,280,185 bytes，SHA-256 `f81efc729f17257a36802faa94c186742a07596dc7f36e90b75de6edab5e89c5`。Source 20/20、protected 4/4 MATCH，managed cleanup PASS。實測發現 Selecto style 殘留，已 bounded 修正；歷史 failure 與 fixture 校正詳見 `evidence/edx-wp1-s8/host-repair-history.md`。最新 evidence：`evidence/edx-wp1-s8/mainline-receipt.md`。Independent Review 待執行，不是 GO／closure。

## Historical checkpoint — 2026-09-21（a58cdfa，已由上述驗收接續）

- Selecto `1.26.3` 已以 direct exact dependency 與正式 IIFE vendor 接入；bundle 63,167 bytes／gzip 19,807 bytes，SHA-256 `dd4d7afb863b1e73803325f16c9e49706ad8fd2325f245d8ca3a39bcf925e2cf`，MIT attribution／registry integrity gate PASS。
- Selection-only runtime 已完成 plain／Shift click、marquee replace、Shift marquee toggle、0/1/>1 lifecycle、single Moveable handoff、clone-only export cleanup；mounted marquee path payload read／whole DeckSpec serialization 均為 0。
- Focused S3–S8＋export cleanup **172/172 PASS**；full non-browser（排除四支真 browser-backed PGQ）**377/377 PASS**；`git diff --check` PASS。
- Fresh ZIP 2,280,120 bytes，SHA-256 `2334e9b2337c718f1cdaebd12169ce629a291c670a9af506dcd8b0b859b123e0`；install/smoke/uninstall lifecycle PASS，低於 12 MiB warning／20 MiB hard fail。四個既有 protected untracked SHA 與 S7 baseline 4/4 MATCH。
- Formal managed browser 尚未執行：本 task runtime 為 `CODEX_SANDBOX=seatbelt`，AI Core `2d78d8e18d42156f43f12f0ebc6997914ec64328` 的 `tmp_session.py browser` 會在 launch 前 fail-closed；未清除此旗標、未繞過 routing、未啟 Chrome。
- 因此 Fresh browser C 與 export-seam affected PGQ 四支仍 **PENDING**：`pgq-wp4-s3-content-integrity`、`pgq-wp4-s3-sample-approval`、`pgq-wp4-s4-full-deck-qa`、`pgq-wp4-s4-required-visibility`。目前不是 independent review candidate。


## Objective

把已核准的 Selecto 正式接到現有 editor，交付 **component-only marquee + Shift 多選選取**。Selection 只屬 editor-local work state；DeckSpec／CompositionSpec／export／recipient 都不得出現 selection truth。

本卡只建立「選取能力」，不把多選直接擴成另一套 mutation/history 系統。單選仍回到既有 Moveable/S7 interaction；多選只顯示 bounded selection chrome/context count，等待後續 operation card 承接 batch move／align 等 mutation。

## Prior art / measured gap

- `daybrush/selecto` `1.26.3`，MIT；S1 spike 已 fresh 驗證 marquee／Shift multi-select 與 Moveable handoff，registry integrity：`sha512-gZHgqMy5uyB6/2YDjv3Qqaf7bd2hTDOpPdxXlrez4R3/L0GiEWDCFaUfrflomgqdb3SxHF2IXY0Jw0EamZi7cw==`。
- S1 measured bundle：64,476 bytes minified／20,351 bytes gzip；R1 exporter 已有 `.selecto-selection` chrome cleanup seam。
- **why_not_less:** 現有 single-click selection 無 marquee／Shift selection；自己重做 drag-area/input normalization 沒有比已核准 Selecto 更小。
- **why_not_more:** align/distribute/group/lock/batch transform 需要新的 bounded operation/atomicity contract；history 屬 WP3。本卡先把 selection input 關乾淨。
- Replacement/retirement: **無取代**；沿用現有 single-selection/Moveable seam，Selecto只增加 bounded selection input。

## Fixed scope / product contract

1. `selecto@1.26.3` 成為明示 direct dependency；不得依賴 Moveable 的 transitive closure 偷用。必須保留 pinned integrity、MIT attribution、metafile/portable vendor metadata與 deterministic build。
2. 只在 layout mode、current slide、具有 stable identity 的 **component targets** 啟用。文字 contenteditable、editor toolbar/dialog、Moveable handles/proxy、background layer、其他 slide 均不可被 marquee 選取。
3. 支援：
   - plain click → 單選；
   - Shift-click → add/remove toggle；
   - empty-space marquee → bounded multi-select；
   - Shift + marquee → additive/toggle semantics，結果 deterministic、去重、DOM order stable。
4. Selection state 只在 editor runtime 記憶體；不得寫入 DeckSpec、CompositionSpec、localStorage、history、export metadata或 portable HTML。
5. Selection cardinality：
   - `0`：無 component selection chrome；
   - `1`：交回既有 Moveable single-component path，drag/resize/snap/keyboard nudge行為完全沿 S7；
   - `>1`：停用/清掉 Moveable control/proxy，只顯示 bounded multi-selection chrome與 selected count；本卡不允許 group move/resize。
6. 任何 selection mutation 前若有 active gesture，先走既有 cancel/teardown；selection 變更本身不得產生 canonical operation/revision mutation。
7. Slide switch、退出 layout、進 text mode、Escape（無 active gesture 時）、blur/destroy 必須清 selection；重複 cleanup idempotent。
8. Export/prepareExport during multi-select 必須 clone-only 清除 Selecto／selection chrome；live selection 保持，canonical/presentation truth不變。另存/reopen後 selection為空。
9. Context UI只顯示低干擾 selected count/selection state；不建立 toolbar framework，不提前放 align/group/lock disabled buttons。

## Explicitly deferred

- batch move/resize、Moveable group transform
- align/distribute/equal-gap
- group/ungroup、lock/unlock
- delete-element batch operation
- Undo/Redo、history、draft/recovery
- WP2 typography/style/asset editing
- AI bridge / recompose
- schema migration

上述能力不得以「順手」理由混入 S8。Selection-only 不產生 semantic mutation，因此 WP1 的「一個 gesture 一筆 history」在本卡標記 **not-applicable**；等第一條 multi-selection mutation card 再驗證。

## Acceptance

### A. Dependency / vendor gate

- `package.json` 明示 `selecto: 1.26.3`，lock integrity精確吻合 S1 receipt。
- 正式 browser bundle只含實際 inputs；MIT/license notice完整，無 runtime CDN／`latest`。
- 記錄 Selecto bundle bytes/gzip及最終 portable ZIP bytes；12 MiB warning／20 MiB hard fail不放寬。

### B. Deterministic selection contract

- RED→GREEN 覆蓋 plain single、Shift add/remove、marquee replace、Shift marquee additive/toggle、duplicate event去重、DOM-order deterministic。
- 非 eligible target、跨 slide、editor chrome、Moveable proxy/control、text mode不進 selection。
- selection 0/1/>1 lifecycle與 single Moveable handoff正確；active gesture切 selection先 cancel，0 canonical writes。

### C. Fresh browser

1280×720、1600×900 都 fresh 跑：

- 真 pointer marquee 選至少2個component；
- Shift-click add/remove；Shift marquee結果可重現；
- 多選時 Moveable control/proxy=0，單選後 Moveable恢復1個；
- layout/text/slide switch/Escape/blur cleanup；
- export during multi-select → output無 `.selecto-selection`／selection marker／editor chrome，DeckSpec hash不變；offline reopen selection empty、單選 interaction仍可用；
- console/page/network/HTTP/remote errors=0，owned target/profile cleanup PASS。

### D. Regression / portability

- S7 focused single-component drag/resize/snap/keyboard/cancel regression保持；不得因 Selecto event capture 改 click/IME/toolbar ownership。
- Full non-browser、affected PGQ重新裁決；selection/export seam有改才跑fresh affected PGQ，不機械重跑全部。
- mounted perf需證明 marquee pointer path不讀／serialize whole DeckSpec；不得 pointer-move 全 deck scan canonical payload。
- Fresh ZIP build/install/smoke/uninstall、SHA-256、source/protected hashes、`git diff --check`。

## Likely files

- `package.json` / `pnpm-lock.yaml`
- `runtime/deck-editor.js`
- `runtime/component-interaction.js`（只在必要的 single/multi handoff seam）
- 新的 bounded `runtime/selecto-vendor.js` / `runtime/vendor/selecto-*`（沿 Moveable vendor pattern）
- `tools/build-selecto-vendor.mjs`
- S8 targeted tests/browser cases/evidence
- distribution/build inputs only if required to carry the pinned vendor

## Execution / stop conditions

- TDD：先 RED selection semantics／export boundary，再最小 GREEN；不提前抽象 generic selection registry。
- Mainline single writer；若交 Worker，shared sequential，完成 freeze 後 Mainline fresh browser/ZIP。
- 若 Selecto 必須取得 canonical authority、需要第二份 persistent model、或無法在不破壞 S7 pointer ownership下接入，立即停回 Mainline，不用 workaround 隱藏。
- 同類 blocker兩次無進展即停；browser high-interaction依既有 stop rule。
- 不 merge／push／deploy；不碰四個既有 untracked；完成停在 independent review candidate。

## Frontier after S8

S8 GO 後再依 measured gap 開下一張 multi-selection mutation card；優先候選為 `align-selection / distribute-selection` 或 bounded group move，需先定 atomic operation／QA invalidation。不得在 S8 預建。
