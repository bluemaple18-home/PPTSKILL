# EDX-WP2-S17 — 文字元件雙擊編輯入口

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Base/main/origin-main: df584eb920292be2a517ac72721c02455ddb0505
Branch: codex/edx-wp2-s17-text-double-click
traces_to: BACKLOG §10.1 decisions 2/7/8、§10.3 WP2、§10.4 edit-text。
Blocking edges: S14/S15/S16 已 GO 且整合；Owner 於 S16 停止後明示「繼續開發」。本卡是唯一承接 scope。

## 最小裁決

Measured gap：S16 已有文字元件編輯視窗，但 runtime 的 dblclick 只處理 title/subtitle；使用者無法雙擊 text component 進入既有安全編輯流程。
Prior Art：DIRECT_REUSE repo 自有 S16 openEditText、selectedTextTarget 與既有 dblclick listener；無新 vendor、license 或 dependency。CodeGraph 查詢未提供相關 editor symbols，已以限域 rg／source 核對。Why Custom 僅事件目標到既有入口的薄 mapping。
why_not_less：只有 toolbar 仍缺 Owner 指定的雙擊入口。why_not_more／do_not_absorb：不新增 inline contenteditable、文字 parser、schema、mutation writer、typography、history、crop 或通用 editor。此卡不得宣稱完成直接 inline editing。無取代。
Visual route：既有介面 addition，完整繼承 S16 toolbar/dialog tokens、版面與 focus 行為；不新增視覺元素。

## 契約與驗收

1. Layout 模式下，真實 pointer 雙擊目前 slide 的唯一 canonical text component，沿既有 selection 與 S16 openEditText 開啟同一 dialog，預填原文。單擊仍僅選取；開啟不改 canonical、component DOM 或 geometry。
2. 必須驗證事件 target 確實屬於 selectedTextTarget 的 node；不得雙擊另一物件卻編輯舊 selection。role、image、quote、空白、editor chrome、detached／duplicate／偽造節點、多選、play/edit mode、修飾鍵事件均不得誤開 component dialog。role 原 S1 雙擊 direct editing 保持。
3. 事件只接一次，不另建 writer／draft。沿同一 pending/busy/IME/image-picker 互斥、gesture cancel、showModal failure 回收及 S16 stale/no-op/invalid/save/cancel/Escape 契約。snap on/off 均可儲存；開 dialog 不提交未完成 preview。
4. Save 僅呼叫既有 edit-text；cancel/Escape/export draft 不 commit。HTML-like text 使用既有純文字政策。export→offline reopen 後雙擊再編輯仍可用；bootstrap/remount 不重複 listener。
5. Fresh unit：先 RED 再 GREEN，涵單擊、雙擊、選錯物件、修飾鍵、多選、模式、非 text／role 相容、busy/IME、snap、cancel/save、remount。Scoped S17/S16/S15/S14/S13/S10/S6/S1/WP1S7，檔名先核對。
6. Browser：新增 --text-double-click-regression；base10＋bounded S17 cases，1280×720 及 1600×900。使用 CDP 真 pointer 雙擊、Input.insertText、Escape／儲存；分清 trusted input 與 synthetic fault。涵 snap on/off、取消不變、純文字儲存、非目標拒絕、role 相容、offline reopen 雙擊。截圖實檢同一 dialog；console/pageerror/network/http 0，targetClosed。

## Worker 與 Mainline

standard UI glue；一名 clean native Worker（fork_context=false，繼承模型與推理等級），shared workspace sequential single product writer；Mainline 同時僅讀既有 evidence／準備驗收，Worker 完成前不寫 product。Runtime 已拒絕 medium override：繼承的 chatgpt-web/pro 僅支援 ultra，該次未建立 Worker；依 native schema 改為省略 override，不自行更換 Owner 模型。
Worker write scope：runtime/deck-editor.js、tests/edx-wp2-s17-text-double-click.test.mjs、tools/edx-wp2-s17-browser-cases.mjs、tools/edx-wp1-s4-browser-acceptance.mjs。必要 mounted test double 薄調整須附原因，禁止弱化既有 assertions。不要改 control/evidence/BACKLOG/ZIP/protected4/AI Core，不 commit、build、full、browser 或啟 Chrome。
Mainline：驗 diff、fresh explicit nonbrowser、build/probe ZIP、正式 managed host 雙 viewport 與四支 affected PGQ 單輪串行16、source/protected4/ZIP/cleanup。現場 CODEX_SANDBOX=seatbelt，禁止直接 spawn／unset；無合法 host 標 HOST_BROWSER_PENDING，不偽報 fresh。
停止點：可重現 candidate＋驗收／限制＋Independent Review handoff；不 merge/push/deploy，不開 S18。舊 FAIL 保留，同類兩次無進展停重判。

## Mainline acceptance

Product candidate 8c0781083ea21cdd365e5f9e1f91f4b7057cdc70；runtime/ZIP ca4f4d70d5e466adc8e7588c637d83ee34aac9e4。Fresh scoped313/full874、雙viewport26+26、affected PGQ單輪16、ZIP lifecycle/source4/protected4/cleanup PASS。首輪空白點命中失敗已限域修正harness並保留原FAIL；runtime/ZIP未因修復改動。詳細 evidence/edx-wp2-s17/receipt.md、host-final-verification.json 與 handoff_20260923_edx_wp2_s17_review.md。停 Independent Review pending，未 merge/push/deploy，未開S18。
