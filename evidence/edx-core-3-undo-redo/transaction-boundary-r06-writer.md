# Core3 round-06 bounded repair Writer receipt

Core3 round-06 → 兩個 P1 與同 handler 家族的交易終態 → `WRITER_SCOPED_GREEN / MAINLINE_REVIEW_PENDING`。

起點 `f03b0dfc28004b8bd1982771d318269250b261ce`，branch `codex/edx-core-3-undo-redo`，PPTSKILL-canonical 原 worktree；tracked 起始乾淨，僅四個 protected untracked。Owner 本 task 明示「繼續」，依 `tasks/edx-core-3-transaction-boundary-review-repair.md`，shared 唯一 Writer，主線不並行寫 repo。產品前候選為 packaged `b35336d`／code `e6f9afa`。

Reviewer A 的兩個 P1／NO-GO 與 Reviewer B 的 CODE GO／10 probes PASS 均保留，不能互相抵銷。本輪不修改原 review、repro 或 Mainline 控制卡；新測試期待正確行為，不把原 repro 的「assert bug exists」改成通過。

## 查詢、假說與最小修復

CodeGraph 實際查詢 `publicLayout setMode syncText mutate mountComponentInteraction nudge alignSelection distributeSelection initialize executeOperation notify`（maxFiles=1），回傳 style-candidates／generation-plan 等無關符號。依 embedded closure 已知索引缺口，使用 rg／原始碼追既有 seam。

可證偽假說：public setMode 的 preview-only guard 沒有涵蓋 syncText 與終態通知；UI handler 在 executeOperation 回傳後才通知，又自己 catch，因此外層 snapshot 看見的是成功 return。把最外層成功路徑與最後 controls 納入既有 mutate，失敗先完整回退再讓 catch 呈現 error，兩項正確行為測試應轉綠。僅加 setter guard 或僅把 executor 包住，均不能涵蓋這兩條路徑。

- Public setMode 及 layout click 由同一 owner 持續排他，真實寫入走既有 mutate；最後 controls 在其 rollback 範圍內完成。public facade 沒有取得 private 寫入能力的 callback 開口。
- 模式切換 checkpoint 增補既有 mode 按鈕的 text／aria-pressed／hidden 與 DOM contentEditable property，維持原 contenteditable attribute、pending DOM text、canonical、revision、history 的回退驗證。
- mutation checkpoint 記錄既有 interaction target。group／ungroup 即使 selected IDs 沒變，canonical 回退後 target 仍可能不同，因此沿 restoreSelection 重建，並檢查 target 同態；acceptText 沿原契約一併更新 target 基線。
- nudge、align、distribute、initialize、group／ungroup／lock／unlock 的成功分支在各自 catch 之前使用同一既有 mutate，涵蓋 operation、成功通知及相關投影。沒有各操作的成功／失敗旗標，沒有新增 writer、history、scene graph 或 transaction manager。
- 純 refresh／selection／viewport 入口仍只用 bounded guard；未新增全 spec snapshot。大 payload 的既有 getter／serialization 硬斷言保留且通過。

## 有限 handler 副作用盤點

| 入口 | operation 到最後可 throw 副作用 | 修復邊界 |
| --- | --- | --- |
| public setMode／layout click | clear selection、interaction／selection mode、setTextMode(false)／syncText、body／按鈕、Selecto、onSelectionChange、notify、history controls | owner 下取消既有 preview，再由 mutate 完成切換及終態 rendering；釋放後僅 return |
| nudge | move-element／move-group → 成功 notify → restore；keydown preventDefault／stopImmediatePropagation／Moveable.updateRect → history controls | model 使用 mount 傳入的既有 mutate 包成功分支；keydown 外層既有 mutate 保護其後續投影 |
| align | align-selection → applySelection → 成功 notify → history controls | catch 外的成功分支先完成 mutate；失敗後沿原 applySelection／錯誤通知 |
| distribute | distribute-selection → applySelection → 成功 notify → history controls | 同 align，無獨立 state |
| initialize | move-element → restore → initializeButton.hidden → bindVendor → 成功 notify → history controls | mount handler 在 catch 之前以 mutate 包完整 initialize 分支 |
| group／ungroup／lock／unlock | operation → applySelection → 對應成功 notify → history controls | 同一分支使用 mutate；發生 error 時先回退 canonical/history/selection/target，再顯示未套用 |

## Reverse mode hypothesis

Owner 補充的「先 snapshot preview、cancel 後再把 preview 還原」是本輪須避免的 failure state，未將它冒充為 Reviewer A 已證實的第三個 P1。

active gesture 時，先在 owner 下使用既有 cancel／restoreSelection，讓畫面回到 canonical，再建立 mode checkpoint；不重建舊 gesture。mode checkpoint 只略過既有 interaction chrome，因它由 selection／vendor 重建；canonical 節點的 sibling 比對同樣略過短生命 chrome。其他 operation／gesture checkpoint 與 preview attribute fallback 不改採此模式，double projection fault 的既有覆蓋不放寬。

snap=false／true 兩條終態 fault 均驗證：原 error 身份、canonical／revision／history、mode／selection、canonical DOM style、gesture=false、vendor target 仍連接 DOM、舊 end 不提交，以及新 gesture 可正常提交。非 active 的 forward mode 另驗 pending text／contentEditable 完整保留，之後成功切換才提交文字。

## RED／GREEN evidence

下列 basename 均在本目錄，prefix 為 `transaction-boundary-r06-`。每份 TAP 原輸出以 byte-preserving gzip 保存；JSON 記錄數量與未壓縮 SHA256，可 `gunzip -c` 重播閱讀。

| basename | 結果與解讀 |
| --- | --- |
| mode-red | 0/2，forward 留下文字提交；reverse mode／selection 未回復，均合格正確行為 RED |
| group-red | 0/1，成功 notify after-effect throw 後 canonical／history 仍提交，合格 RED |
| family-red | 0/8；7 項目標缺陷，distribute 原測試 action 名稱錯誤，該項不算有效 RED |
| family-red-02 | 修正 action 至既有 distribute-horizontal-gaps，0/8，八條均為目標原子性缺陷 |
| active-mode-red | 0/2；snap=false 為 mode 回退缺陷；snap=true 初版未傳 vendor left/top，未形成 preview，此項不算有效 RED |
| focused-01 | 9/12；canonical 已回退，group／ungroup target 尚未重建，snap fixture 尚未送有效 preview |
| focused-02 | 10/12；group 的 recovery probe 誤用單一 drag event（需 dragGroup）；snap 真實 preview 後遇到 chrome sibling checkpoint 失配 |
| focused-03 | **12/12，0 FAIL**；修正既有 group event 接點及 mode chrome sibling 比對後，全部正確行為 regression 通過 |
| core-01 | **153/153，0 FAIL**，9 檔 focused 相容性；其後僅縮排與 acceptText 同步已新增 target checkpoint，最終 source 由 full 覆蓋 |
| full-01 | **81 檔、1056/1056，0 FAIL、0 skipped、exit 0**，最後 code/test source SHA256 已存 JSON |

修復有持續實測進展（9→10→12），未出現同類修正連續兩次無進展，亦無跨第三 runtime／新增 authority。所有中間 FAIL 原樣保留，fixture 問題明確與產品缺陷區分。

Focused：`node --test --test-reporter=tap --test-concurrency=1 tests/edx-core-2-group-lock.test.mjs tests/edx-core-3-undo-redo.test.mjs tests/edx-core-3-transaction-boundary.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/edx-wp1-s4-interaction.test.mjs tests/edx-wp1-s5-keyboard.test.mjs tests/edx-wp1-s9-mounted-alignment.test.mjs tests/edx-wp1-s10-mounted-distribute.test.mjs tests/edx-wp1-s7-snap.test.mjs`。

Full 清單與原 Mainline 相同 81 檔，排除原四個 PGQ。`transaction-boundary-r06-run.mjs` 使用原清單，拒絕覆寫已有 evidence；repo root 可執行 `node evidence/edx-core-3-undo-redo/transaction-boundary-r06-run.mjs full rerun-01`，或以 focused 重跑上述 9 檔。

## 交回邊界

- code/test 僅 `runtime/deck-editor.js`、`runtime/component-interaction.js`、`tests/edx-core-3-transaction-boundary.test.mjs`。新增 12 tests，因此全量 1044→1056，無刪除／放寬歷史 assertion。
- `transaction-boundary-r06-validation.json` 記錄 base SHA、最後三個 source hash、歷史 review／repro／FAIL 原樣 hash 與 diff check；`transaction-boundary-r06-protected.sha256` 與原 protected-before 完全相同。
- 仍是 Node／VM／synthetic mounted evidence，非真 browser/vendor pointer 驗收。未啟 browser、未跑 PGQ、未改 ZIP／其他 runtime／AI Core，未 merge/push/deploy，未再開 reviewer。
- Full GREEN 不直接改判產品 GO。交回 Mainline 重建 ZIP，原兩名 Reviewer targeted re-review；回退單位為本輪明確路徑 commit。歷史 NO-GO／FAIL 保留。
