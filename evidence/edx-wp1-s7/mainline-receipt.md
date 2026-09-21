# EDX-WP1-S7 Mainline receipt

狀態：COMPLETE。Product candidate `c390d26`；Independent targeted re-review GO。Branch `codex/edx-wp1-s7`，base `4cd4540a71aa7f94cc60e4495155c572034a57a4`。未merge／push／deploy，未開下一Slice。

## 實作與修復

S7在既有Moveable/canonical operation seam加入明示8px edge snap、editor-only geometry target與完整cancel/stale/cleanup路徑；未新增第二geometry authority。後續定位 reduced/static motion reset覆蓋Moveable control transform，主線只在 `runtime/motion-primitives.js` 排除editor chrome／`.moveable-control-box` transform reset，presentation content reset契約保留。

## 驗收

- Focused S3/S4/S5/S7：158/158 PASS，`mainline-focused-after-motion.log`。
- Full non-browser：337/337 PASS，`motion-reset-nonbrowser.log`；與最終14/14 source hash freeze一致。
- Browser targeted：1280×720既有fresh normal/reduced/static共15 checks PASS；AI Core `2d78d8e18d42156f43f12f0ebc6997914ec64328` 後只補1600×900，fresh normal/reduced/static共15 checks PASS。1600 receipt：`mainline-host-1600-after-aicore-20260921-r3/targeted/acceptance.json`；errors0、Browser.close與managed lifecycle PASS。1280未重跑。
- Motion-sensitive fresh PGQ：`pgq-wp4-s3-content-integrity`＋`pgq-wp4-s4-required-visibility`。第一次預設file concurrency平行執行遭managed `resource observation unknown (scan limit)` fail-closed，不能判產品FAIL；歷史證據保留。第二次依既有正式流程使用 `--test-concurrency=1`，2/2 PASS；約24.3s＋136.0s，總160.5s。Readiness exit0、Browser.close exit0、lifecycle exit0、launcher stderr空；見 `mainline-fresh-affected-pgq-serial-20260921/`。
- PGQ sample-approval/full-deck authority seam未改，沿既有reviewed evidence，不冒稱本候選fresh。
- Final source/protected freeze：14/14 source與4/4 protected untracked hashes MATCH `motion-reset-hashes.json`。
- `git diff --check` PASS。

## ZIP

Fresh `dist/PPTSKILL-0.1.0.zip`：2,251,917 bytes；SHA-256 `f94e99eeac7627f5c8ef022ec6d600f7922cce87f0271a67beb5740c10adf5ae`。`final/distribution-lifecycle.json`：install/smoke/uninstall lifecycle PASS、single shared core PASS、profile preserve PASS。Codex／Claude Code辨識成功；Gemini CLI不在PATH，host capability為partial，不是ZIP lifecycle failure。

## 限制

先前scan-limit、readiness與motion失敗均保留原始證據，不以後續PASS覆蓋。Fresh affected PGQ已關閉實際motion/visibility缺口；其餘PGQ authority沿既有review。四個既有untracked `.DS_Store`、`CLAUDE.md`、`HANDOFF-20260914-P0-R11-R1-S3.md`、`HANDOFF-20260914-PGQ-WP1.md` 不修改、不stage。下一步僅交獨立Reviewer；Mainline不得自行宣稱Independent GO。

## Mainline review P2 supplement

Mainline複核 `c390d26` 程式面GO，但指出task card要求1600×900也必須有完整pointer矩陣；舊1600證據只有三motion模式正常drag/resize/export，故列P2 evidence gap。補驗未改產品／verifier／ZIP，直接使用已提交 `edx-wp1-s4-browser-acceptance.mjs --snap-regression`：1280與1600各66 checks PASS；1600包含snap on/off drag/resize、Escape、pointercancel、bounds/minimum、preview export/offline reopen，errors全0、targetClosed=true。Readiness／Browser.close／managed lifecycle均exit0，post 14/14 source與4/4 protected hashes MATCH。詳 `review-p2-full-pointer-20260921/receipt.md`。等待targeted Independent re-review；不自行關閉review。

## Independent targeted re-review closure

Reviewer：Descartes；clean context、未參與實作。Reviewed product SHA `c390d26899f5b3289ad5b46cae562ec54f8accf6`，evidence commit `b68e04f`。Reviewer交叉核對1600×900 66 checks、harness、hashes與cleanup，判定原P2 coverage gap可關閉；P0/P1/P2/P3均0，targeted verdict **GO**。Reviewer未fresh重跑browser／PGQ／ZIP，也未修改candidate；本GO僅針對該P2。Mainline據此關閉S7，不把reviewer evidence核對冒稱fresh execution。
