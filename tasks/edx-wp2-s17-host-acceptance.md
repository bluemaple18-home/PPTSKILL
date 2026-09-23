# EDX-WP2-S17 Host acceptance

Status: PASS / INDEPENDENT_REVIEW_PENDING
Parent: tasks/edx-wp2-s17-text-double-click.md
範圍：雙擊 text component 進入既有 S16 dialog；不宣稱 inline contenteditable 或 native OS IME。

產品 source hash／protected4／ZIP 凍結後執行 evidence/edx-wp2-s17/host-controller.py。需原生 require_escalated 核准的主機 runtime，actual CODEX_SANDBOX 空；禁止 unset、修改 capacity/Rule24/readiness 或碰外部 profile。
沿 AI Core tmp_session.py 受管入口、12 秒 logical-line readiness、容量 admission/monitor、Browser.close、supervisor exit 及 exact-owned root/marker cleanup。只建立本輪 browser profile，既有瀏覽器不碰。所有 FAIL 保留。

--text-double-click-regression 依序 1280×720／1600×900：base10＋S17 bounded cases。Listener 先於 navigate，收 console/pageerror/request/network/http；真 pointer 雙擊、Input.insertText、keyboard Escape；synthetic 故障清楚分開。確認單擊只選取、預填不改 draft、snap on/off 可儲存、cancel 不變、純文字政策、非目標拒絕、role 相容、export/offline reopen 再雙擊。截圖輔助實檢，不取代 runtime evidence。
成功後單輪串行執行 PGQ content-integrity/sample-approval/full-deck-qa/required-visibility 四檔，預期16個 unique named tests；targeted 失敗即停，不混算重跑。

通過條件：兩 viewport 所有 cases PASS、errors0、targetClosed；PGQ16；readiness/Browser.close/supervisor exit0、ownedroot/marker absent、source/protected4/ZIP before/after MATCH。無合法 host 標 HOST_BROWSER_PENDING；不得引用 S16 browser 當本輪 fresh。
交付停止於 Independent Review candidate，不 merge/push/deploy、不開 S18。

本輪結果：Product 8c0781083ea21cdd365e5f9e1f91f4b7057cdc70；host-pointer-repair 雙viewport各26 records，errors0／targetClosed，PGQ單輪16 unique named、readiness/Browser.close/supervisor exit0、ownedroot/marker不存在、source4/protected4/ZIP MATCH。Mainline已實看四張dialog PNG。首輪host-acceptance的固定空白點命中失敗為NOT_PASS並完整保留；修復只改harness定位，不放寬assertions。正式總核對 evidence/edx-wp2-s17/host-final-verification.json。
