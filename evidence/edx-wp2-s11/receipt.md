# WP2-S11 Mainline acceptance receipt

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Candidate：`8b0be659ea400862456f4ce0db5a0526d0623ce8`
Runtime product：`1fdb3c275f9e174b7c8d506207c42c758aedb71a`
Base：`da6c1229c02b5c0956f5ef6725be5e9216d98acd`（S10 GO closure，未整合）
Branch：`codex/edx-wp2-s11-image-drop`
Main/origin-main：`d0b9aa05c50b09596920705bbbf4dd632c9137d4`，未 merge／push／deploy，未開 S12。

## Root question／裁決

單張 image file drop 沿 S9 File adapter → S8 canonical insertion；S10 chooser/defaults 共用，沒有第二套 optimizer／identity counter／mutation authority。runtime 自 1fdb3c2 凍結。原 blocker 是 held CDP mouse gesture 與 external CDP file drag 混用未投遞 drop；依 Owner 明示及 split-acceptance-decision.md 改驗收組合，沒有第四次嘗試原混合路徑。

正式 host 新契約已通過，browser blocker 在此限定驗收範圍內關閉。沒有證明所有 CDP 版本均不支援該組合，也沒有聲稱修復 Chromium／AI Core。無新 fork；下一步只交獨立 Reviewer，不自行宣稱 Independent GO。

## 本輪 fresh verification

- 單檔 harness syntax／fixture-only／targeted **154/154 PASS**（六個明列檔案；含 S11 29 與 snap=false／true mounted cancellation），split-targeted.log。
- 正式 host --image-drop-regression：1280×720、1600×900 各 **59 checks PASS**。精確為 base10＋S10 13（12 chooser records＋1 lifecycle）＋S11 36 records；59 是 receipt records，不冒稱59個獨立具名 Node cases。
- 每 viewport external CDP attempts 14：trusted drop **8**（成功插入7＋unsupported file 經 optimizer 拒絕1）；各 optimizerCalls=1。busy／play／edit／multi／insert-chooser／replace-chooser 的6次 native drop 未投遞，calls0；guard 另以 synthetic negative 取證，不把未投遞當 guard PASS。共有9筆 synthetic negative records，包含 URI／外部target／empty-files。
- 每 viewport 2筆獨立 **synthetic gesture-cancel semantics**：snap=false／true，真 CDP pointer 建立 gesturing=true 且 canonical未變；DOM DragEvent 帶真 PNG File，isTrusted=false，drop同步取消gesture，**mouseReleased之前**已 gesturing=false；真 optimizer一次、完整spec只有新image、原quote geometry保留、selection清空、舊DOM roots保持。不是 native external drop fallback，不宣稱 OS drag 與 held pointer 同時成立。
- async captured target／其他頁文字修改／busy／chooser互斥／reject不占ID／export pending／offline remount全部跑完。每viewport console/page/network/HTTP/remote errors=0、targetClosed=true。
- 四支 affected PGQ以 --test-concurrency=1 串行，**單輪16/16 unique named PASS**。詳 host-split-acceptance/pgq.log；沒有與歷史或其他套件混算。
- managed readiness exit0、Browser.close exit0、supervisor exit0、owned root實際不存在、isolation marker不存在；controller before/after Source4、protected4、ZIP MATCH。AI Core `1d66afe3de4d5974e82ce8af82c0f9d7de5bfeb5`，host實際CODEX_SANDBOX=null，沒有unset或裸啟Chrome。
- `git diff --check` PASS；runtime/tests/dist相對1fdb3c2無diff；初始ZIP與目前ZIP完全一致。

## 延用且已重新核對完整性的證據

Worker scoped192/192、Mainline full non-browser **646/646 named cases（68明列檔案）** 與 build／ZIP lifecycle，皆為本卡較早已提交的執行；本輪只有harness改動，沒有重跑full／重建ZIP，不能稱本輪fresh646。

ZIP：2,294,654 bytes，SHA256 `75901fa7a4e32e5c6a4bba84e246772b409a244b5fb0d6743a33b5ce3d4f89a8`。ZIP內deck-editor byte-match；Worker15個source entries中14個仍MATCH，唯一差異為Mainline已記錄的S11 browser harness；source-hashes.json另鎖最終四個交付source。Protected4始終原hash。

## 截圖人工檢視

實際檢視 host-split-acceptance/image-drop 下兩viewport的 image-drop.png 與 insert-image-ui.png，共4張。新3×2插入圖、layout toolbar可見，S10圖另可見selection／resize handle與replace／fit controls，toolbar未出現viewport clipping。drop後selection清空是契約，不能要求該截圖仍有selection框。

asset-other drop截圖的既有title第二行有裁切；source.html與1280-image-drop.png在首輪／retry1／retry2／split四輪SHA各自完全一致，沒有把它說成全頁排版PASS。此為保留fixture狀態；本卡只驗插入、固定geometry與toolbar可用，未驗整頁自動避障。3×2圖證明decode/geometry/fit，不是crop pixel品質驗收。

## 歷史 FAIL／限制

原RED27為3PASS/24FAIL，GREEN27與scoped191→192保留；新detached fixture依connected deck契約修正，沒有改舊assertions。三輪正式browser FAIL完整保留：首輪geometry未初始化；retry1混合input無drop/rAF timeout；retry2 mouseReleased在drag命令後仍無drop/rAF timeout。每輪cleanup PASS，但都不計成完整acceptance PASS。原prefix五次trusted drop不取代本輪全路徑。

raw-log-hashes.json＋*.gz保存原始輸出；本文與host-final-verification.json為摘要，raw acceptance/event arrays為依據。一次本地統計讀到混合string/object checks引起AttributeError，僅修receipt解析器為逐型別分類，沒有動harness或重跑browser；它不是產品FAIL。

CDP chooser非人工OS dialog；S10 naturalBlurCount=0、blur/cancel/focusin是synthetic，界線不變。固定位置不等於自動避障、File.name不等於語意alt。S8歷史I/O根因仍未知；本卡不改AI Core。Independent Review pending；無Reviewer fresh verdict。
