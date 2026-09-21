# EDX-WP1-S10 — Bounded multi-selection distribution

Status: IN_PROGRESS
Branch: `codex/edx-wp1-s10-distribute-selection`
Base: `cbe12a62a749d1c7cca67e3acb8de1b832995924`
Depends on: S9 COMPLETE / Independent Review GO。
traces_to: `BACKLOG.md §10.1 Decision 4`、`§10.2 Prior-Art-First`、`§10.3 EDX-WP1`、`§10.4 Operation Registry`、`§10.5 portability`、`§10.8 product simplicity`。

## Objective

在 S9 atomic multi-selection operation seam 上加入第一條 `distribute-selection`：同頁 3+ components 依中心點水平或垂直等距，頭尾固定、只移動中間項目。一次 UI action = 一筆 atomic operation；canonical authority 仍只有 `composition.geometryOverrides`。

## Prior art / measured gap

- donor `html-slide-builder-oss` `slide_editor/static/editor.html::distributeSel`：MIT（Copyright 2026 catsmice），repo snapshot / research-only，分類 **ADAPT semantics only / DO_NOT_INSTALL**。其語意是 3+ selection、依中心排序、頭尾不動、中間中心等距。
- donor 實作從 iframe live rect 算 relative delta；PPTSKILL 明確不採此 authority，因 S3–S9 已鎖 canonical geometryOverrides，DOM 不能升格 truth。
- `daybrush/moveable@0.53.0` 已 pinned MIT，但本卡不需要 groupable 或新 vendor API；bundle / portable cost **0 bytes dependency delta**。
- Why custom：現有 registry 已有 stable identities、atomic validation、canonical geometry 與 export/reopen；缺口只剩把 donor 的 distribution semantics 映射到同一 canonical operation。
- Why not more：equal-gap、group drag/resize、group/lock、history 都有額外語意／schema／gesture contract，本卡不預建。

## Fixed contract

1. Operation：`distribute-selection`；target = `{ slideId, elementIds }`，`elementIds` 至少 3 個、合法、唯一、同頁 component。
2. value = `{ distribution }`；allowlist：`horizontal-centers`、`vertical-centers`。
3. 所有 target 必須已有 canonical geometry override；不得讀 DOM rect、不得偷偷 initialize。
4. 依 canonical center 排序；同 center 以 stable element identity 作 deterministic tie-break。第一與最後一個 box 完全不動；中間中心依 `(last-first)/(n-1)` 等距。
5. Canonical geometry 只接受 integer，因此中間 x/y 以 `Math.round(targetCenter - size/2)` deterministic 投影；尺寸與 orthogonal axis 不變。
6. 全部 next boxes 先通過既有 safe-area / finite / integer validator，再一次寫回 candidate；任何 invalid/missing/foreign/duplicate 皆整筆 fail，DeckSpec 不變。
7. Descriptor：mutates `composition.geometryOverrides`；preserves content/style/motion/background/otherSlides；destructive=false；undoable=true；QA invalidation geometry/overflow/readability；portable json。
8. UI 沿 S9 contextual toolbar，只在 selection >=3 顯示兩個 distribute controls；2 選取仍可 align，但 distribute 不可觸發。成功／失敗後 live selection 保留。
9. Canonical no-op 不增 semantic revision；export / reopen 不持久化 toolbar 或 selection truth。

## Non-goals

- equal-gap distribution（不同尺寸下的等間隙）
- group drag/resize / Moveable group transform
- group/ungroup、lock/unlock、batch delete
- Undo/Redo/history/draft/recovery
- WP2 content/asset editing、schema migration、AI bridge

## Acceptance

- RED→GREEN：Node + portable runtime 覆蓋 horizontal/vertical、3/4 items、不同尺寸、tie deterministic、first/last fixed、invalid/missing geometry/duplicate/foreign/<3/extra-field 原子拒絕、no-op。
- Mounted runtime：2 items 不顯示 distribute；3+ 顯示；action 後 canonical 正確且 selection retained；失敗原子；export 無 contextual toolbar/selection marker。
- S9 align controls、S8 selection、S7 snap、S5 keyboard 不回歸。
- Focused S3–S10 + export cleanup PASS；full non-browser 重新裁決。
- Browser：1280×720、1600×900 至少真 multi-select 3 items → horizontal → vertical → selection retained → export/offline reopen；errors 0、managed cleanup PASS。若目前 lane 無合法 host runtime，保留 pending，不繞 routing。
- Fresh ZIP lifecycle、SHA-256、source/protected hashes、`git diff --check`。
- 完成停在 Independent Review candidate；不 merge/push/deploy，不開 S11。

## Source decision

本 session CodeGraph 無可用 tool entry，依 repo 規則降級 bounded `rg`。現有 `OPERATION_DESCRIPTORS` / `executeOperation`、`component-geometry.js`、S9 contextual toolbar 足以承接；不新增 registry、state model、renderer、dependency。
