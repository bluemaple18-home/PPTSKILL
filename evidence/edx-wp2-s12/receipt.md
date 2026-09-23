# WP2-S12 Mainline receipt

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Candidate：`09c7d29253a5235b12ac58b5fef3f13cd5c70acb`
Base/opening：`8b9ee5bceb1ab6d762f3f370f95f9f248943e446` / `bd4126a9b92b55178af3d716a512c93b984a9d41`
Branch：codex/edx-wp2-s12-image-paste
Main/origin-main：8b9ee5b（S10/S11已GO整合push，readback MATCH）；S12未merge/push/deploy。

## 已交付與裁決

layout內paste事件單張File插入，沿S10/S11 insertionTarget/defaults/busy → S9 insertImageFile → S8 canonical insertion。輸入ownership與IME/defaultPrevented先判斷；合法connected slide用事件target，body/document/deck/toolbar用currentId。無file的text/HTML/URI不攔截、不getData／解析／fetch。FileList是唯一File來源；busy/chooser互斥、不清pending；multi/empty拒絕，unsupported沿既有optimizer，不新增MIME或asset policy。

成功之前cancel gesture不commit；async接受target固定，mode/slide/其他文字edit/export不重定向，removed/collision/reject/invalid原子拒絕；成功清selection、保留oldroots。沒有新增mutation authority／counter／schema／vendor／history／rich-text。

本卡開卡即鎖定 **ClipboardEvent File adapter** 驗收：synthetic事件＋真DataTransfer/File/optimizer，不讀寫Owner系統clipboard。原生OS clipboard、真Cmd/Ctrl+V、多平台clipboard formats仍未測；不能宣稱這些能力已驗收。這不是失敗後替換positive路徑。

## Fresh驗證

- Worker S12 **66個具名cases**；scoped九支明列 **236/236 PASS**。Mainline讀diff＋逐名count/hash核對；Worker完成後STOP，無平行product writer。
- Mainline full non-browser **712/712 PASS**，69檔明列nonbrowser-files.txt，不含正式browser/ZIP/PGQ；零skip/cancel。附nonbrowser-summary.json具名列表。
- build:dist與installed ZIP lifecycle PASS，runtime byte-match。ZIP **2,295,103 bytes**（比S11 +449），SHA256 `96daa683bb24ffe300a14c7a2cc63ec99dc27ec9d80ad0c4e26b050eff534eb7`。
- Fresh正式managed browser：1280×720：111 records、1600×900：111 records，各errors/HTTP/remote0、targetClosed。精確路徑分類及每筆S12事件在host-final-verification.json；S10 chooser與S11 drop完整既有regression先跑，未拿繼承GO替代fresh。
- S12所有paste事件isTrusted=false；正向含nested/current/cross/無圖頁/同檔/混合file＋text/offline/capturedtarget，optimizer恰1；snapfalse/true真CDP pointer後synthetic paste在release前取消，release後舊geometry未提交。input/active/contenteditable/IME/defaultPrevented、busy/chooser、multi/empty、unsupported原子拒絕有實測。
- Fresh affected PGQ四支串行 **單輪16/16 unique PASS**；rawlogs與namedcases列表保存。Browser.close/readiness/supervisor exit0，ownedroot及isolation marker實測absent，controller before/after source4/protected4/ZIP MATCH。Host實際CODEX_SANDBOX=null，AI Core `1d66afe3de4d5974e82ce8af82c0f9d7de5bfeb5`；未改capacity或readiness。
- `git diff --check` PASS。Candidate後只control/evidence，runtime/tests/tools/ZIP不改。

## 歷史與限制

Worker真RED59為34PASS/25FAIL；GREEN首輪57/59：新mounted fixture缺nav父容器與IME情境先切layout清掉composingText。只修新fixture/測試前置，不改舊mode或舊assertions；第二輪59/59後加7個必要邊界到66。原始logs與gzip/hash完整保留，不混算59+66，也不把236當本輪新增case數。

S11前三輪FAIL仍在原evidence，split gesture/native drop邊界沿用；S10 chooser為CDP、naturalBlurCount=0、部分lifecycle synthetic，非人工OSdialog。S8歷史I/O根因未知。本卡不修AI Core。

圖像固定560/288/480/320與既有內容重疊不是auto-layout驗收；3×2 fixture只驗decode/geometry/fit，不宣稱crop pixels或alt語意。畫面人工檢視另見visual-check.md。

## 下一步

交handoff_20260923_edx_wp2_s12_review.md做獨立Review；Mainline不自稱Independent GO。S12未push/merge/deploy，未開S13。Protected4仍原hash，工作樹僅原四個untracked。
