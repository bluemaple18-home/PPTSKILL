# EDX-WP2-S17 Independent Review handoff

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Branch: codex/edx-wp2-s17-text-double-click
Base: df584eb920292be2a517ac72721c02455ddb0505
Product candidate: 8c0781083ea21cdd365e5f9e1f91f4b7057cdc70
Runtime／ZIP: ca4f4d70d5e466adc8e7588c637d83ee34aac9e4

請獨立唯讀審查 S17：文字元件雙擊開啟既有 S16 dialog。先讀 tasks/edx-wp2-s17-text-double-click.md；不要把 Mainline 或 Worker PASS 當成你的 verdict。審查 product candidate 的固定 diff，control/evidence 後續提交不得改 reviewed delivery。

## 主要檔案

- runtime/deck-editor.js：事件 actual target／canonical selection 對齊、S16 pending/busy 與原 writer、S1 role 相容、bootstrap guard。
- tests/edx-wp2-s17-text-double-click.test.mjs：53個行為 cases，含負例、snap/gesture、stale、IME、export/remount。
- tools/edx-wp2-s17-browser-cases.mjs、tools/edx-wp1-s4-browser-acceptance.mjs：新 flag 只跑 base10＋S17；真 pointer 與 synthetic fault 分列，未放寬既有 assertions。
- dist/PPTSKILL-0.1.0.zip 及 checksum：runtime byte-match，與 source freeze 綁定。

## 重播

在對應 <repo-root> 檢查 git diff df584eb920292be2a517ac72721c02455ddb0505..8c0781083ea21cdd365e5f9e1f91f4b7057cdc70 -- runtime/deck-editor.js tests/edx-wp2-s17-text-double-click.test.mjs tools/edx-wp2-s17-browser-cases.mjs tools/edx-wp1-s4-browser-acceptance.mjs。

Focused：node --test tests/edx-wp2-s17-text-double-click.test.mjs。Scoped／full 的完整實體檔名分別見 evidence/edx-wp2-s17/scoped-files.txt 與 nonbrowser-files.txt，以 --test-concurrency=1 執行；禁止以 filtered-empty files 湊數。

Mainline fresh scoped313/full874、browser26+26、PGQ單輪16、ZIP lifecycle、source4/protected4/ZIP及cleanup全部PASS；最終機器核對見 evidence/edx-wp2-s17/host-final-verification.json。各 log／source-hashes.json／receipt.md 保留。Reviewer 必須分清 fresh rerun 與 committed evidence 核對。

Browser 只能沿正式 managed host，actual CODEX_SANDBOX 空；不 unset、不改 capacity/Rule24/readiness、不碰既有 profile。重播使用新的 evidence output 目錄，保留本輪首個 NOT_PASS；目前 host-controller-pointer-repair.py 的固定 output 已使用，不能原樣覆寫。四支 affected PGQ 原單輪16不可混算重跑。

## 關注點與交回

檢查雙擊其他物件不會打開舊 selection、role 與 component 模式不混用、取消／draft export 不寫入、snap/gesture 不誤提交、showModal failure 可回收、同 document bootstrap 不重複 listener。S17 不涵 component inline contenteditable／OS IME／auto-fit；不要把這些功能算成已完成。

回報固定 candidate SHA、P0–P3 findings、可重現步驟／檔案行號、fresh tests 與 evidence 核對各自範圍，最後給 GO／NO_GO。只讀審查，不 merge／push／deploy、不開 S18。
