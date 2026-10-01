# Core6 Final Closure：本機候選收據（2026-10-01）

**裁決狀態：CODE PASS／HOST PASS／VISUAL PASS／ZIP PASS；INDEPENDENT_REVIEW_PENDING；整體仍 5/6。** 本收據是 Mainline 的候選整理，不代替獨立 code／host 複審，不授權 push／merge／deploy。

## 身分與最小修復

- Base：Core5 `eca7a2b3a9c0fb7cd567b175d5c00ae12e7b5c95`；工作分支 `codex/edx-core-6-final-closure`。Core5 遠端 SHA 已核對一致。原有 `tasks/edx-core-six-card-closure-plan.md` 修改及四個 protected untracked 未納入此候選。
- 測得缺口：`migrateLegacyFixture()` 及未指定 composition 的 sanitizer／editor 缺省會產生 `title-body`，現行 renderer 不支援。先有 RED 重現，再把三處缺省改用現行 `title-points`；未新增 primitive、renderer 分支或持久化路徑。變更檔為 `runtime/deck-spec.js`、`runtime/deck-editor.js`，並重建 `fixtures/full-deck.html` 與 ZIP。
- 源碼 SHA-256：`runtime/deck-spec.js` `81eaf0d67230740baec15942838146fba058260bc8028789548ac2df48e7b617`；`runtime/deck-editor.js` `1c1c5a8d1dab4fef37f763a140896ed91b7665439bfd3cd3831bc4cd8e696887`；`fixtures/full-deck.html` `f8c61df2d8ea64a547965efa087bab1363852eb7519e2a0d694f6d111fda3eff`。
- ZIP：`dist/PPTSKILL-0.1.0.zip` **2,338,905 bytes**，SHA-256 `84b2ae64291aca43d5bab2ff6fb1276d88767949aa081df260aab0c945683bdb`；包內兩份 runtime 與工作樹逐 byte 相同。`zip-probe-final.json` 的 lifecycle／package smoke PASS；host capability PARTIAL 僅因本機沒有 Gemini CLI，未將此宣稱為全部 adapter host PASS。

## 契約與正式驗證

- `tests/edx-core-6-final-closure.test.mjs` 三項契約：舊 fixture 遷移→渲染→recipient 只憑 HTML 讀回→bounded patch→重開；缺 composition 採可渲染缺省；Crop／Group／Lock／人工字級同份 canonical 交付且私密 profile 未流出。
- `nonbrowser-final.log`：74 個唯一非 PGQ 測試檔，**1034/1034 PASS、0 fail／skip**。先前 `nonbrowser.log.gz` 保留 `pnpm test` 在 sandbox 將 PGQ 一併執行而因 Chrome port 不可用失敗的原始 byte（解壓 SHA-256 `d638e949ac820fc791d1d71c021dbffdee3170aabb9290dff8da258863e12ad9`）；正確分流後由受管 host 跑 PGQ。三份變更 JS `node --check` 與 `git diff --check` PASS。
- 正式 host `host-acceptance-04/browser-geometry.json`：1600×900、1280×720 兩輪的 runtime、contentIntegrity、requiredVisibility、rasterVisibility、geometry、motion 六 gate 均 PASS；各輪 issues、console、pageerror、network failure、HTTP error 均為 0。1280 實圖與十頁 montage 已人工查看，未見新的明顯遮擋；此結論不等於通用 OCR／glyph-ink 保證。
- 同輪 `editor-export.html` 由受管 Chrome 的 editor API 匯出，browser 重新載入後首張 title／subtitle 與 10 頁數量相符；用 `extractDeckSpec()` 比較交付 HTML 與原 `fixtures/full-deck.html`，**10 頁 canonical 全等**。recipient 僅憑交付 HTML 重讀的契約成立。Core4 的 local draft 故障恢復不在本輪產品 delta，Core6 host 以 export／offline reopen 驗收交付檔；不得把它說成本輪重新做了 read-fault 注入。
- `host-acceptance-04/pgq-1.log` 至 `pgq-4.log`：1＋7＋7＋1＝**16/16 PASS，0 fail／skip／cancel**。`client-receipt.json` 五個命令 exit 0、Browser.close PASS；`lifecycle/evidence/processes.jsonl` 的 client／browser exit 0，owned root 和 marker 不存在，原 PGID 32844 的 `ps` 點時查核為空。
- `identity-before-04.json` 與 `identity-after-04.json`：98 個受保護／產品／ZIP／host 工具／AI Core 入口 SHA-256 完全一致。`host-acceptance-04/artifact-manifest.json` 鎖定 14 份原始 host artifact 的大小與 hash。

## 失敗紀錄與殘留

- `host-acceptance-01`：驗收 client 的日誌 stream 未等到 `open`；Chrome 已 Browser.close，root／marker 清理。
- `host-acceptance-02`：client 未把受管 port 映到 browser QA；QA 自啟另一 Chrome，resource scanner 依規停止。只修 env mapping，沒有放寬 AI Core。
- `host-acceptance-03`：兩 viewport 六 gate PASS，但通用 recipient check 錯把無 motion 的 full deck 當成 motion fixture 而 fail。只補無 motion deck 的實際首張 DOM／頁數分支；既有 motion branch 未改。三輪均為原始 NOT_PASS，不計入正式 host PASS。
- Core1 Crop F2／P2 **OPEN residual**：舊 observer teardown 已有副作用後 one-shot throw 的注入案例仍有 2/11 未過，可能使 rollback 後 observer／load 投影失效；未見普通 browser 自然觸發。此次正常路徑 PASS 不關閉它。
- Core3 receipt I/O／P2 **OPEN residual**：exit 7 後的 receipt EIO 可能令摘要 scalar 變 2；原始 7 仍留在紀錄且整輪 NOT_PASS，不會假 PASS。此輪未改 AI Core，仍以原始 child exit 為裁決依據。
- 獨立 code／host／visual／ZIP 複審及最終 Mainline 裁決尚未完成。候選未 local commit、未 push／merge／deploy；**不得宣稱 Core6 CLOSED 或 6/6**。
