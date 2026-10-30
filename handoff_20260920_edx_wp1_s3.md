# Handoff — EDX-WP1-S3

## Root question

PPTSKILL能否在不安裝vendor UI、不建立第二套layout truth的前提下，讓single component的move／resize成為bounded、portable、可驗證的canonical operation，並為後續Moveable／Selecto interaction Slice提供可信seam？

## Goal

執行 `tasks/edx-wp1-s3-bounded-geometry-operation-path.md`，完成component-only `move-element`／`resize-element` vertical path，產出可獨立review的本地candidate。

## Constraints & preferences

- 先只讀本handoff、task card、`AGENTS.md`、`config/devflow_context_map.tsv`與task指定規則，再回報接手確認；確認前不修改。
- 預設節省模式；source decision前若`.codegraph/`可用先查CodeGraph，否則`rg`。
- 不安裝Moveable／Selecto／Floating UI；不做interaction UI、selection、snap、history或AI bridge。
- Canonical truth仍是DeckSpec／CompositionSpec；DOM transform、viewport pixel、editor chrome與live selection不得進portable HTML。
- 使用RED→GREEN與managed browser evidence；不能用舊receipt替代producer code變更後的fresh evidence。
- 不merge、不push、不deploy；只做到candidate＋independent review handoff。

## Completed actions

- EDX-WP1-S1 dependency research與export cleanup已COMPLETE：Moveable `0.53.0` GO/ADAPT、Selecto `1.26.3` GO/ADAPT、Floating UI `1.8.0` REJECT FOR WP1。
- EDX-WP1-S2 stable identity＋bounded `edit-text` operation已完成並獨立review GO。
- S2 candidate：`6a76b03cd14dcac71a9672eb634f55561e00c623`。
- S2 local-main closure：`2d87f2491497df8e1b345df2ee95588b25f4fb8b`。
- S2 evidence：focused 10/10、targeted 29/29、non-browser 210/210、PGQ browser 16/16；fresh Chrome 234字元legacy slide ID operation→export→reopen PASS。
- S2 ZIP：2,152,740 bytes；SHA-256 `f0dff328f707889deac71f8616ab4d06cdc62ade79d7781769756cc40656f2c0`。

## Active state

- Repo root：`<repo-root>`。
- Branch：`main`。
- HEAD：`2d87f2491497df8e1b345df2ee95588b25f4fb8b`，開卡commit完成後以handoff所在HEAD為新base。
- `main`尚未push；當時相對`origin/main` ahead 28。
- Tracked worktree在開卡前clean；四個既有untracked需原樣保留：`.DS_Store`、`CLAUDE.md`、`HANDOFF-20260914-P0-R11-R1-S3.md`、`HANDOFF-20260914-PGQ-WP1.md`。
- 沒有啟動中的server或browser session。

## In progress / remaining work

1. 從包含本handoff與task card的local `main`建立`codex/edx-wp1-s3`。
2. 依task card先寫public-interface RED，鎖定optional geometry override、component-only target與absolute canonical coordinate contract。
3. 實作最小schema/sanitizer/renderer/Node-browser operation/export-reopen閉環。
4. 跑focused、compatibility、full、managed browser、PGQ browser-backed與fresh ZIP gates。
5. 產生candidate receipt、commit、clean tracked tree與independent review指令；停在review，不merge/push。

## Blocked & errors

- 目前無產品blocker。
- Moveable／Selecto installation與正式interaction UI刻意blocked，直到S3 independent review GO後另切卡。
- S2保留一個non-blocking P2：browser公開descriptor snapshot可被本機mutation，但private enforcement不可被擴權。S3新增descriptors時應將公開snapshot做immutable，納入本卡acceptance，不需另開repair。

## Key decisions & resolved questions

- Geometry contract先於vendor UI；S3不安裝dependency。
- S3只做single component role，避免把title/keyPoint flow-layout問題偷渡進第一條geometry path。
- Move／resize保存1600×900 canonical absolute values，不保存pointer delta或viewport-scaled value。
- Invalid/out-of-safe-area輸入fail loud，不以secret clamp或縮放掩蓋。
- Manual geometry位於CompositionSpec bounded override seam，不新增layout DB或HTML-as-truth。

## Candidate fork

- 唯一frontier：`EDX-WP1-S3 — Bounded Component Geometry Operation Path`。
- Vendor interaction、selection/multi-select、history與AI bridge均不是本輪候選。

## Next step

只讀接手後，建立`codex/edx-wp1-s3`，執行task startup／trace preflight，再從focused RED開始；不要先安裝vendor。

## Waiting conditions

- Candidate完成後等待獨立review GO／REQUEST CHANGES。
- 只有GO後才回Mainline決定下一張Moveable／Selecto interaction Slice是否存在與範圍。

## Limits

- 不merge／push／deploy。
- 不修改四個既有untracked files。
- 不開後續Slice、WP2/3/4或任何EDX額外scope。
- 不以測試數字、狀態文案或舊receipt單獨宣稱完成。

## 接手指令

> 你是PPTSKILL Mainline。先唯讀閱讀`handoff_20260920_edx_wp1_s3.md`、`tasks/edx-wp1-s3-bounded-geometry-operation-path.md`、`AGENTS.md`與task指定規則，核對`main` base與worktree狀態後回報接手確認；確認前不要修改。之後自動切`codex/edx-wp1-s3`，以節省模式執行component-only bounded geometry operation Slice：先RED，再最小GREEN，完成schema→sanitizer→renderer→Node/browser editor→export/reopen→recipient parse與managed browser/full/ZIP gates。不得安裝Moveable／Selecto、不得做interaction UI/history/AI bridge、不得merge/push/deploy；完成後停在獨立review candidate。
