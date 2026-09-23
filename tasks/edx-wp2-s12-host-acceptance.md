# WP2-S12 Host acceptance

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Parent: tasks/edx-wp2-s12-image-paste.md
Product: 09c7d29253a5235b12ac58b5fef3f13cd5c70acb；source/protected/ZIP frozen，full nonbrowser及ZIP lifecycle PASS。

正式AI Core managed host；actual CODEX_SANDBOX空、原capacity/readiness/cleanup。唯一controller先 --image-paste-regression 雙viewport1280×720/1600×900，沿既有S10 chooser＋S11 trusted drop與明標synthetic gesture，再S12 synthetic ClipboardEvent→真File→真optimizer→S9/S8。S12只驗事件adapter，不碰系統clipboard、不使用navigator.clipboard或permission grant，不冒稱trusted paste或OS Cmd/Ctrl+V。所有source在正式執行前freeze。

重點：event origin/current identity、input/IME/default保留、singleFile/mixedtext不解析、asynccapture/otheredit、busy/drop/chooser互斥、gesture取消、reject零partial、oldroots/defaults/selection/revision、export/offline/remount。新圖UI screenshot；console/page/network/HTTP/remote0、targetClosed。事件isTrusted與optimizer count逐筆列；不以screen-only宣稱PASS。

四支affected PGQ只明列pgq-wp4-s3-content-integrity、pgq-wp4-s3-sample-approval、pgq-wp4-s4-full-deck-qa、pgq-wp4-s4-required-visibility，--test-concurrency=1。Browser.close/supervisor exit0、exactowned root/marker absent、source/protected4/ZIP前後MATCH。任一FAIL保留、停止後續，Mainline先收證據，不盲retry。S8歷史I/O未知，不修AI Core。

每輪traceback/error arrays、event routing/clipboard synthetic界線、rawlogs／hash、cleanup寫evidence/edx-wp2-s12/host-acceptance。全部完成才Independent Review candidate；不能拿S11GO取代S12驗收。

## Mainline acceptance

Candidate 09c7d29253a5235b12ac58b5fef3f13cd5c70acb；Worker66/scoped236、full712、ZIP lifecycle、1280×720：111 records、1600×900：111 records、PGQ單輪16、managed cleanup/source4/protected4/hash PASS。S12只驗synthetic ClipboardEvent File adapter，不冒稱OSclipboard；詳receipt與review handoff。未merge/push/deploy S12，未開S13。
