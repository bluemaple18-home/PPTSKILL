# S10 Mainline acceptance receipt

狀態：**REVIEW_CANDIDATE / INDEPENDENT_REVIEW_PENDING**。

Product SHA：`902671238980941b321179a4df37e4d867733f14`；branch `codex/edx-wp1-s10-distribute-selection`；base `cbe12a62a749d1c7cca67e3acb8de1b832995924`。Host evidence commit：`70caf4e1b385502e354b38d022539053f3880aef`。從 Product SHA 到 host evidence commit 只有 evidence/control docs；delivery source、tests、harness、ZIP 沒有被 host 驗收線修改。

## Product acceptance

- `distribute-selection`：同頁 3+ component，`horizontal-centers` / `vertical-centers`；canonical center 排序，同 center 以 stable element identity deterministic tie-break；頭尾固定，只移動中間項目。
- Canonical authority 僅 `composition.geometryOverrides`；不讀 DOM rect、不 auto-initialize missing geometry。
- invalid / missing geometry / foreign / duplicate / `<3` / extra field / safe-area failure 全部 atomic reject；selection 成功或失敗後皆保留。
- Contextual distribute controls 僅 3+ selection 顯示；2-selection 維持 align-only。Export / offline reopen 不持久化 selection、toolbar 或 editor chrome。

## Fresh non-browser evidence

- `focused.log`：S3–S10 + S1 export cleanup，**198/198 PASS**。
- `nonbrowser.log`：排除四支 browser-backed PGQ，**403/403 PASS**。
- `distribution-lifecycle.json`：install / smoke / uninstall / profile preserve / single shared core PASS；Gemini CLI missing 僅為 host capability partial。
- `git diff --check` PASS。

## Fresh host evidence

- `host-acceptance/distribution/acceptance.json`：1280×720、1600×900 各 **13 checks PASS**，每 viewport 為 10 base interaction checks + 3 S10 aggregated checks：3-item contextual distribution、horizontal-centers、vertical + export/offline reopen。selection 保留；reopen selection 為空；console/page/network/HTTP/remote errors 全 0，targetClosed=true。
- Browser run 在 AI Core scan-window 修復前已完成，來源 hashes 後續持續一致；不宣稱它是修復後重跑。
- `repaired-host-pgq/affected-pgq.log`：四支 affected PGQ 以 `--test-concurrency=1` **單輪 16/16 named PASS**，fail/skip/cancel 0。
- `repaired-host-pgq/controller-receipt.json`：AI Core `e155b3abeabe45c2442bcf86c30236237c84ffaa`；readiness / PGQ / Browser.close / supervisor 全 exit 0；owned root absent、isolation marker absent、sources/protected match after。

## Host blocker history

原 scan-limit blocker 已證實為 scanner 100ms 觀測窗不足，實測 `123.794ms > 100ms` 停損；當下部分累計並未觸及 bytes/files hard limit。AI Core 修復 `e155b3a` 只調整 registered browser layout 的 bounded observation window，沒有放寬 byte/file/TTL/host reserve/entry/depth/ownership/special-entry/cleanup policy；其獨立 review GO。

`host-acceptance/`、`pgq-only-retry/`、`scan-diagnostic-observation/` 的 FAIL 與 cleanup evidence 全保留。修復後 PGQ PASS 不覆寫舊 supervisor exit 2，也不把舊失敗重寫成成功。

## Integrity

- `host-final-verification.json`：source **11/11 MATCH**、protected **4/4 MATCH**。
- ZIP：**2,282,450 bytes**；SHA-256 `664bc72f696e21d1d5ca891506411c737ff7f114c891658d7d5670e8b06ebd64`。
- 四個 protected untracked 維持：`.DS_Store`、`CLAUDE.md`、`HANDOFF-20260914-P0-R11-R1-S3.md`、`HANDOFF-20260914-PGQ-WP1.md`。

Mainline 判定：S10 acceptance 已完整，可交 Independent Reviewer。本 receipt 不是 Independent GO。未 merge／push／deploy，不開 S11。
