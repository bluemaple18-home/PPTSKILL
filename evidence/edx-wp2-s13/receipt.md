# WP2-S13 Mainline receipt

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Candidate: `9b7767d88411e9e9a14e72d011726d67f74371a6`
Runtime product: `d4d83ac5daeba30a861404dff78d401ca618c700`
Base/main/origin-main: `18b1029c13444f6b40989f421098a9496ef7db0d`（S12 GO closure 已 push readback MATCH）
Branch: codex/edx-wp2-s13-insert-text

## 交付

共用 insert-element 增加精確 text variant `component:{id,type:'text',text}`＋explicit slideId／geometry；text 1–500 Unicode code points，不trim／轉型／truncate。沿現有 identity preflight、geometry、renderer與原子DOM append，無新mutation authority／schema字段／vendor／registry。image variant及S9 File options原契約保留；text payload拒絕hidden/getter/symbol/prototype/混搭。既有renderer escape文字，不產生script/img/a。成功一次revision、cancel gesture不commit preview、selection清空，cross-slide沿明確target，舊nodes保留。

**能力邊界：API-driven insertion，text component不可直接編輯。** 開發前Mainline曾誤認S1 direct-text seam包含component，Worker查出S1明確排除後，Mainline在runtime實作前裁決只做insert，不新增provenance或弱化S1測試。保留初始RED／contract finding。layout selection／move／resize和export/offline/reinsert成立；新文字UI／auto-ID／richtext／OSclipboard／nativeIME／history未做。

## Fresh驗證

- Mainline scoped：S13 22＋S8＋S9＋S1共 **83/83 PASS**。
- Full explicit 70 non-browser files：**734/734 named PASS**，零skip/cancel/filter空檔；nonbrowser-summary.json列具名cases。
- pnpm build:dist＋installed ZIP lifecycle PASS；archive兩個runtime檔 byte-match。
- ZIP **2,295,428 bytes**（S12 +325），SHA256 `d6ffe2e65d16280ef0eea8d62eee6f6519a9e8e2ef2d02dd1cdab5bbcd8ba3cd`。
- 最終candidate只比runtime product多S13 browser observer修正；runtime/tests/ZIP未改，不需重建ZIP。Node --check與diff --check PASS；full/scoped對同runtime/tests結果延用，不冒稱harness修正後重跑full。
- Fresh正式host兩viewport各 **63 records PASS**，精確base10＋S8 image40＋S13 text13。API/evaluate fixture與真CDP pointer/keyboard分標，invalid10全部reject/getter0／append-before-after rollback／Escape取消／geometry／offline reinsert通過；errors/HTTP/remote0、targetClosed。
- affected PGQ四支串行 **單輪16/16 unique named PASS**，無retry混算。
- managed readiness／Browser.close／supervisor0、owned root/marker absent；source6/protected4/ZIP前後MATCH。實際controller與raw logs保留；圖像檢視見visual-check.md。

## 歷史與限制

1. Worker初始3 RED及裁決後RED保留。Worker green attempt1 21/22的serializer `>` escaping assertion修正為接受DOM等價輸出，仍驗無script/img/a children及textContent；後續22/22。
2. Mainline scoped 82/83抓到S9 non-enumerable options regression；只限縮新text gate，不改S9 assertions，83/83。
3. host-acceptance：resource observation unknown I/O failure，首個產品check前停止，checks0、supervisor2；沒有Browser.close成功，owned cleanup完成。底層errno/path未知，不能宣稱根因修復。
4. host-retry1：1280通過60checks後Escape trusted記錄失敗；產品document capture stopImmediatePropagation讓harness bubble observer漏收。取消gesture／release不提交assertions先已通過，Browser.close/supervisor0。
5. host-harness-repair：只改observer到window capture，保留原assertions，兩viewport及PGQ完成；不把歷史FAIL覆写。

兩張圖顯示長fixture文字在固定框裁切並與原元件重疊，沒有自動適配／避障／完整可讀性宣稱；S13沿原字體與renderer，canonical全文以DOM/spec/export驗證。S8舊I/O根因亦未宣稱修復。

## 下一步

交 handoff_20260923_edx_wp2_s13_review.md 做 Independent Review。主線本輪完成驗收不自稱Independent GO；S13未merge/push/deploy，未開S14，四個protected原樣。
