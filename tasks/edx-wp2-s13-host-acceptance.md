# WP2-S13 Host acceptance

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Parent: tasks/edx-wp2-s13-insert-text.md
Product: 9b7767d88411e9e9a14e72d011726d67f74371a6（runtime d4d83ac，僅harness observer修正）；source/protected/ZIP frozen，full nonbrowser及ZIP lifecycle PASS。

正式 AI Core managed host，actual CODEX_SANDBOX 空、capacity sensor／12秒 logical-line readiness／cleanup 不變。controller 先 --insert-text-regression 雙 viewport 1280×720／1600×900：base＋既有 S8 image insertion＋S13 API text。產品程式不新增另一渲染／mutation authority；不宣稱 native OS input、clipboard、IMＥ 或文字 toolbar。

text 新增／escape／explicit 跨頁／非法 payload 原子拒絕／manual geometry／S1 direct-edit 排除邊界／layout geometry 操作／export offline reopen：依物件 assertion 驗收。API fixture 與真 pointer／keyboard 分別標明，新文字 screenshot 輔助；console/page/network/HTTP/remote 0、targetClosed。不能單看 screenshot 算 PASS。

隨後四支 affected PGQ：pgq-wp4-s3-content-integrity、pgq-wp4-s3-sample-approval、pgq-wp4-s4-full-deck-qa、pgq-wp4-s4-required-visibility；--test-concurrency=1 單輪16具名 cases。任一 FAIL 保留停止，先查 evidence；禁止盲 retry、改 AI Core、重開裸 Chrome 或 unset sandbox。沒有 host 就 checkpoint。

Browser.close／supervisor exit0、owned root／isolation marker absent、source／protected4／ZIP 前後 MATCH。controller／harness traceback、原始 log hashes、逐 case records、cleanup receipt 放 evidence/edx-wp2-s13/host-acceptance。全數完成才 Independent Review candidate，未完成不得以 S12 evidence 代替。

## Final acceptance

Candidate 9b7767d88411e9e9a14e72d011726d67f74371a6；scoped83/full734、雙viewport各63（10+40+13）、PGQ單輪16、ZIP/source6/protected4/cleanup PASS。歷史FAIL完整保留；詳receipt／review handoff。S13未merge/push/deploy，未開S14，Independent Review pending。
