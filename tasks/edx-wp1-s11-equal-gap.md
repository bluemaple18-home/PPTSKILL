# EDX-WP1-S11 — Equal-gap distribution

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Branch: `codex/edx-wp1-s11-equal-gap`
Base: `29c83fa415ad1424395f8d71612542c6a824f308`
Depends on: S10 COMPLETE / Independent Review GO / merged main。
traces_to: `BACKLOG.md §10.1 Decision 4`、`§10.2 Prior-Art-First`、`§10.3 EDX-WP1`、`§10.4 Operation Registry`、`§10.8 product simplicity`。

## Objective

在既有 `distribute-selection` 上補齊 equal-gap：同頁 3+ components 依主軸排列，頭尾 box 完全固定，中間元件移動成等空白間距。Canonical authority 仍只有 `composition.geometryOverrides`；不新增 operation、state model、renderer 或 dependency。

## Prior art / measured gap

- donor `html-slide-builder-oss::distributeSel`（research-only snapshot）只有中心點等距，已由 S10 吸收；沒有 equal-gap 語意。
- pinned `moveable@0.53.0`（MIT）與 `selecto@1.26.3`（MIT）現有 public README/declaration 搜尋沒有 distribute/equal-gap command；Moveable 提供 drag/resize/snap/group transform，Selecto 提供 selection input，兩者都不應升格成 canonical distribution authority。
- Classification：**CUSTOM_DELTA on existing operation seam**；bundle / portable dependency delta = **0 bytes**。
- Why custom：缺口只剩 deterministic gap geometry 計算；既有 registry 已具 stable identity、atomic validation、canonical projection、portable export/reopen。
- Why not more：group/lock、history、WP2 style/content editing、AI bridge 都不在本卡。

## Fixed contract

1. Operation 維持 `distribute-selection`；新增 `distribution` allowlist：`horizontal-gaps`、`vertical-gaps`。
2. target 維持 `{ slideId, elementIds }`，至少 3 個 unique stable component identities，且全部已有 canonical geometry override。
3. Horizontal 依 canonical `x` 排序；vertical 依 canonical `y` 排序；同起點以 stable element identity tie-break。
4. 第一與最後一個 box 完全不動。可用 gap = `(lastEnd - firstStart - sum(all primary sizes)) / (n - 1)`；若 gap < 0，整筆 fail，禁止把「等間距」變成重疊分布。
5. 中間位置依 `firstStart + cumulativePriorSizes + gap * index`，以 `Math.round` 投影成 canonical integer；size 與 orthogonal axis 不變。
6. 所有 next boxes 先通過既有 finite/integer/minimum/safe-area validator，再一次寫回；任何 invalid/missing/foreign/duplicate/extra-field/negative-gap 都整筆 fail。
7. Contextual toolbar 仍只在 selection >=3 顯示；加入水平／垂直等間距控制。成功／失敗後 selection 保留。
8. Canonical no-op 不增 semantic revision；export/offline reopen 不持久化 controls、selection 或 editor chrome。

## Acceptance

- RED→GREEN：Node + portable runtime 覆蓋 horizontal/vertical gaps、不同尺寸 3/4 items、stable tie、first/last fixed、deterministic round、negative-gap atomic reject、missing/foreign/duplicate/<3/extra-field/no-op。
- Mounted runtime：2 items 不顯示 equal-gap；3+ 顯示；action 後 canonical 正確且 selection retained；失敗原子；export 無 controls/selection marker。
- S10 center distribution、S9 align、S8 selection、S7 snap、S5 keyboard 不回歸。
- Fresh focused S3–S11 + export cleanup；full non-browser 重新裁決。
- Browser：1280×720、1600×900 至少真 3-item multi-select → horizontal gaps → vertical gaps → selection retained → export/offline reopen；errors 0、managed cleanup PASS。若本 task 無合法 host runtime，保留 pending，不繞 routing。
- Fresh ZIP lifecycle、SHA-256、source/protected hashes、`git diff --check`。
- 完成停在 Independent Review candidate；不 merge/push/deploy，不開 S12。

## Source decision

本 task 無 CodeGraph tool entry，依 repo 規則降級 bounded `rg`。現有 `distribute-selection` helper / descriptor / contextual toolbar 已是唯一合適 seam；不新增第二套 mutation path。

## Mainline checkpoint — 2026-09-22

- Product SHA：`5589217175c443f407785f3a3b2aac110896d5f2`。
- Fresh targeted **34/34**、focused **211/211**、full non-browser **416/416 PASS**。
- ZIP lifecycle PASS；ZIP `2,282,817 bytes`，SHA-256 `388e2bfefbcc9d483760f21a51f0b18458ef975ffb68ad58ce6e06d04530c959`。
- Source **8/8** freeze；protected **4/4 MATCH S10 baseline**；`git diff --check` PASS。
- 本 task `CODEX_SANDBOX=seatbelt` 且無 managed `DevToolsActivePort`，所以 browser + affected PGQ 保留 pending；沒有繞 routing。
- 剩餘 host scope 已切到 `tasks/edx-wp1-s11-host-acceptance.md`。完成前不是 Independent Review candidate；不 merge／push／deploy，不開 S12。

## Host acceptance — 2026-09-22

正式 managed host：雙 viewport equal-gap 各 **13 checks PASS**，errors/remote 0、targetClosed=true；affected PGQ 串行 **單輪 16/16 named PASS**。readiness / Browser.close / supervisor / cleanup PASS；source 8/8、protected 4/4、ZIP bytes/hash 前後 MATCH。

詳見 `evidence/edx-wp1-s11/mainline-receipt.md` 與 `host-final-verification.json`。前述 checkpoint pending 保留為歷史。現可交 Independent Review，尚無獨立 GO；產品與 ZIP 未修改，不 merge／push／deploy，不開 S12。

## Mainline closure — 2026-09-22

Independent Review **GO**，reviewed SHA `5589217175c443f407785f3a3b2aac110896d5f2`，P0/P1/P2/P3 全 0。Reviewer fresh targeted **34/34**、focused **211/211**、full non-browser **416/416 PASS**，`git diff --check` PASS；browser 雙 viewport 各 13 checks 與 PGQ 單輪 16/16 屬已提交 evidence 的獨立核對，非 Reviewer fresh browser/PGQ rerun。

Verdict：`evidence/edx-wp1-s11/independent-review.md`。主線核對 source **8/8**、protected **4/4**、ZIP bytes/hash MATCH，reviewed product 到結案前 HEAD 僅 evidence/control 文件，reviewed code／ZIP 未改。S11 正式關閉；未 merge／push／deploy，未開 S12。前述 checkpoint／host acceptance 段落保留為歷史。
