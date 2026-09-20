# EDX-WP1-S3 獨立 review handoff

## Root question

Component-only move／resize 是否在既有 CompositionSpec 上形成 bounded、portable、Node/browser 一致的 canonical operation，而沒有第二套 layout truth？

## Current state

- Branch：`codex/edx-wp1-s3`。
- Base：`b43def29751fa8d964a5fa59d90c77df1fadc729`。
- Reviewed candidate：`51494b35e5462311d37d1411793bc14780483359`；後續 docs closure 不改 reviewed source／ZIP。
- Task：`tasks/edx-wp1-s3-bounded-geometry-operation-path.md`。
- 實作與主線驗收：`evidence/edx-wp1-s3/worker-receipt.md`、`evidence/edx-wp1-s3/mainline-receipt.md`。
- Owner 已回傳獨立 review GO：P0 0／P1 0／P2 1／P3 0；Mainline 接受 closure，尚未整合 main，沒有 merge／push／deploy。

## Review scope

- `runtime/component-geometry.js`、`runtime/deck-spec.js`、`runtime/full-deck-renderer.js`、`runtime/deck-editor.js`、schema、S2/S3 tests。
- `tools/browser-geometry-qa.mjs` 僅新增 managed attach lifecycle seam；既有 authority 判斷不放寬。
- `tools/edx-wp1-s3-browser-acceptance.mjs`、fresh ZIP 與本輪 evidence。
- Geometry 為 finite integer absolute rect，1600×900，safe inset 80，minimum 80×80；首次 operation 的另一半使用 deterministic manual default，並非推算 legacy DOM box。
- 聚焦 unknown key／role／stale target／越界的 fail-loud 與原子性；content edit、duplicate／delete／orphan cleanup；合法 prototype-like ID；immutable descriptor；Node/browser/recipient canonical 一致性；viewport 比例與 live style 不外洩。

## Evidence

- Direct RED→GREEN、compatibility、non-browser full：各 log 與 exact commands 見 Worker receipt。
- 最終 focused browser：`evidence/edx-wp1-s3/browser-final/acceptance.json`。
- 真正 export 的 static／normal authority：`geometry-static.json`、`geometry-normal.json`；視覺輔證：`geometry-montage.png`。
- PGQ：`pgq-browser.log`；最後統計及 managed cleanup 以 Mainline receipt 為準。
- Source SHA：`verification-source.sha256`；ZIP build/lifecycle：`distribution-build.json`、`distribution-lifecycle.json`。
- ZIP：2,155,908 bytes；SHA-256 `150a23fa7fe9ab643c80009b5d22b3320811911eb7fade2e952379c61d9c0258`。
- 初次 `browser/` 與 `geometry-static-initial.json` 是修前歷史證據，不能當最終 PASS。

## Reproduction

先查 CodeGraph，再讀受影響 source；只讀 review，不改 candidate。基本核對：

```sh
git diff --check b43def29751fa8d964a5fa59d90c77df1fadc729..HEAD
shasum -a 256 -c evidence/edx-wp1-s3/verification-source.sha256
node --test tests/edx-wp1-s2-stable-identity-operation-path.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs tests/edx-wp1-s3-managed-browser-attach.test.mjs
```

Browser 使用既有 native 或 `tmp_session.py browser` 受管入口。macOS 本輪的 bounded Chrome wrapper 留在 `evidence/edx-wp1-s3/chrome-bounded.sh`；使用新的 evidence-dir 與 owned profile，不沿用已清理的 port。保持 64 MiB／10000 files／1800 seconds 上限，將新 port 檔設為 `PPTSKILL_DEVTOOLS_ACTIVE_PORT`，再執行 focused script 與 `node --test --test-concurrency=1 tests/pgq-wp4-s*.test.mjs`。重驗輸出放 review 自己的新目錄，不覆蓋本 candidate evidence；完成後關閉 owned browser，驗證 root 已回收。

## Blocker / candidate fork

- 本輪不開下一 Slice；獨立 review 已 GO，尚無整合授權。
- 已知 P2：manual geometry 的 `transform:none!important`／`scale:none!important` 會壓掉 component motion 的 transform 部分。保留為後續 bounded 修復事項，需補 normal-mode moved-component motion regression；不改本 reviewed candidate。
- Reviewer 的 fresh browser rerun 被其環境自動安全審核／缺 DevToolsActivePort 阻擋；其 browser 結論為核對已提交 evidence，非 fresh rerun。獨立 source SHA／focused 26/26／non-browser 214/214／diff／ZIP SHA 已重驗 PASS。
- 本機 Gemini CLI 不在 PATH，ZIP lifecycle PASS 不代表 Gemini host 實機驗證。
- 如 reviewer 有 P0/P1，附最小重現與修復驗收條件交 Mainline 裁決；不要在 reviewer 對話直接修。

## Next step / waiting conditions / limits

- GO 已落盤；等待 Owner 指示整合或後續 Slice，不自動整合、修 P2 或安裝 vendor。
- 不 merge／push／deploy，不做 interaction UI／history／AI bridge，不改四個既有 untracked：`.DS_Store`、`CLAUDE.md`、`HANDOFF-20260914-P0-R11-R1-S3.md`、`HANDOFF-20260914-PGQ-WP1.md`。
