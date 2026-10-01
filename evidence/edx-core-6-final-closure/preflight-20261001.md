# Core6 Final Closure preflight（2026-10-01）

Root question：Core1–5 已通過各卡驗收，能否以同一份交付 HTML 完成 migration／recipient／離線重開、完整回歸及正式 host 收尾，並對既有 P2 作明確最終裁決？目前 **5/6**，Core6 尚未驗收。

## 基準與路徑

- Core5 `eca7a2b3a9c0fb7cd567b175d5c00ae12e7b5c95` 已推 `codex/edx-core-5-reset-recompose`，遠端 SHA 相同；Core6 分支直接由此 commit 開出。工作樹原有 `tasks/edx-core-six-card-closure-plan.md` 修改及四個 protected untracked 沿用，未納入產品範圍。
- 既有 migration 入口 `runtime/deck-spec.js` 的 `migrateLegacyFixture()`；recipient 只從 HTML 取資料的入口 `extractDeckSpec()`，原 `tests/p0-r1-deck-spec.test.mjs` 已覆蓋舊 fixture 遷移、sanitizer 私密資料過濾及單一 HTML reparse。原 P0-R11 recipient 腳本驗證 bounded field patch，但它是歷史交付，不可冒算為 Core6 fresh 驗收。
- Core5 最後一輪產品 runtime、fixture、ZIP SHA 分別為 `9f18d76476e5063fb42f4c5028d2ff7a95b828db5b870cb9546464d43adefac1`、`79848b7a033d269074821806e1669103c7e4799f8d181bcd8a4621fa6875f3a9`、`fd9bef51984504e46dedf30f1a2c3af5ca6dea6b9bf8f74ebc12d647ae4a4a3a`；Core6 開工未改產品。

## 既有 P2 重新裁決

- **Crop F2／P2：保留 OPEN residual。** 原 Reviewer 的修後 probes 9/11 PASS、2 項同類注入 FAIL：舊 observer disconnect／load listener remove 已完成副作用才 one-shot throw，rollback 可能因 stale ownership flag 跳過重建。主要 node、canonical、revision、CSS 有回退，observer/load 後續投影可能失效。沒有普通 browser 自然觸發證據；這不是本輪新 P0/P1，也不以正常 host PASS 宣稱關閉。依已接受的 P2 規則，作為明示殘留風險進入 Core6 closure，未獲 Repair2 成本授權前不修。
- **Core3 client receipt I/O／P2：保留 OPEN residual。** 已知產品 exit 7 後 receipt 單次 EIO 可使 client scalar 由 7 變 2；原 7 仍在原始紀錄、整輪 NOT_PASS、PGQ 不啟動。其風險是摘要退出碼精度，未見假 PASS。本卡不修改 AI Core controller／client；在最終收據標示原始退出碼優先於 scalar。

決策：兩項 P2 均不阻塞 Frontier B 的唯讀／測試驗收，但不能藉 Core6 正常路徑測試冒稱 CLOSED。若新 evidence 出現真實 P0/P1 或保護失效，立即停下重判最小修復範圍。下一步是 fresh migration／recipient contract、完整非瀏覽器與 ZIP 驗證；通過後才鎖正式 host candidate。
