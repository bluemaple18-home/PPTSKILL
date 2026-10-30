# Browser／client 程序歸屬候選

日期：2026-09-28。Mainline 是本 task，承接 Owner「繼續」。本輪處理既有 Core3 驗收的程序歸屬缺口，不改 scanner、不開 R3 或 Core4。

## 裁決與最小改動

原 controller 將產品放在 browser 以外的 session，卻共用受管 tmp；外層 finish gate 無法攔截 supervisor 因 TTL／觀測失敗自行 cleanup。REPLAN 採既有 `tmp_session.py browser` 的可選 `-- <client命令>`：Chrome、client 與後代繼承同一個 outer `run_child` 群組。唯一容量／TERM／KILL／群組收斂／cleanup authority 仍是原 lifecycle；不新增 registry、cleanup interlock 或 supervisor。

固定產品命令以 `execFile` 繼承群組／環境；managed port 存在時 producer 只 attach。11 個相關檔的靜態盤點與 hash 見 `browser-command-ownership-client-audit.json`。這是可信任、non-detached 命令的契約，不涵蓋任意 client 主動 setsid／脫離群組或 hostile containment。

候選 branch：`codex/core3-browser-command-ownership`，重用既有候選 checkout。base 是 canonical **28cad2d3beaaf32de2f62d0c08396aaba789ea01**。首版 **1829f1ab31ba63bbe6e286faf1bc03d2bb9e11ed**；一次 Repair1 後固定 **996492481144e92775780ce932661e38779cdddc**。總 delta 仍只有 `scripts/tmp_session.py`、`tests/test_tmp_session_browser_command.py`、`docs/tmp-session-lifecycle.md`。原無 client browser/review 入口、scanner、policy、sensor 不改；候選仍未整合 canonical。

## 真實程序驗證與獨立審查

- 首版 Mainline 正式 host：`test_tmp_session*.py` **25/25，0 skip**，37.083 秒；fake browser/client，不啟 Chrome／PGQ。十組 case 保存真 root／PID／PGID／退出碼；另 fresh ps 核對已知28個PID皆不存在。
- A／B 各自重現單次 journal I/O 失敗後錯回 exit 0。A 將其列 P2、窄 CODE GO；B 列 P1、NO_GO。主線採較嚴格的失敗契約；保留兩份不同裁決，沒有改寫成一致意見。
- Repair1 僅讓 caught OSError 的失敗狀態保留到最後回傳，加一個 ENOSPC／EIO 單點測試，同時核對原非零退出碼優先序。Worker unit＋routing **11/11**；這是 Worker 報告，不冒稱 Mainline raw log。
- 修正候選 Mainline 正式 host：`test_tmp_session_browser*.py` **15/15，0 skip**，16.049 秒；重新覆蓋同群組十組 case與留證錯誤。成功0、client非零7、residual2、SIGINT130、SIGTERM143、TTL／bytes／files2；各root消失、known PID消失。fresh ps再次核對28 PID無匹配。初版25/25與新版15/15各標原SHA，不合併成40個不同案例。
- unknown 收斂保留 root／隔離以 mock 原 `command_run` 驗證，未在真 host 製造不可回收 root。SIGKILL 後無法觀測的 child wait status 保留 null，不填0；outer resource-stop2不冒稱 child 原始退出碼。

修正後 A／B closure：**GO／GO**，同一固定99649248三檔SHA相符。A原P2與B-BC-01均已關閉；A原反例重播及新增unit的6個subcases通過，B fresh 2/2 methods／14個窄故障組合通過。原完整 review 與新 closure 分檔，不覆寫。Mainline採用建議：**GO_FOR_CANONICAL_INTEGRATION，尚未整合／啟用**。

## 可查核證據

`browser-command-ownership-verification.json`／`browser-command-ownership-host-tests.log`：首版25/25與原bundle。`browser-command-ownership-after-processes.json`：首版fresh ps。

`browser-command-ownership-repair1-verification.json`／`browser-command-ownership-repair1-host-tests.log`：修正版15/15、具體case、fresh ps、三檔SHA及bundle SHA。`browser-command-ownership-repair1.bundle` 已 verify，prerequisite為28cad2d3，保留首版與Repair1歷史。A/B的review、probes、log與results分別保存在同目錄對應前綴。

Canonical仍精確28cad2d3、tracked clean；產品75 source／4 protected／ZIP再驗 MATCH。原兩個canonical untracked與候選CLAUDE.md、PPT原四個untracked保留。原R2 host applicability PASS／RECOVERY_NOT_OBSERVED不變；本輪沒有重跑R2 smoke，也沒有真Chrome、雙viewport或PGQ。

## 待放行的具體整合範圍

兩份closure通過後，僅建議採用固定99649248最終三檔。開始前canonical必須仍為28cad2d3且無tracked drift；bundle verify及三份SHA需完全一致。匯入後一次套用最終三檔並形成單一local integration commit，不把首版錯誤狀態作為獨立啟用版本。驗證最終bytes、入口／routing測試及scanner／policy不變；失敗只revert本次integration commit，不reset／clean、不得覆盖untracked。

PPT驗收接線須改成同一受管client，移除舊controller建立獨立產品session的接法；generic port薄mapping到原產品env，原25秒readiness／64MiB／10000files／TTL3600與雙viewport、四PGQ順序不放寬。先完成接線的failure-path驗證，再做一次固定產品驗收，不插入額外scanner smoke。舊controller／pending manifest目前未修改，不能直接拿來啟動。

Owner此次「繼續」明確承接修復準備，但其AGENTS規則同時明列「繼續…禁merge／push／deploy／production／外部write」。因此本輪候選、測試與可審整合方案先做完；canonical整合另待明確放行。沒有以更名或直接覆寫canonical規避此邊界。
