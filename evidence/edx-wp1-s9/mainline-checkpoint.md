# EDX-WP1-S9 Mainline checkpoint

> 歷史 checkpoint。正式 host acceptance 已接續完成；最新狀態見 [mainline-receipt.md](mainline-receipt.md)。以下保留原時點紀錄。

狀態：**IMPLEMENTATION_COMPLETE / NON_BROWSER_PASS / HOST_BROWSER_ROUTING_BLOCKED / REVIEW_CANDIDATE_PENDING**。

Branch：`codex/edx-wp1-s9-align-selection`；base：`f7537c4`。本 checkpoint 不宣稱 fresh browser、fresh PGQ 或 Independent Review GO；未 merge／push／deploy，未開 S10。

## 實作

- 在既有 Unified Operation Registry 新增 `align-selection`，target 為同頁 2+ stable component identities，value 為六種 alignment。
- Node editor 與 portable browser runtime 共用 `alignComponentGeometries`；以 selection canonical geometry bounding box 計算 left／center-x／right／top／center-y／bottom。
- 所有 target 必須已有 `composition.geometryOverrides`。缺 geometry、非法／重複／foreign target、非法 alignment 或 safe-area failure 全部 fail loud；batch 在全部 next boxes 驗證後才一次寫入，維持原子性。
- Context toolbar 只在 multi-selection 顯示；沿 S8 單一 editor-local selection state。成功／失敗後 selection 保留；0/1 selection 隱藏。未新增第二 selection store、renderer、schema、dependency 或 group transform。
- Export clone 由既有 editor-chrome selector 清掉 contextual toolbar／selection chrome；live selection 不因 export 被清除，offline reopen 不持久化 selection。
- Browser acceptance 沿既有 `tools/edx-wp1-s4-browser-acceptance.mjs` 增加 `--alignment-regression`，不建立第二 runner。

## Fresh non-browser evidence

- `red.log`：修復前同一 S9 operation tests 命中舊 runtime 只接受單一 `elementId` 且 descriptor 不存在。
- `focused.log`：S3/S4/S5/S7/S8/S9 + S1 export cleanup，**185/185 PASS**。
- `nonbrowser.log`：排除四支真正 browser-backed PGQ，**390/390 PASS**。
- S9 core 覆蓋六種 alignment、bbox semantics、missing canonical geometry、single/duplicate/foreign/role/missing slide/extra field、descriptor immutability 與 no-op。
- Mounted runtime 覆蓋 multi-only toolbar、selection retained、atomic failure、export cleanup；S8 mounted regression 同時維持。
- Managed attach regression 已包含 `--alignment-regression`，驗證只 attach owned target、navigation failure cleanup、不可 fallback spawn。
- `diff-check.log`：PASS。
- `source-hashes.json`：11 個 affected source/test/harness freeze；四個 protected untracked **4/4 MATCH S8 baseline**。

## ZIP

Fresh `dist/PPTSKILL-0.1.0.zip`：**2,281,550 bytes**；SHA-256 `b4ba66f24d6780d6899f6bc1c48f5d2f32cf03fb3878091d28636c2ec3e0db57`。

`distribution-lifecycle.json`：install/smoke/uninstall PASS、single shared core PASS、profile preserve PASS。Codex／Claude Code recognized；Gemini CLI missing 僅 host capability partial，不影響 ZIP lifecycle。

## Managed browser blocker

`browser-preflight.txt` 實測本 task 為 `CODEX_SANDBOX=seatbelt`。AI Core HEAD 為 `2d78d8e18d42156f43f12f0ebc6997914ec64328`；`scripts/tmp_session.py::require_browser_runtime` 對非空 `CODEX_SANDBOX` 明確回 `browser_launch_blocked_in_codex_sandbox`，在 capacity/lifecycle/Chrome launch 前 fail-closed。

本輪沒有 unset sandbox、沒有換 shell／入口繞過、沒有啟動 Chrome，因此不是產品 failure，也沒有 fresh browser PASS 可宣稱。

正式 host runtime 可用時，只需沿已準備的 `--alignment-regression` 補：

- 1280×720：multi-select → align-left → align-center-x → selection retained → export/offline reopen。
- 1600×900：同矩陣。
- console/page/network/HTTP/remote errors=0，owned target/profile cleanup PASS。
- 串行重跑受 export/editor seam 影響的四支 browser PGQ：`pgq-wp4-s3-content-integrity`、`pgq-wp4-s3-sample-approval`、`pgq-wp4-s4-full-deck-qa`、`pgq-wp4-s4-required-visibility`。

上述 fresh host evidence PASS 後，Mainline 再 freeze hashes／ZIP（若 source 未變可核對不重建）並切 Independent Review handoff。四個 protected untracked 不得 stage。
