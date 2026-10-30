# EDX-WP2-S18 Mainline receipt

Status: CLOSED / MAINLINE_CODE_REVIEW_GO / HOST_ACCEPTANCE_PASS
Product candidate: 84ea9381cb438491449b6d871fbaeedea5e55b98
Branch: codex/edx-wp2-s18-delete-element
Base/main/origin-main: e3b90a8969f6d25416e746feefecba718d8d8931

## 交付與契約

既有 executeOperation 新增 delete-element，value 必須明示 confirm=true。僅接受無 composition 引用的獨立 text/image component，拒絕 role/keyPoint、不支援的元件類型、缺失／錯頁目標，以及會改變 surviving stable identity 的刪除。

Node 與 portable 共用 component-deletion pure contract；只移除目標 membership 及 geometry entry。Portable 先驗唯一 canonical／DOM target及其內容，removal before/after throw 還原原位置。成功只提交一次 revision，清除失效 selection、gesture 與被刪目標的 S16 draft，不讓 late submit 復活內容。沿既有 optimizer/picker/text-submit ownership 拒絕競態；patch/export 在刪除中的同步重入於讀取或修改前拒絕。

沒有新增 schema、vendor、registry 或 writer；UI/keyboard deletion、Undo/Redo、auto-layout 不在本卡。已空缺 ID 可由新 insert-element 再次使用，不能稱為 Undo。API-only VM 缺完整 DOM 時 fail closed，不宣稱具有完整 browser 刪除能力。

## Fresh Mainline 驗證

Scoped14個實體檔案449/449、explicit nonbrowser75檔945/945 PASS；fail/cancelled/skipped/todo均0。最終原始紀錄為 scoped-mainline-02.tap、nonbrowser-mainline-02.tap，各 summary 綁定 source8 的驗證前後 hash。未把 Worker 或前輪結果混算。

Fresh build／install→smoke→profile→uninstall ZIP lifecycle PASS，shared core ready/single。ZIP 2301572 bytes，比 S17 增2842 bytes；SHA-256 5ccedbc43af3f23f9582ed989c635479be10065752d231fefa4bf2104ff3ec74。Archive內 deck-editor.js 與 component-deletion.js 均與 source byte-match，見 zip-verification.json。CLI可用性與套件lifecycle分開報告，見 distribution-lifecycle.json。

Formal managed browser：1280×720、1600×900各21 records（base10＋S18 11）PASS；console/pageErrors/networkFailures/httpErrors/remoteRequests均0，targetClosed=true。主機 API 驗證刪除、拒絕、identity collision、DOM rollback、patch/export重入、S16 draft、snap on/off drag、optimizer resolve/reject及offline reopen再插入/編輯/刪除。DOM hook及Promise gate均明示synthetic，pointer/Input.insertText在真browser執行；不宣稱OS IME。

Mainline先前已直接檢視兩尺寸before/after共4PNG，詳visual-check.md。第一輪controller已結束為NOT_PASS：PGQ僅7/10，未完成預期單輪16；supervisor exit2，launcher.stderr為resource observation unknown (I/O failure)。source8/protected4/ZIP前後MATCH，owned root／isolation marker已不存在，但缺Browser.close成功紀錄，不能宣稱完整cleanup或整體驗收PASS。

原始errno與出錯檔名尚未定位，不能將磁碟滿、暫態檔案消失或產品回歸寫成定論。第二輪僅準備resource-observer.py與host-controller-diagnostic.py，synthetic selftest PASS；host-acceptance-02尚未執行。Worker stream disconnected與本輪browser resource-stop分開記錄，沒有同源證據。

## 原始 FAIL 與修復

原 Worker 因 stream disconnected 未完成交回，已close；Mainline沿同一卡接續，無第二 Worker。原RED、extended GREEN、VM fixture失敗、reentry RED與scoped FAIL均無損gzip保留，worker-log-archives.json逐檔列原始hash與round-trip驗證。

Mainline開發中探針發現 node.remove 內 applyLocalPatch 可繞過原executeOperation guard，造成revisionDelta=2及另一圖片DOM/canonical alt不一致。已在既有applyPatch/serializeHtml入口補同一deletion guard，Worker新增10個before/after重入regressions；Mainline獨立重現修正後兩probe通過。原始FAIL、修正probe及最終71項S18測試均保留，不把中間局部GREEN當成完整驗收。

既有S2/S3 exact operations清單漏列新增delete-element：僅各加入一個literal，保留exact deepEqual、immutable、allowlist與所有拒絕assertions。Worker scoped447/449、Mainline初輪full943/945仍保留為FAIL；後者壓縮為nonbrowser-mainline.tap.gz，raw hash/round-trip見nonbrowser-initial-archive.json。既有executeOperation前綴保留，reentry guard位於validator首行。

## 停止點

本次交付可用審查卡handoff_20260924_edx_wp2_s18_review.md，狀態READY_FOR_REVIEW；獨立審查未執行，沒有Independent GO。開卡只核對既有證據、source/protected4/ZIP，不重跑browser或產品測試。Mainline維持PARTIAL / HOST_BROWSER_PENDING。未merge/push/deploy，未開S19；main/origin-main保持base。

## 2026-09-24 主線收尾

本次review／Repair1與第二輪host均完成；以evidence/edx-wp2-s18/mainline-closure.md為最新裁決。上文首輪失敗及「尚未執行」敘述保留作當時紀錄，不代表當前仍pending。產品84ea938／ZIP未改；native Reviewer的產品範圍為PARTIAL抽查，診斷targeted GO，不冒稱全產品Independent GO。
