# S8 focusin P1 — Targeted Re-review Handoff

你是獨立 Reviewer，請只重審上一輪 S8 的 focusin wrong-slide mutation P1，回覆 GO／NO-GO。不得修改 candidate／ZIP／四個 protected untracked，不 merge／push／deploy，不開 S9。

- Repo：`<repo-root>` = `PPTSKILL-canonical`；branch `codex/edx-wp1-s8`。
- **Repair candidate：`3065bcb8745e3109531eb6f155e930a0b3c24c15`**。
- 上輪 NO-GO：`fd7fc9ae2c94d393d570550bf4292972910d3160`；其後 `f541281` 只有 handoff docs。
- Task：`tasks/edx-wp1-s8-selecto-multiselect-input.md`。
- Receipt：`evidence/edx-wp1-s8/focusin-repair/receipt.md`。

## 唯一修復

`runtime/deck-editor.js` 的共用 `select(id)` 在 `currentId !== id` 時，於切換 currentId 前呼叫 `layout?.clearSelection()`。同頁 focus 不清 selection；跨頁 focusin 清 editor-local selection、interaction target、Moveable。没有新增 keyboard 特例或 canonical authority。

請核對 `tests/edx-wp1-s8-mounted-selection.test.mjs` 新增兩個 regression：

1. 選 portable component → opening 的 citation anchor focusin → ArrowRight，spec 不變、selection empty、target null、Moveable destroyed、事件不攔截。
2. 同頁 focusin 保留 single selection／Moveable；跨頁 focusin 清多選且 canonical 不變。

`red.log` 是修復前同一 mounted public runtime 路徑的 1 FAIL，失敗原因為舊頁 canonical 被修改。這是 synthetic mounted DOM event，不宣稱真 browser keyboard navigation。

## 驗證

```sh
node --test tests/edx-wp1-s8-*.test.mjs
node --test tests/edx-wp1-s3-*.test.mjs tests/edx-wp1-s4-*.test.mjs tests/edx-wp1-s5-*.test.mjs tests/edx-wp1-s7-*.test.mjs tests/edx-wp1-s8-*.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs
git diff --check fd7fc9ae2c94d393d570550bf4292972910d3160 3065bcb8745e3109531eb6f155e930a0b3c24c15
```

Fresh Mainline：S8 **10/10**、focused **174/174**、full non-browser **379/379**、ZIP lifecycle PASS。`evidence/edx-wp1-s8/focusin-repair/source-hashes.json` 記錄 20 source 與 protected 4 hashes。最終 ZIP **2,280,195 bytes**；SHA-256 **`ab59115c7f5c52d258af22021c8b57e8334fba0f5ac7ecee93622fbeb158061f`**。

本輪未啟 browser／PGQ：原雙 viewport 各 15 checks、affected PGQ 16/16 是前候選繼承 evidence，不冒稱新 candidate fresh PASS。不必重做整套 S8；針對 P1 做獨立復現與修復核對。回覆 reviewed SHA、P0–P3、fresh 與 evidence-only 分列、GO／NO-GO；Mainline 等 verdict 才能 closure。
