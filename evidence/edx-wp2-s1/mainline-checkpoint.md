# EDX-WP2-S1 Mainline checkpoint

後續更新（2026-09-22）：host acceptance 已 PASS，現為 REVIEW_CANDIDATE / INDEPENDENT_REVIEW_PENDING，見 `mainline-receipt.md`；以下保留原 checkpoint 狀態。

狀態：**PRODUCT_CANDIDATE / HOST_ACCEPTANCE_PENDING**，2026-09-22。

Product SHA：`a33b05a1e8a07accd4c55f8f4643369d5b9efe3d`；branch `codex/edx-wp2-s1-direct-text-edit`；base `33a19464b7e6b0795974166cc15c77e68e984e04`。

## Scope decision

WP1 已完成 direct manipulation / selection / align / center distribution / equal-gap。下一個 measured gap 依 `research/editor-prior-art.md` 與 BACKLOG EDX-WP2，是 direct text 的 canonical commit boundary：舊 runtime 的 `syncText()` 直接改 spec，且 text/citation component 也被設為 contenteditable。WP2-S1 將 title/subtitle/keyPoint 收斂到既有 `edit-text` operation；Lexical 維持 REFERENCE_ONLY，dependency delta 0。

## Product behavior

- Direct `contenteditable` 僅 title / subtitle / keyPoint；component text/citation 留在既有 component editor seam。
- blur、完成編輯、export 以 stable identity 經 `edit-text` 提交；DOM 不再直接成 canonical truth。
- `compositionstart` 後 partial CJK 不提交；composition 中 export fail loud；`compositionend` 提交完整值。
- 切換離開 text mode 時未完成 composition 取消並還原 canonical；Escape 取消目前未提交 text DOM。
- double-click 合法 role text 直接進 text mode；layout/text 仍互斥。
- 為維持 S5 listener ownership，direct-text event root 使用 body；舊 VM stub 缺 body listener 時 bounded fallback document。
- S4-PERF 原「直接改 component DOM → export」probe 改走既有 component patch seam，保留 gesture stale 驗證目的，移除已取消的 component direct-text authority 假設。

## Verification

- TDD 新 cases：**6/6 PASS**。
- Fresh focused EDX：**228/228 PASS**（`focused.log`）。
- Fresh full non-browser：**423/423 PASS**（`nonbrowser.log`）。
- `--direct-text-regression` 已納入 managed attach/no-spawn test；缺 managed port 時明確拒絕，不 fallback spawn。
- `git diff --check` PASS。
- `distribution-lifecycle.json`：lifecycle **PASS**、shared core ready/single；Gemini CLI missing 只使 host capability partial。
- ZIP：`2,283,305 bytes`；SHA-256 `7d1cbe050b61dab6fd31f4daa90290d298ee5c17509be7af363cd26446872929`。
- Source **6/6**、protected **4/4** freeze：`source-hashes.json`。

## Remaining gate

本 task `CODEX_SANDBOX=seatbelt` 且 `PPTSKILL_DEVTOOLS_ACTIVE_PORT` 未提供；依 attach-only policy 沒有啟動 browser。正式雙 viewport direct-text + affected PGQ 尚待 `tasks/edx-wp2-s1-host-acceptance.md`。因此目前不是 Independent Review candidate。

未 merge／push／deploy；未開下一 Slice。
