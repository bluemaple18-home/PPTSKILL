# WP2-S11 Mainline checkpoint

Status: BROWSER_ACCEPTANCE_BLOCKED / STOP_LOCAL_CONTINUATION
Runtime product: `1fdb3c275f9e174b7c8d506207c42c758aedb71a`
Latest code checkpoint: `6c9c02fc764ba36ac60ac026e0a6ea1953b526b5`（後兩commit只有browser harness）
Branch: codex/edx-wp2-s11-image-drop
Base: da6c1229c02b5c0956f5ef6725be5e9216d98acd（S10 Independent GO closure，未merge/push）
Main/origin-main: d0b9aa05c50b09596920705bbbf4dd632c9137d4

## Root question／已完成

S11單張image file drop是否能沿S9/S8安全插入，並通過完整正式browser acceptance。單一native Worker Lorentz/medium/clean完成4個source paths；Mainline讀diff後驗full與ZIP，未外包裁決。產品只有deck-editor薄event adapter，S10 ID/defaults helper共用；沒有新optimizer/mutation authority/counter/schema/dependency/clipboard/multi-file/crop。

Worker scoped192/192 PASS（含S11最終29cases），原27cases RED為3PASS/24FAIL，之後GREEN27、scoped191與192皆PASS。新detached測試預期改為外部不接管，符合connected deck scope；舊assertions與S10 browser cases未改。Worker前置讀repo不存在toolchain config exit1亦保留，非產品FAIL。

Mainline full non-browser **646/646具名cases PASS**，68檔明列nonbrowser-files.txt；build／fresh ZIP lifecycle PASS。初始與後續source freeze、source4/protected4 MATCH；ZIP **2,294,654 bytes**，SHA256 `75901fa7a4e32e5c6a4bba84e246772b409a244b5fb0d6743a33b5ce3d4f89a8`，比S10 +344 bytes。runtime/tests/ZIP自1fdb3c2未變；兩次harness-only變更不冒稱重新full／ZIP實測。

## 三輪正式host與停止原因

1. host-acceptance：1280先通過S10 chooser與S11正常／同檔／無圖頁／跨頁／export-offline五次positive trusted drop，各optimizerCalls=1。之後gesture precondition實際false，因fresh legacy quote未初始化geometry。沒有將prefix當整輪PASS。
2. host-retry-1（harness3ddc838）：補公開initialize-layout，精確geometry及gesturing=true均成立；混合held pointer與external file CDP drag後，兩次rAF的Runtime.evaluate逾時。事件只有dragenter/dragover，無drop，optimizerCalls=0。
3. host-retry-2（harness6c9c02f）：依可證偽假說將mouseReleased移至settle前，記錄beforePointerRelease與pointerReleasedBeforeSettle=true；仍無drop、optimizerCalls=0、相同rAF等待逾時。假說不足，不能宣稱修復。

三輪全部是1280 FAIL；**1600未執行、PGQ未開始**。後續busy/deferred/reject/chooser共存等browser cases未完成，不得拿mounted PASS或前五個drops代替正式gate。每輪console/page/network/HTTP/remote errors均0、targetClosed；Browser.close/supervisor exit0、exact ownedroot與isolation marker absent，source/protected/ZIP前後MATCH。cleanup正常不等於產品acceptance PASS。

實際主線確認來源與cleanup見checkpoint-verification.json。首輪source manifest保存在source-hashes-initial.json；retry1在source-hashes-retry-1.json，最終source-hashes.json對應latest code checkpoint。所有FAIL/traceback/event arrays、raw log gzip/hash完整保留。Mainline只改S11 browser-cases；Worker原sourcehash仍保存，其他14個entries吻合。

## Blocker／裁決／下一個窄範圍

根因仍UNKNOWN：同時模擬component held-pointer gesture與external file drop未成功投遞drop。沒有證據把它判定為PPTSKILL產品regression，也不能歸咎AI Core／capacity；主線保持browser gate未通過。已有CDP positive file drops成立，問題集中在混合輸入序列，不是整個drop入口不可用。

依本輪mainline-gesture-fixture-repair.md明訂的最後一次retry上限，STOP_LOCAL_CONTINUATION，**不做第4次browser launch**，不改runtime、放寬assertions或切API/synthetic正向fallback。沿root-cause-triage「Stop the line」「Do not keep trying random fixes」。停止的是目前混合事件重試路線，不刪除需求或把UNKNOWN改PASS。

下一範圍僅唯讀隔離CDP mixed input/native drag ownership與rAF等待：比較既有event arrays、Chromium Input handler文件、fixture與目前script；先提出可辨別產品／harness／protocol問題的最小觀測設計，再由Mainline裁決是否需要新browser或修正驗收方法。卡片仍要求真drop；若要改用不同驗證組合，必須明示契約及證據限制，不能偷偷降級。未開S12，沒有Independent Review candidate。

限制：CDP automation不是Finder人工拖檔；negative synthetic與native未投遞須分開，且本輪尚未走到所有negative。S10自然blur仍0／synthetic lifecycle邊界沿既有證據。固定geometry非自動避障或crop pixel驗收；S8歷史I/O根因仍未知。未merge/push/deploy，四個protected untracked未動。
