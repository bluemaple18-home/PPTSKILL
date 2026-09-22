# EDX-WP2-S2 Mainline receipt

Status: REVIEW_CANDIDATE / INDEPENDENT_REVIEW_PENDING
Product：`14555d0499e1f07ec8fabf3deb5e33db90d4d608`；branch `codex/edx-wp2-s2-role-font-size`；base `4a1c0bb0fddff372253eaa3e4ea5f33a3204ea1e`。

## Scope / root question

title/subtitle 的 bounded font-size 能否沿既有 operation、canonical schema、live/render/export 完成一致 round-trip。僅 integer 16..160/null reset，不支援 component/keyPoint 或任意 CSS。`composition.typographyOverrides` 為唯一字級覆寫 authority，StyleSpec/default renderer 保留；無新 dependency。

## Implementation / prior art

開卡 `65e59e6`，產品初版 `294b132`，診斷 harness `37837cd`，toolbar 修復 `14555d0`。依 `research/editor-prior-art.md` EDX-D02 role typography seam 採 bounded custom delta，不吸收 donor DOM-only inline authority。Node/portable 共用 `role-typography.js`；contextual number input + apply/reset，IME guard 與切頁/模式清 target。Mainline 控制卡，單一 clean-context Worker 實作，沒有 fan-out。

## Tests / history

- Worker scoped **66/66 PASS**，其原始 RED 與中間 fixture/identity failure 皆保存於 `worker-*.log`；詳見 `worker-result.md`。
- 主線首輪 full non-browser **425/431**，6 failures 為 S3 registry snapshot 與 DOM stub 缺 getAttribute（`nonbrowser.log`）。只補該測試 fixture；geometry assertions 未放寬。
- Fixture 修正後 full **431/431 PASS**（`nonbrowser-final.log`）。toolbar CSS 修復後再驗 full **431/431 PASS**（`nonbrowser-toolbar-repair.log`）。不將兩輪相加。
- 最新 ZIP lifecycle **PASS**：`distribution-lifecycle-toolbar-repair.json`；shared core ready/single；Gemini CLI missing 僅屬 host capability partial。

## Fresh browser / failure classification

1. `host-acceptance/` 首輪 FAIL：1280×720 套用 16px 後 computed font-size 仍 54px。PGQ 未啟動。Browser.close/supervisor/cleanup PASS。
2. `host-diagnostic/` 仍 FAIL，但新增證據：canonical=null、toolbarHidden=false、apply button rect 0×0，點擊命中 slide；排除 CSS 字級投影已提交的假設。既有 toolbar 隱藏 selector specificity 高於 edit-mode 規則，導致新 toolbar 實際不可見。PGQ 未啟動，cleanup PASS。
3. `14555d0` 只補 typography toolbar edit-mode 顯示 selector、harness 加可點擊尺寸 assertion 並縮小診斷輸出，重建 ZIP。`host-toolbar-repair/typography/acceptance.json` 雙 viewport **各 16 checks PASS**（10 base + 6 aggregated typography），console/page/network/HTTP/remote 全 0、targetClosed=true、HTML artifact hashes MATCH。

真 double-click title/subtitle、16/160 boundary、invalid rejection、reset/default、toolbar focus sync、text edit preserves font、IME guard、slide/mode stale target、export/offline reopen/reset 皆覆蓋。IME 只測 browser synthetic CompositionEvent lifecycle，非原生 OS IME。沒有隱藏或覆寫歷史 FAIL。

## Final host / integrity

四支 affected PGQ 於 `host-toolbar-repair/pgq.log` 串行 **單輪 16/16 unique named PASS**，fail/cancelled/skipped 全 0。AI Core `e155b3a` 正式入口，hostSandbox=null；readiness/typography/PGQ/Browser.close/supervisor 全 exit 0；owned root 與 session 一致且已移除，isolation marker absent，cleanup PASS。source 13/13、protected 4/4、ZIP bytes/hash 前後 MATCH，詳 `host-final-verification.json`。本輪未放寬 safety gate。

Frozen sources **13**、protected **4**；ZIP **2,286,500 bytes**，SHA-256 `33fc2e5d44ac7a30ee130a8ecf4a8881125811a15d0bbba35c36b4f51936d10f`。新 runtime/schema bundled bytes 與 source MATCH；歷史 manifests 保存為 `source-hashes-initial.json`、`source-hashes-diagnostic.json`。

未 merge／push／deploy；未開下一 Slice。Mainline acceptance 不能代替 Independent Review GO。

Mainline 判定：可交 Independent Review；verdict 尚 pending。Handoff：`handoff_20260922_edx_wp2_s2_review.md`。

原始 failure log 的行尾空白使 evidence diff-check 失敗；可讀 `.log` 僅去除行尾空白，完整原始 bytes 另存同名 `.log.gz`，解壓後 SHA 見 `raw-log-archives.json`。未改寫任何 failure 結果。
