# EDX-WP2-S1 Mainline acceptance receipt

狀態：**REVIEW_CANDIDATE / INDEPENDENT_REVIEW_PENDING**；2026-09-22。

Product：`a33b05a1e8a07accd4c55f8f4643369d5b9efe3d`；checkpoint：`338c4ab`；branch：`codex/edx-wp2-s1-direct-text-edit`；base：`33a19464b7e6b0795974166cc15c77e68e984e04`。

## Scope / root question

核對 direct role text 的真 double-click、IME commit boundary、Escape rollback 與 export/offline reopen。此輪只補正式 host evidence，不改 product source/tests/harness/ZIP，不修改 AI Core。

## 已提交 non-browser verification

開發 checkpoint 保存新 cases **6/6 PASS**、focused **228/228 PASS**、full non-browser **423/423 PASS**、ZIP lifecycle PASS。參照 `mainline-checkpoint.md`、`focused.log`、`nonbrowser.log`、`distribution-lifecycle.json`；本 host 輪未重跑，不冒稱本輪 fresh non-browser。

## 本輪 fresh host verification

- `host-acceptance/direct-text/acceptance.json`：1280×720、1600×900 各 **14 checks PASS**（10 base interaction + 4 WP2-S1 aggregated）。
- 真 double-click title 進 edit，component text 不取得 direct contenteditable；browser CompositionEvent partial 不進 canonical、組字中 export fail loud、compositionend 提交完整 CJK；真 Escape 還原最後 committed value；export/reopen 保持 canonical、play mode 與 contenteditable=0。
- Console/page/network/HTTP/remote errors 全 0；兩 viewport `targetClosed=true`；帶 hash 的 HTML artifacts 全 MATCH。
- IME 僅測 browser synthetic CompositionEvent lifecycle；**沒有測原生 OS IME**，不擴張宣稱。
- `host-acceptance/pgq.log`：四支 affected PGQ 使用 `--test-concurrency=1`，**單輪 16/16 unique named PASS**，fail/cancelled/skipped 全 0；703095.054ms。沒有拼湊 retry 結果。
- `host-acceptance/controller-receipt.json`：正式 AI Core `e155b3abeabe45c2442bcf86c30236237c84ffaa`；hostSandbox=null，沒有 unset sandbox 或放寬資源閘門。
- 12 秒 logical-line readiness、direct-text、PGQ、Browser.close、supervisor 均 exit 0；session owned root 與 controller 一致且已不存在、isolation marker absent，cleanup **PASS**。

## Integrity / history

Source **6/6**、protected **4/4** 前後 MATCH；ZIP **2,283,305 bytes**，SHA-256 `7d1cbe050b61dab6fd31f4daa90290d298ee5c17509be7af363cd26446872929`。未 rebuild ZIP。詳見 controller before/after 與 `host-final-verification.json`。

原 sandbox preflight pending 保留在 `browser-preflight.txt` 與 `mainline-checkpoint.md`；本輪 WP2-S1 無 browser/PGQ failure 或 retry。先前 slices 的歷史 FAIL 未修改。

## Mainline decision

Host blocker 已解除，可交 Independent Review；本 receipt **不是 Independent GO**。交 `handoff_20260922_edx_wp2_s1_review.md`；未 merge／push／deploy，未開下一 Slice。
