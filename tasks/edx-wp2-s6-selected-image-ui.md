# WP2-S6 — selected image replacement UI

Status: IN_PROGRESS
Base: b704a1f50a9022b04a5f2b9f8f3fe67ea3d2a4c0（S5已merge/push）
Branch: codex/edx-wp2-s6-selected-image-ui
traces_to: BACKLOG §10.1 decisions3/4/8、§10.3 WP2、§10.4 replace-asset。

## Objective / minimum

S5允許明確image File target，但現有圖片UI只替換第一image。接既有layout single-image selection到contextual「替換所選圖片」button，再用既有File optimizer/S5 adapter/S4operation。無新selection authority/geometry/schema/dependency/crop/insert/drop/clipboard/history。
PriorArt DIRECT_REUSE既有Selecto/Moveable selection、native button/input及S5；CUSTOM_DELTA僅capture target與UI glue。License/pin沿b704a1f既有vendor；新增dependency0，ZIP量差。Why not less：API存在但user不能明確替換第二圖。Why not more：選圖替換可獨立驗收，不吸收其他asset功能。Frontend沿原toolbar tokens/native button，不重新設計。

## Contract

1. layout模式只選一個existing image時顯示/enable「替換所選圖片」。nonimage/empty/multi/play/edit不提供此action。以既有selection.getState/currentSlide/stableID判定，允許薄optional onSelectionChange callback，不新增event bus/registry/另一個selection state。所有selection清除/切頁/模式/刪除/teardown路徑同步UI，不只click path。
2. click時先capture當下{slideId,elementId}並開專用native file input（可新增一個input，以免干擾舊first-image input）。原edit模式file-input與public replaceImageFile(file)不變。專用input change必須走replaceImageFile(file,capturedTarget)，不得fallback第一圖。只存短命pending target，不存DOM/DeckSpec/asset副本。
3. 開picker造成window.blur會清selection，但pending target仍有效，input change仍投遞原captured image；不能因selection cleared丟失目標或跳到first image。顯式slide/mode change或新selection intent要取消舊pending target；pending結果不得被後一次picker覆蓋到另一image。每個change先消耗自己的snapshot再await。input cancel/空檔清pending/value；成功/失敗重設value，允許同檔再次選。invalid無pending change不得呼叫optimizer，顯示bounded訊息即可。
4. native chooser開啟前禁止pointer gesture commit副作用；UI本身不得改canonical/revision。S5 async既有policy沿用：optimizer開始後stable target鎖定、readonly export/切頁不改目的地，target消失拒絕。不得因UI引入另一種mutation。
5. export移除新chrome/pending UI state；offline reopen可重新選圖使用，geometry/alt/fit/motion/typography保留；focus/toolbar尺寸在mousedown→click不中途移位。選取/取消、Escape/pointercancel/blur原contract不退步。

## Acceptance

true RED→最小GREEN；mounted單選image/nonimage/multi/clear/slide/mode、capture→blur→change、cancel/reset/reselect同檔、無pending/target刪除、stale intent、async、export cleanup；相鄰S5/S4/selection/keyboard/perf tests明列檔。
新增--selected-image-regression；沿現有runner base10真pointer及S4兩張可render image fixture。正式host真pointer選第二image/visible hit button；CDP Page.setInterceptFileChooserDialog + fileChooserOpened / DOM.setFileInputFiles注入本地小PNG到原input觸發真change，注明browser automation非手點OS dialog。量測button rect/hit，blur lifecycle、cancel可synthetic並標註，canonical/DOM第二image變first保留；nonimage/multi不提供、切頁/mode清、同檔重選、export/offline。若CDP seam不可用先回Mainline，不默默改成直接API替換冒稱UI。
1280→1600、errors0/targetClosed；四支PGQ串行、full nonbrowser、ZIP lifecycle/hash/protected4。主線執行所有browser/full/ZIP。

## Worker與邊界

standard單一clean Worker/medium/shared sequential product writer；只改runtime/tests/tools，主線只control，停寫後整合。禁止tests/*.test.mjs、browser/fixture runner/ZIP、commit/branch/control/evidence/protected。最多1bounded implementation loop，遇同blocker兩次無進展停triage。先CodeGraph無關fallback rg；讀Ownerbootstrap與rules05/11/24按需。所有log/private/tmp/pptskill-wp2-s6-*，report列來源SHA/改檔/測試/失敗/限制。不要聲稱Review candidate直到Mainline全部驗收通過。不merge/push/deploy/下一Slice。
