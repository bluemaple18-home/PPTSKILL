# Core3 與 PGQ／observer 的 Mainline 裁決

Status: REPLAN / PRODUCT_OWNER_DECISION_REQUIRED / HOST_OBSERVER_BLOCKED
Snapshot: `PPTSKILL-canonical` branch `codex/edx-core-3-undo-redo` at `155e97419374096baefb689cccba0d48f74011d3`；product candidate `60a05ce33924dfd92c2977d743b24afc408dd207` 為 NO-GO。Core3 未關、核心完整版維持 2/6；未 merge／push／deploy。

## Root question 與目前 blocker

Root question：能否在不跨越已核准成本與受管 host gate 的前提下完成 Core3 Undo／Redo？目前不能。兩名獨立 Reviewer 各自找到 P1，主線在 `review-round-03.md` 重播三項：gesture commit 後投影 throw 卻留下 canonical／history、gesture 收尾可重入 Undo、有效 reorder 失敗留下先前文字提交。Repair 2 額度已用完，依 `tasks/edx-core-3-undo-redo-repair2-approval.md` 停止產品修復；下一次產品修復須 Owner 另行裁決，不能以 PGQ 交接卡當授權。

另一個獨立 blocker 是 host04 的 AI Core observer `IO_ERROR_OBSERVED`：scanner `427162d34af5be6f3269c418f141716130909ce3fea82b5e3b4431732ebfdd6c` 在 `profile/Default` 的 Chrome 暫存 entry 執行 no-follow `stat` 時收到 ENOENT。2026-09-24 唯讀核對 AI Core HEAD `c23e46555b73a29f16319c657622acb1acc51e7a`，scanner SHA 仍與 host04 相同；目前只能說具體失敗仍適用，不能宣稱競態根因已證明或共用修復已完成。PGQ 7/10 與 supervisor exit 2 均不得算 PASS，雖然 owned root／marker 已清除。

## 兩條責任線與依賴

1. **PPTSKILL 產品線：停在 Owner 決策。** 只保留固定反例與卡片；若 Owner 另行授權，須先重新設 Repair 3 的最小範圍、成本和停止條件，再由同一產品 Writer 修三個 P1。修改後重凍 product／ZIP SHA，先獨立 code review GO，不能拿原雙 viewport PASS 代替新候選驗收。
2. **AI Core observer 線：可獨立調查。** 由 AI Core owner 在其 repo 以 host04 scanner identity、entry、errno、phase 與 cleanup receipt 做 bounded reproduction；保留 no-follow、identity、資源 ceiling 與未知 I/O fail-closed。PPTSKILL 不 fork 或 monkey-patch scanner；此線不消耗 Core3 Repair 額度。
3. **PPTSKILL 測試路由線：可先做唯讀／最小提案。** `package.json` 的 `pnpm test` 會收進 4 支 browser-required PGQ，沙盒的 1018/1022 不是 full PASS；應明列 non-browser selection 與 host-required PGQ，並在既有報告接點保留 supervisor 首因，避免把缺失報告的 JSON parse 當根因。這是測試入口／回報邊界，不是產品 P1 修復；如需改工具檔，先固定該工具變更的測試與候選身份，不用新 launcher 或永久 skip PGQ。

Blocking edges：產品 P1 關閉＋獨立 code GO、observer 具適用版本的真 host 處置證據、PGQ 測試路由正確，三者齊備後才跑固定候選的受管 PGQ／browser 與 closure。單獨換 host 或盲目重跑 PGQ 不補任何現缺證據。AI Core 交接卡位於 `<ai-core-root>/.work/CARD-PPTSKILL-PGQ-HOST-ROUTING-AND-OBSERVER-HANDOFF-20260924/brief.md`。

Mainline 裁決：`STOP_LOCAL_CONTINUATION` 對 Core3 產品 Repair；observer 作獨立 fork，測試入口作 bounded diagnosis。等 Owner 決定是否授權額外產品 Repair；在此之前不開 Core4、不 merge／push／deploy、不重跑正式 host acceptance。
