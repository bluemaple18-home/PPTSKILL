# EDX-WP1-S8 focusin P1 targeted independent re-review

Verdict：**GO**

- Reviewed product SHA：`3065bcb8745e3109531eb6f155e930a0b3c24c15`
- Previous NO-GO candidate：`fd7fc9ae2c94d393d570550bf4292972910d3160`
- Severity：P0=0／P1=0／P2=0／P3=0
- Scope：只重審 focusin wrong-slide canonical mutation P1；reviewed code 與 ZIP 未修改。

## Fresh reviewer verification

- `node --test tests/edx-wp1-s8-*.test.mjs`：**10/10 PASS**。
- S3/S4/S5/S7/S8 + S1 export cleanup focused：**174/174 PASS**。
- Full non-browser（排除四支 browser-backed affected PGQ）：**379/379 PASS**。
- `source-hashes.json`：source **20/20 MATCH**；protected untracked **4/4 MATCH**。
- ZIP：**2,280,195 bytes**；SHA-256 `ab59115c7f5c52d258af22021c8b57e8334fba0f5ac7ecee93622fbeb158061f`。
- `git diff --check fd7fc9a..3065bcb`：PASS。

Source review確認共用 `select(id)` 只在 `currentId !== id` 時先 `layout?.clearSelection()`；同頁 focus 保留 selection／Moveable。跨頁 focusin regression 直接驗證 ArrowRight 不再修改舊頁 canonical，selection/interaction target 清空且舊 Moveable 銷毀。`duplicate()`／`remove()` 已先 cleanup；初始化 `layout` 尚未建立時由 optional chaining 保持安全。

## Evidence-only

本輪沒有 fresh 重跑 browser／PGQ。沿用前候選 evidence：1280×720、1600×900 各 15 checks PASS，affected PGQ 16/16 PASS；僅作 evidence review，不宣稱為 `3065bcb` 的 fresh browser execution。

原 focusin wrong-slide mutation P1 關閉。S8 可由 Mainline closure；不 merge／push／deploy。
