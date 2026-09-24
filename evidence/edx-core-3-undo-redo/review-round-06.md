# Core3 交易邊界固定候選雙盲審查

Packaged SHA：`b35336d607b21ce236f1574c1f8587e9a5b730f4`；code SHA：`e6f9afab11d74e95042f7abe3157daa6c2d4f92d`。
Mainline verdict：`CODE_NO_GO / P1_2 / BOUNDED_REPAIR`。兩名 Reviewer 結果不以多數決互相抵銷；有可重播 P1 就不得整合。

Reviewer A（Lovelace）fresh scoped 98/98，但獨立 probe 發現下列兩項；Mainline 以其原腳本 fresh 重播，均成立。最小腳本搬入本目錄時只把本機絕對 import 換為 repo-relative import，未改斷言與故障。

1. **P1：publicLayout.setMode(true) 終態通知 after-effect throw 留下 pending text 提交。** 從 edit 模式、有未同步標題，呼叫公開 setMode(true)，讓 layout 成功 status setter 寫入後 throw。API 雖拋原錯誤，canonical title 已更新、revision 0→1、history 0→1、body mode edit→layout。預期整個模式切換／文字同步回到呼叫前。見 `review-round-06-public-layout.mjs`／`.json`；位置 `runtime/deck-editor.js:807`、`runtime/component-interaction.js:370`。
2. **P1：group UI 吞掉終態 notify error 卻保留群組提交。** 多選兩元件後點 group，讓「已群組」status setter after-effect throw。UI 顯示「未套用」，但 canonical group 已建立、revision/history 各 +1。預期失敗不保留該 operation。見 `review-round-06-group-ui.mjs`／`.json`；位置 `runtime/component-interaction.js:430`。

Reviewer B（Euclid）給 CODE GO，fresh 新 boundary 18/18、其他 Core2/Core3/S4 80/80，另 10 個獨立 probes PASS。原 reorder nested Undo/operation、gesture 終態、double projection、snap false/true/group rollback 後再操作、private paste-style、pointer/viewport 成本均通過。Crop module 的獨立 input/change/cancel 無提交路徑，確認裁切仍經 document click owner，未形成 finding；不可把此前 Mainline hypothesis 寫成事實。B 的 GO 未覆蓋 A 的兩項新反例，不足以關閉它們。

Writer full 1044/1044、scoped 98/98、Mainline ZIP lifecycle與75source/protected hash通過仍保留其涵蓋範圍；不能蓋過上述 P1。本輪無 fresh browser/PGQ，仍受 AI Core observer 前置阻塞。

2026-09-24 Owner 在中斷後明示「繼續」，主線承接本批兩個可重播 findings 的 bounded repair；範圍和止損在 `tasks/edx-core-3-transaction-boundary-review-repair.md`。不重開新 feature chain，不整合、不開 Core4。
