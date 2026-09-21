# S8 host acceptance：保留失敗與 bounded 修復

原 checkpoint：`a58cdfa5e963d7842aa7dfcf07dde181002c223d`。本輪使用獲准的 host execution，實測 `CODEX_SANDBOX=None`，仍經 AI Core `tmp_session.py browser` managed lifecycle；沒有清除 sandbox 旗標或修改 AI Core gate。

## 第一輪：實際 Selecto export 樣式殘留

`mainline-host-acceptance-20260921/selection/acceptance.json` 保留失敗。offline reopen 後仍有一個 `style[data-styled-id]`，原 cleanup 只從 control 的同名 attribute 取得對應 ID；但 pinned Selecto 1.26.3 把該 ID 放在 `.selecto-selection` 的 class，而非 attribute。

最小修復沿原 clone cleanup seam，兼容 Moveable attribute 與 Selecto class 精確對應，保留無關 style。mounted fixture 改成 vendor 真實 DOM 形狀，`export-style-red.log` 重現 1 fail，`export-style-green.log` 為 3/3 PASS。直接 cleanup test 同步修正 fixture，覆蓋保留無關 `rCS999` style。初次 broader log `export-style-nonbrowser.log` 因舊 mock selector 失敗；修正後 `export-style-nonbrowser-final.log` 377/377 PASS。

第一輪 Browser.close client exit 1，不宣稱該步 PASS；managed supervisor exit 0，owned root 與 isolation marker 均已移除，source/protected hashes 未變。PGQ 未啟動。

## 第二輪：canonical fixture 比較基準錯誤

`export-style-host-recheck/selection/acceptance.json` 保留失敗。原 export 問題已通過真 browser；S8 在任何 selection action 前，比較 renderer 輸出與未 sanitize 的輸入，因 renderer 正常補 `keyPointIds` 而失敗。

`buildSelectionFixture` 改回傳 `extractDeckSpec(rendered.html)`，比對實際產物的初始 canonical spec；沒有移除 before/after assertion，也沒有修改產品 sanitization。Browser.close、supervisor 與 cleanup 全 PASS，PGQ 未啟動。

## 第三輪：修復後驗證

以 `export-style-source-hashes.json` 鎖定 source；結果見 `canonical-fixture-host-recheck/` 及最新 `mainline-receipt.md`。三輪各自保留 evidence，不將歷史 FAIL 改寫為 PASS，也不把不同失敗歸因於未證實的 browser interference。

診斷 log 僅清除行尾空白以符合 `git diff --check`；assertion、錯誤內容與結果未變。
