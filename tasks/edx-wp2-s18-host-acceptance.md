# EDX-WP2-S18 主機驗收

Status: CLOSED / MAINLINE_CODE_REVIEW_GO / HOST_ACCEPTANCE_PASS
Parent: tasks/edx-wp2-s18-delete-element.md
範圍：既有 executeOperation 的獨立 text/image 刪除 API；不涵 UI/keyboard deletion、Undo、OS IME 或自動重排。

先凍結 candidate、source hashes、原 protected4 與 fresh ZIP；用 evidence/edx-wp2-s18/host-controller.py 接既有 AI Core tmp_session.py。actual CODEX_SANDBOX 必須為空，主機執行走原生權限流程；禁止 unset、放寬容量/readiness、修改 AI Core 或碰其他 profile。
保留原 Rule24 admission、host tmp admission、runtime monitor、12秒 readiness 及 exact-owned teardown。主機容量／root admission 拒絕應記 HOST_BROWSER_PENDING/NO_GO；不刪歷史 root 或猜測修復其他專案。

--delete-element-regression 依序1280×720及1600×900，只 base10+S18。Listener先於navigate，收console/pageErrors/networkFailures/httpErrors/remoteRequests。以真主機 API 執行 delete-element，真 pointer 選物件及開啟既有 S16 dialog；故障注入明示synthetic。驗confirm/type/reference/identity拒絕、DOM/canonical原子性、throw前後rollback、selection/gesture/dialog互動、export及offline reopen再編輯/插入/刪除。before/after截圖直接檢視，不以截圖代替runtime結果。

Targeted成功後，四支affected PGQ content-integrity/sample-approval/full-deck-qa/required-visibility用--test-concurrency=1單輪串行，預期16個unique named tests。Targeted失敗即停，不混算前輪或重跑。

通過需：兩viewport完整PASS、errors0、targetClosed；PGQ16/16；readiness/Browser.close/supervisor exit0；exact-owned root與isolation marker實際不存在；source/protected4/ZIP前後MATCH；ZIP內runtime與source byte-match。FAIL/中止證據保留，不覆寫。
交付停 MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING，不merge/push/deploy，不開S19。

## 第一輪失敗與第二輪觀測裁決

第一輪 host-acceptance/controller-receipt.json 已 settle 為 NOT_PASS：targeted 雙 viewport 各21 PASS；PGQ 7/10、supervisor exit2，launcher.stderr 為 resource observation unknown (I/O failure)。root／marker 已不存在，但未取得 Browser.close 成功，不能視為完整 cleanup PASS。原目錄與 controller 保留。

唯讀查明 AI Core tmp_artifact_lifecycle.py:1097 的 entry.stat、1099 的 os.open 及掃描相關系統呼叫都可能拋 OSError；1133 統一訊息、1145 僅回傳字串，既有測試也固定檢查此字串。原紀錄無 errno/path，因此不能斷言磁碟滿或暫態消失。第二輪只增加 repo evidence/resource-observer.py 的 Python exception trace，於結束時記錄原始錯誤／來源行；不 monkeypatch、改寫 helper、放寬任何容量／timeout／readiness 或吞掉例外。關閉 line/opcode trace；原 scanner 的時間限制照常計入觀測開銷。

先用隔離 synthetic fixture 驗證 OSError 仍回傳同一 NO_GO、正常掃描無誤報；再以新 host-acceptance-02 目錄完整執行同一 targeted＋PGQ 單輪。此輪是為取得缺失的錯誤證據，不能用重跑通過抹除第一輪失敗；若同 blocker 再現，保留精確診斷並停 HOST_BROWSER_PENDING，不在本專案修 AI Core。交付程式與 ZIP 保持84ea938。

目前停止於review卡交付：synthetic selftest已PASS，host-acceptance-02尚未執行；上一段是後續方案，不是已執行紀錄。本次不啟動controller，先交handoff_20260924_edx_wp2_s18_review.md供獨立審查；原契約、第一輪FAIL與底層原因未明的限制均保留。

## 2026-09-24 主線收尾

本次review／Repair1與第二輪host均完成；以evidence/edx-wp2-s18/mainline-closure.md為最新裁決。上文首輪失敗及「尚未執行」敘述保留作當時紀錄，不代表當前仍pending。產品84ea938／ZIP未改；native Reviewer的產品範圍為PARTIAL抽查，診斷targeted GO，不冒稱全產品Independent GO。
