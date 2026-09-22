# EDX-WP2-S2 Independent Review Handoff

狀態：**INDEPENDENT_REVIEW_PENDING**。請唯讀審查並回 reviewed SHA、GO/NO-GO、P0–P3 findings、重現證據與限制。不得修改 candidate／ZIP／protected，不 merge/push/deploy，不開下一 Slice。

- Repo：`<repo-root>` = `PPTSKILL-canonical`。
- Branch：`codex/edx-wp2-s2-role-font-size`。
- **Reviewed Product：`14555d0499e1f07ec8fabf3deb5e33db90d4d608`**。
- Base：`4a1c0bb0fddff372253eaa3e4ea5f33a3204ea1e`（WP2-S1 closure，已整合 main）。
- Task：`tasks/edx-wp2-s2-role-font-size.md`。
- Receipt：`evidence/edx-wp2-s2/mainline-receipt.md`。
- Frozen source：`evidence/edx-wp2-s2/source-hashes.json`；final verification：同目錄 `host-final-verification.json`。

先核對 worktree、適用 AGENTS、Product SHA、source/protected/ZIP。CodeGraph source decision 無精準命中才 bounded rg。不重審已關閉 WP1/WP2-S1 或 AI Core；只看本卡直接受影響的 schema/operation/renderer/export/toolbar seams。

## Review focus

1. Canonical `composition.typographyOverrides` 只接受 role-title/role-subtitle、exact `{fontSize: integer 16..160}`；不建立缺失 subtitle，空 map absent。嚴格拒絕非法／prototype／foreign keys。
2. `set-typography` exact request；null reset、no-op 不增 revision；invalid atomic；保留 content/style/geometry/motion/background/otherSlides。Node/portable 共用 helper，不新增第二套 authority。
3. Context toolbar 綁 stable identity；text mode title/subtitle 才顯示，切頁/模式清 target；真可見可點擊，不只 hidden=false。IME pending 拒 typography；toolbar focusout 先 sync 合法文字，不吞字或提交 partial。
4. 初始 render/live/export/offline reopen 字級一致；reset 恢復原 inline default/priority，不傷 motion。Content edit 保留字級；字級改動保留內容；export 沒有 contextual chrome/contenteditable。
5. Distribution lifecycle 必要檔案清單含新 helper；新 ZIP runtime/schema 與 frozen source 一致。無 dependency、copy/paste style、keyPoint typography、history 或新 renderer。

## Verification / provenance

- Worker scoped **66/66 PASS**；完整 non-browser 最終 **431/431 PASS**（`nonbrowser-toolbar-repair.log`）；最新 ZIP lifecycle **PASS**（`distribution-lifecycle-toolbar-repair.json`）。Reviewer 請 fresh 跑適當 subset，不冒稱主線數字是獨立重驗。
- 本輪 fresh browser `host-toolbar-repair/typography/acceptance.json`：1280×720、1600×900 **各16 checks PASS**（10 base + 6 aggregated typography）；全部 errors/remote=0、targetClosed=true。16/160、invalid inputs、reset、text sync、IME guard、slide/mode stale target、offline reset 都有覆蓋。
- IME 僅 browser **synthetic CompositionEvent lifecycle**，不是原生 OS IME。
- `host-toolbar-repair/pgq.log`：四支 affected PGQ 串行 **單輪16/16 unique named PASS**，fail/skip/cancel=0。
- `host-toolbar-repair/controller-receipt.json`：hostSandbox=null、AI Core e155b3a；readiness/typography/PGQ/Browser.close/supervisor exit0；owned root removed、isolation marker absent。
- Source **13/13**、protected **4/4** 前後 MATCH；ZIP **2,286,500 bytes**，SHA-256 `33fc2e5d44ac7a30ee130a8ecf4a8881125811a15d0bbba35c36b4f51936d10f`。

## 必須保留的 failures

- 首輪 full non-browser425/431：S3 registry snapshot 與 VM getAttribute 缺失；只修測試 fixture，原 geometry assertions 保留。`nonbrowser.log` 不覆寫。
- Browser `host-acceptance/`、`host-diagnostic/` 兩輪 FAIL：canonical 未提交，apply button rect 0×0；原 toolbar hide selector specificity 壓過 edit-mode rule。`14555d0` 加 typography 專用顯示 selector 與可見尺寸 assertion 後才 PASS。
- 兩失敗輪 PGQ 未啟動、cleanup 均 PASS。不能把這輪描述成沒有 browser failure，也不能將不同輪 checks 合計為單輪。

```sh
node --test tests/edx-wp2-s2-role-font-size.test.mjs tests/edx-wp2-s1-direct-text-edit.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs tests/edx-wp1-s4-managed-browser-attach.test.mjs
git diff --check 4a1c0bb0fddff372253eaa3e4ea5f33a3204ea1e 14555d0499e1f07ec8fabf3deb5e33db90d4d608
```

若 Reviewer 無合法 managed browser，可核對已提交 evidence，但須明示未 fresh 重跑 browser/PGQ，不繞安全 gate。Mainline acceptance 不是 Independent GO。
