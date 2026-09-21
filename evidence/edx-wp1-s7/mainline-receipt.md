# EDX-WP1-S7 Mainline receipt

狀態：REVIEW_CANDIDATE；Independent Review pending。Branch `codex/edx-wp1-s7`，base `4cd4540a71aa7f94cc60e4495155c572034a57a4`。未merge／push／deploy，未開下一Slice。

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
