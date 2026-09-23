# EDX-WP2-S17 Mainline receipt

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Product candidate: 8c0781083ea21cdd365e5f9e1f91f4b7057cdc70
Runtime／ZIP commit: ca4f4d70d5e466adc8e7588c637d83ee34aac9e4
Branch: codex/edx-wp2-s17-text-double-click
Base/main/origin-main: df584eb920292be2a517ac72721c02455ddb0505

## 交付

Layout 單選目前頁面的 canonical text component 時，雙擊同一實際 node 即開啟 S16 編輯視窗；預填不改 canonical／DOM／geometry，儲存仍走原 edit-text。事件目標不符、修飾鍵、非文字、模式、多選、pending/busy/IME 等沿既有契約拒絕。S1 role 雙擊編輯維持；同一 document 重複 bootstrap 保留單一 editor/listener。

未新增 component contenteditable、schema、writer、vendor、history 或 auto-fit。S17 只交付雙擊進入既有 dialog，不能宣稱完成直接 inline editing。

## Fresh evidence

Worker RED53：32 PASS／21 FAIL；GREEN53／scoped317 PASS。Mainline 另跑 scoped10檔313／explicit nonbrowser74檔874，均 PASS、fail/cancelled/skipped/todo0。Harness 修復後再跑同一組313／874，紀錄 scoped-pointer-repair.tap、nonbrowser-pointer-repair.tap 及各 summary；未混算兩輪。

Build／install→smoke→profile→uninstall ZIP lifecycle PASS，shared core ready/single。ZIP 2298730 bytes，比 S16 增219 bytes；SHA-256 bb8ce285d7cbdf4575a8fc3828d1ec9bd8d3c2e2f2dc9c2bfab4785ce5c0bcf7。Archive 的 PPTSKILL/core/runtime/deck-editor.js 與 workspace byte-match；harness-only repair 不改 runtime／ZIP。

Formal managed host 的 host-pointer-repair/text-double-click/acceptance.json：1280×720、1600×900各26 records（base10＋S17 16）PASS。真 pointer／Input.insertText／Escape 驗證預填、snap on/off、save/cancel、非目標、role 相容、export draft、offline reopen 再編輯。Synthetic fault／CompositionEvent 已在各 record 明示；不是 OS IME 實測。四張 dialog PNG 已由 Mainline 直接檢視，詳 visual-check.md。

Affected PGQ 四檔單輪串行16/16 unique named PASS，沒有混算先前或重跑的結果。正式 host readiness／Browser.close／supervisor exit 均0，exact-owned root及isolation marker實際不存在；source4/protected4/ZIP before/after MATCH，artifact bytes／hash均核對。詳 pgq-summary.json、host-pointer-repair/controller-receipt.json 與 host-final-verification.json。

## 歷史 FAIL 與修復

首輪 host-acceptance 在1280完成17 records後，固定右下空白點 hit-test 失敗；PGQ未啟動。該輪 targetClosed／Browser.close／supervisor exit／ownedroot／marker 清理均通過，整輪仍是 NOT_PASS。原 receipt、source-hashes-initial.json 及 raw logs 保留。

只修 harness 的空白點定位：最多六個有界 DOM probe 選出實際可見空白，再送一次真 pointer 雙擊；保留原 hit-test、trusted、單一 dblclick 與空白 elementId 斷言。新證據顯示原點在1280命中 NAV、1600命中 SPAN；替代點在兩尺寸都命中 SECTION。修復未改產品 runtime 或放寬驗收。

工具與派工限制、初次 ZIP 路徑核對失敗另見 execution-notes.md；未修改 AI Core 或清除 sandbox 旗標。

## 邊界與停止點

Independent Review 尚未執行，未有獨立 GO。未 merge／push／deploy，未開 S18；四個既有 protected 檔案只核對 hash。固定 geometry 不提供 auto-fit／避障；不宣稱原生 OS IME。Host adapter 的 CLI capability 以 distribution-lifecycle.json 當機實測為準，與 ZIP lifecycle 分開。
