# EDX-WP1-S8 Mainline checkpoint

狀態：**IMPLEMENTATION_COMPLETE / NON_BROWSER_PASS / MANAGED_BROWSER_ROUTING_BLOCKED / REVIEW_CANDIDATE_PENDING**。

Branch：`codex/edx-wp1-s8`；base：`9188b787ad964b92a129a5cff8f7067b08c0f4ea`。本 checkpoint 不宣稱 fresh browser、fresh PGQ、Independent Review GO；未 merge／push／deploy，未開下一 Slice。

## 實作

- 正式採用 pinned `selecto@1.26.3`，editor-local selection state 只處理 component identity；不寫 DeckSpec／CompositionSpec／localStorage／history。
- plain click、Shift-click、blank-space marquee、Shift-marquee 共用單一 selection state；結果去重並依 current-slide DOM order 穩定。
- `0` 清 selection；`1` 回既有 Moveable/S7 path；`>1` teardown Moveable control/proxy，只保留 Selecto bounded chrome與 selected count。
- 同一單選再次點擊會 reapply 既有 short-lived Moveable/focus seam，關閉 S8 初版造成的 S5 focus、S7 cancel/reselect、first-handle regression。
- export clone cleanup 同時精確清 Moveable／Selecto styled chrome；live selection不因 export 被清除，portable truth不持久化 selection。
- Selecto 1.26.3 source 已核對：`continueSelect=false` 時 `selectEnd.selected` 是本次 marquee 結果；Shift toggle authority 維持 editor selection state，沒有交給 vendor 建第二份 canonical selection。

## Fresh non-browser evidence

- `focused.log`：S3/S4/S5/S7/S8＋S1 export cleanup，**172/172 PASS**。
- `nonbrowser.log`：排除四支會真正啟 browser 的 PGQ，**377/377 PASS**。
- S8 mounted marquee 在 selection 後仍為 payload reads **0**、whole DeckSpec serializations **0**。
- `diff-check.log`：PASS。
- `source-hashes.json`：S8 20 個 source/build/test paths freeze；四個既有 protected untracked 與 S7 baseline **4/4 MATCH**。

## Dependency / ZIP

- Selecto bundle：63,167 bytes；gzip 19,807 bytes；SHA-256 `dd4d7afb863b1e73803325f16c9e49706ad8fd2325f245d8ca3a39bcf925e2cf`。
- Registry integrity：`sha512-gZHgqMy5uyB6/2YDjv3Qqaf7bd2hTDOpPdxXlrez4R3/L0GiEWDCFaUfrflomgqdb3SxHF2IXY0Jw0EamZi7cw==`；MIT attribution gate PASS，runtime 無 CDN／`latest`。
- Fresh `dist/PPTSKILL-0.1.0.zip`：2,280,120 bytes；SHA-256 `2334e9b2337c718f1cdaebd12169ce629a291c670a9af506dcd8b0b859b123e0`；低於 12 MiB warning／20 MiB hard fail。
- `distribution-lifecycle.json`：install/smoke/uninstall PASS、single shared core PASS、profile preserve PASS。Codex／Claude Code recognized；Gemini CLI missing 只列 host capability partial。

## Managed browser blocker

`managed-browser-preflight.txt` 實測本 task 為 `CODEX_SANDBOX=seatbelt`；AI Core HEAD 精確為 `2d78d8e18d42156f43f12f0ebc6997914ec64328`，Chrome executable 存在。依既有 `tmp_session.py browser` contract，只要 `CODEX_SANDBOX` 非空就會在 capacity／lifecycle／Chrome launch 前 fail-closed。

本輪沒有清除該旗標、沒有換入口繞過、沒有啟動 Chrome，因此不是產品 failure，也沒有可冒稱的 fresh browser PASS。S8 attach-only runner contract 已由 non-browser test 驗證會使用 owned target 且 navigation failure 仍 cleanup。

待可用 host runtime 時，只需執行已準備好的 `--selection-regression` fresh 1280×720＋1600×900，並串行補四支 export-seam affected browser PGQ：

- `pgq-wp4-s3-content-integrity.test.mjs`
- `pgq-wp4-s3-sample-approval.test.mjs`
- `pgq-wp4-s4-full-deck-qa.test.mjs`
- `pgq-wp4-s4-required-visibility.test.mjs`

兩組都 PASS、managed cleanup PASS 後，才可 cut independent review candidate。四個 protected untracked 不得 stage；不 merge／push／deploy。
