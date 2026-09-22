# WP2-S8 Mainline acceptance receipt

Status: READY_FOR_INDEPENDENT_REVIEW
Product: `0b4c7bdf95211d0bb0587034cb899593e6b64d90`
Branch: codex/edx-wp2-s8-insert-image-operation
Base/main/origin-main: `74d63cc99e745b373adbcc3a56e9228576e74b22`（S7 Independent GO closure 已依Owner授權合併／推送，遠端readback確認）

## 交付／邊界

image-only insert-element，caller明示slideId、component ID、dataUri/alt/optional fit、完整bounded geometry；沿既有asset policy／geometry／identity resolver／renderer。Node與portable共用factory contract。新圖追加但不改slots/order/舊identity或其他canonical scope，portable先驗candidate與detached DOM、append failure rollback，成功才revision+1、cancel gesture／clear selection；不重建舊DOM、不切slide/mode。沒有新UI、File/picker/drop/clipboard/auto-ID、schema、vendor、crop或history。

## Non-browser／失敗紀錄

Worker Jason單一clean/shared writer，STOP WRITING後主線接手。Worker scoped **150/150** 是10個分別執行test commands的加總，不稱單輪；S8新檔 **20/20**，8次node --check。真RED初版18個cases為5PASS/13FAIL；一次接線script語法錯誤及後續GREEN均保留。FAIL-edit-script.log為Worker標示的重述診斷，非當時shell原始capture。

Mainline full初輪 **550/551**：既有motion測試把產出字串寫死spec.slides；S8 clean(source=spec)為candidate-before-commit做的重構必須驗source。只把assertion更新為完整clean預設參數及source validator呼叫，不改runtime／驗收條件；motion檔 **7/7**，full再跑 **551/551 PASS**（nonbrowser-files.txt明列65檔）。沒有filtered empty-file cases混算。source由Worker8檔＋主線motion assertion1檔，共9檔。

測試涵蓋Node/mounted valid/default/explicit fit、duplicate/replay、跨slide同ID、exact keys/accessor/symbol/prototype拒絕且getter calls0、identity collision不改舊ID、asset policy/geometry、missing/duplicate DOM、detached project及append前後throw rollback、revision/selection/gesture原子性、export/reparse/remount。成功insert取消gesture驗mounted snap on/off × drag/resize；真browser驗invalid insert不中斷gesture。全spec equality與舊node reference保留各自有證據。

## Formal host browser／PGQ

主線正式host runtime，CODEX_SANDBOX=None；AI Core `1d66afe3de4d5974e82ce8af82c0f9d7de5bfeb5`，原capacity／managed profile／12秒logical-line readiness／exact-owned cleanup不變，未修改AI Core或Rule24。

host-acceptance/insert-image/acceptance.json：1280×720、1600×900各 **50 checks PASS**。每viewport是base10＋S8 40紀錄：3次API insert、21筆重複decode/preservation檢查、7筆pointer-hit、5筆invalid-zero-side-effects、2筆真pointer geometry、1筆trusted events、1筆export/offline；不是50個獨立新功能。

3×2有效PNG實際decode；不同ID／跨頁同ID、DOM唯一root、alt/fit/geometry、舊nodes／first image／全spec保留、真pointer選取／fit／drag／resize、invalid gesture不中斷、export/offline reopen均PASS。console/page/network/HTTP/remote全0，兩owned targets closed。新image插入是API-driven；真pointer僅指後續既有controls／layout interactions。

其後首輪PGQ第一個具名case通過，managed supervisor因 `resource observation unknown (I/O failure)` fail-closed exit2，後續producer斷線／setup失敗，**不能算PGQ PASS**。首輪Node summary 1/4含2項setup檔案，非完整16具名cases。當時root實際移除、marker absent、source/protected/ZIP前後MATCH；無Browser.close成功紀錄，不能混稱首輪supervisor正常exit0。

沿既有授權做一次PGQ-only獨立managed session重驗，四支受影響檔案明列 --test-concurrency=1；host-pgq-retry/pgq.log **單輪16/16 unique named PASS**，不把首輪1個case加成17。Retry Browser.close／supervisor exit0、root與marker實際absent。兩輪cleanup均已核對。PGQ環境I/O底層errno不明，retry成功不能證明根因修復；詳pgq-environment-triage.md，首輪FAIL完整保留。

## Artifact integrity／視覺／限制

Source **9/9**、protected **4/4** MATCH。ZIP **2,293,334 bytes**，SHA-256 `82a16b7d962972df28d558dbfecc1d198858f686abe49e5acf4ce19d27795cf1`，較S7 +2,622 bytes。Fresh distribution lifecycle PASS；兩份變更runtime的ZIP entries與repo bytes相同。22個HTML artifacts與browser source SHA核對，兩PNG dimensions/hash記於host-final-verification.json。

主線實際看過兩張新圖截圖：藍黃圖、selection輪廓／resize handle、既有fit/replace toolbar可見，controls無viewport clipping。fixture明示位置有與原文字重疊，這是geometry/preservation evidence，不宣稱自動避障、整頁視覺品質或crop像素驗收。3×2驗decode與computed object-fit；20MiB仍沿export gate，無每次insert前aggregate admission。

全部命令logs以gzip保留原bytes/hash；可讀logs只正規化行尾空白。歷史Worker／Mainline／host FAIL均保留。主線acceptance不代替Independent GO。本S8未merge/push/deploy，未開下一Slice；候選→handoff僅control/evidence，原四個protected untracked未動。
