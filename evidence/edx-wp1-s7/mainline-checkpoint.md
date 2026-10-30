# S7 主線驗收 checkpoint

狀態：BLOCKED；不是 production／Independent GO，也不是可交付 review candidate。Branch codex/edx-wp1-s7，HEAD4cd4540；本輪實作與證據仍在工作樹，未 commit／merge／push／deploy。既有 ZIP 未重建。

## Root question／blocker／fork

S7 snap 是否能在 normal/reduced/static 維持 canonical geometry 與可操作 control？目前 reduced-mode resize 連續兩次失敗（bounds-fixture-recheck、motion-resize-diagnostic），皆於1280×720、brand-device-accent reduced；1600×900與後續 treatment 尚未到達，不宣稱 PASS。沒有另開 scope／agent。

最後診斷前67 checks 通過。Normal mode SE中心約1162,618；reduced handle rect(-5.59375,-5.59375,11.1875,11.1875)，中心0,0。Resize gesture可開始，但負向 pointer 離開viewport，canonical維持637×477，非預期624×464。

Source原因：runtime/motion-primitives.js:54/55 的 reduced/static `.motion-root *` 強制 transform:none!important；S7 component-interaction.js:160/168 把editor overlay/vendor container置於slide，vendor inline translate3d因此遭覆蓋。原Worker唯讀核對此鏈路，未修production。Static具同樣source風險，但本輪未到達其fresh browser case。

## 已完成與測試校正

既有首SEhandle、cancel尾隨click、activegesture control routing修復維持。Fresh重驗已通過所有drag/resize cancel（含stale）、四組真Enter snap/text activation、bounds/minimum原子拒絕、keyboard guards、preview export/offline reopen、brand-device-accent normal motion。

Mainline本輪只改browser harness：stale edit每kind使用不同title確保revision改變；Enter keyDown補text/unmodifiedText CR並驗證焦點；bounds drag -850改-740，終點留viewport且canonical低於safeInset80；增加motion handle/state診斷。未削弱原geometry/cancel/trusted-click斷言。歷史失敗全部保留，後續成功不覆寫。

- 最新focused135/135：mainline-checkpoint-focused.log。
- Runtime同版本full non-browser333/333：mainline-nonbrowser-routing.log；此後只有harness校正，沒有runtime修改。
- 最新mounted perf on/off各1/6/12MiB、101updates，合計606；payloadReads/serializations/wholeSpecSerializations皆0。DOM/vendor double，非browser frame benchmark。
- git diff --check PASS。source與四untracked hashes：mainline-checkpoint-hashes.json；四原始hash全吻合。
- Browser console/page/network/HTTP/remote均0，失敗targets皆targetClosed=true；不等於驗收PASS。
- PGQ僅繼承既有28unique，沒有fresh PGQ。若修motion reset seam，須重新裁決受影響coverage，不可直接沿用免測理由。

## 生命周期與停止

routing與enter受管supervisor皆exit2：resource observation unknown (scan limit)。兩個owned root與isolation marker已確認不存在，見mainline-checkpoint-cleanup.json與兩份lifecycle/evidence/session.json。末輪Browser.close前port已消失，不能宣稱主線正常close成功。ENOENT與sandbox loopback fetch failed的啟動嘗試也保留；它們沒有完成產品測試，不算產品case結果。

Browser規則11：高互動UI同blocker兩次即停，沒有第三次motion retry。兩次scan-limit亦不再啟新profile。Worker Locke目前frozen，未新增agent或visible task。

## 待裁決的窄修復

建議只排除 reduced/static motion reset對editor chrome／Moveable control及其子孫、pseudo-element的影響；保留presentation內容motion reset，不以updateRect、重要度覆寫或改測試方向掩蓋。需source regression驗證selector邊界；再做一次明確授權的targeted reduced/static browser驗證。受管browser掃描停損不放寬，若重發停止。

待Owner明示覆核上述停止閘門後，才能重新執行同blocker browser驗收；卡片本身不構成重試授權。通過後再完成兩viewport／全部treatment、full／ZIP與manual Independent Review包。
