# Visual fixture 修復：獨立唯讀 code review B

日期：2026-09-29。**CODE GO；本次範圍未發現新的阻塞 finding。** 僅為下列固定 bytes 的 code/offline review，不是正式雙 viewport RED/GREEN、PNG 視覺驗收或 whole Core3 closure。manifest pending 正常，待 Mainline 兩審後鎖定。既有 client receipt I/O P2 保持非阻塞，不修、不擴域。

## 範圍與固定 SHA256

| 檔案 | SHA256 |
| --- | --- |
| tools/edx-wp1-s4-browser-acceptance.mjs | `25d23a56745f6533f4d95a089592b487247d140705aa27ee7646afe4325d0c5b` |
| tools/edx-core-3-fixture-visual-gate.mjs | `bb9d1f0a3dfc7d102212db366803ee65af9ae02ab9efd6c45917529f94f6a909` |
| tests/edx-core-3-fixture-visual-gate.test.mjs | `2ae436c912d018056488d1d9bfeda6b0f89f77e7a9f85462a92d4f96d202cd27` |
| host-client-visual-fixture.py | `ae571cd3a8290ca21711b330b5c54842174875c9d9d67ff12bed227ae135759b` |
| host-controller-visual-fixture.py | `b4504a9635330c839ba320d8296ea591a8f006f74b6a871004c9cb8f4dcc1ae9` |
| host-controller-visual-fixture-test.py | `f87669e61d09eb8f1024bcdc51e9e9852ddc8066a20a12390b70b534fded0c6f` |
| host-controller-visual-fixture-manifest.json | `7abc5aa1e6009bf3a4a031c730feb7835d10562ed81fc83a1876112516eb3a74` |
| visual-fixture-client-audit.json | `9d8664ef3f7e4aaeb567e591a6eb2f45819ed09736364e6a74a18bc74306b873` |

後五檔位於本 evidence 目錄。審查採 tracked harness diff、新 gate/tests 全文與新舊 owned-group controller/client/tests 對照；未改候選，未讀另一 reviewer 本輪結果。CodeGraph 先查指定 symbols，回傳無關 runtime/deck symbols，故改用限定檔案 diff/read。

## Spec axis：符合本次最小修復

- fixture 唯一 geometry delta 是 `history-a/history-b` 的 **y120→600**；x120/360、width180、height120、A/B 文本不變。產品 renderer、title、字體、ZIP、canonical runtime/scanner 無此修復 delta。
- 原 harness 11 個功能檢查未刪除或弱化；原 screenshot 步驟在 undoRedo 分支改為帶 gate/hash 的 capture，另加一項 visual check。非 undoRedo 分支仍走原 screenshot。預期正式每 viewport 為 **原11＋visual1=12 checks**，不是只保留新 visual 而取代原11。
- RED 在當前 candidate 頁面上只暫改 A/B inline top=120px；須明確拒絕且 issues 恰為 `title-overlap:A`、`title-overlap:B`。title/rightquote 完整 measurement 與 candidate 相同；不得靠隱藏 fixture 製造 RED。
- finally 使用 mutation 前保存的 A/B **完整 inlineStyle**，null 時 removeAttribute，否則 setAttribute；恢復後 settle、重測、與完整 candidate measurement deepEqual。RED measure/assert/capture/write 任一步失敗都會走該 finally；恢復失敗則整個 run fail，不能到 visual PASS。
- GREEN 重新量測並 gate pass；A/B 須仍為可見且位於 600px；PNG 為 restored 狀態再 capture。只有 RED、restore、GREEN 全完成才設定 visual.status=PASS。
- gate 拒絕 display/visibility/opacity 隱藏的量測結果、空 client rect、非有限／零尺寸 bounds、缺元素、錯 A/B 文本、任何部分出 viewport，以及任一正面積 title overlap；edge-touch 面積0可通過。測試涵蓋 .8/1 比例對應兩 viewport。

這是固定 fixture 的 **DOM bounds/CSS 可見性 gate**，不是 OCR／glyph ink／所有 CSS clipping、遮罩、第三方覆蓋物的通用 painted-visibility 保證。沒有將離線 synthetic geometry 通過外推成真 PNG 已驗；正式 screenshots 仍須後續 host 驗收。此界限符合檔案明示用途，本輪沒有修改 fixture 的其他 CSS 以規避 gate。

## 身份與 evidence gate

- harness 保存原 rendered sourcePath/sourceSha256、當前 pageUrl、candidate/red/restored/green measurements。此位置在既有 offline reopen 流程後，因此 pageUrl 可為 reopen-export，不應冒稱必須等於原 source URL。
- capture 檢查 PNG signature、viewport width/height，寫入檔案後記 path/bytes/SHA256；controller 再讀 exact `OUT/undo-redo/{width}-{fixture-red|selected}.png` 並比對上述欄位。缺 PNG、錯 hash、缺 RED、RED 假 pass、visible=false 均不能通過。
- controller 固定 sourcePath 並重算 source.html SHA；require restored==candidate、title/rightquote invariance、A/B text/visible/top、兩 phase viewport、pass/issues；finalize 另要求 visualFixtureVerified=true。
- geometry pass/overlap 的計算 authority 是受 audit SHA 固定的 JS producer；controller 不再重實作第二套 geometry 演算法。PNG 檢查是檔案身份／header 維度，不是完整 PNG 解碼器；測試的 24-byte mock header 只驗證該接點，不是 host screenshot 證據。
- manifest 的 harnessFiles＋visual-fixture-client-audit.files 覆蓋新 harness、gate、tests、固定產品 callchain；fresh identity test 通過 canonical current/committed hashes、75 source、4 protected、ZIP、audit。產品／字體呈現與 core 沒有被本修復修改。

## Standards axis：authority 沿用，不新增 runtime

新 client 與 owned-group 版差異僅載入 `host-controller-visual-fixture.py`。新 controller 與 owned-group 版差異限 OUT/MANIFEST/AUDIT/client 路徑、新 verify_visual_gate 與 final check。舊的 managed context、25s readiness、port 映射、900/1800s tasks、產品非零阻止 PGQ、timeout/訊號交 outer、Browser.close、未知 supervisor 不介入、exact root/marker/group cleanup 與 diagnostic／identity 保持。

普通 children 繼承唯一 canonical outer PGID；無新 group/session、SignalController、kill/terminate、cleanup authority。canonical HEAD 固定71b774d3、64MiB／10000 files／TTL3600；observer failure 路徑不新增 retry/R3。RED finally 僅還原 DOM style，不碰程序／tmp cleanup；harness 原外層 finally 仍關閉 owned target、寫 acceptance，controller 仍以非零／完整 evidence gate 判斷結果。

## Reviewer B fresh offline tests

在 PPTSKILL repo root 執行，未保存額外測試檔或 log：

```sh
/opt/homebrew/bin/node --test tests/edx-core-3-fixture-visual-gate.test.mjs
/Users/matt/ai-core/.venv/bin/python -B evidence/edx-core-3-undo-redo/host-controller-visual-fixture-test.py
git diff --check -- tools/edx-wp1-s4-browser-acceptance.mjs
```

- Node **4/4 PASS、0 skip**，duration 130.567958ms。
- Python **14/14 PASS**，0.236s。產品、Browser.close、outer supervisor 均 mock；identity test 僅唯讀 git/hash；臨時普通檔案 fixture 測完清除，未建立 managed browser root。
- tracked harness diff whitespace check PASS。
- 額外以 inline Node AsyncFunction **抽取當前 harness 自 `const capture = async name =>` 至 visual check push 的原區塊**，注入 mocked evaluate/settle/CDP/writeFile；未改 source、未啟 browser。正常路徑：restore1次、finalY600、statusPASS、capture2次；首個 RED capture 丟錯：restore1次、finalY600、statusINCOMPLETE、capture1次，原錯誤繼續拋出，restored 深等於 candidate。PNG buffer 在該 probe 也是 mock，不當真截圖。
- probe 首次因 B 自製 evaluate dispatch 過寬，將 measurement function 內的 Object.entries 誤認為 restore 而失敗；縮窄到 restore expression 的確切前綴後，上述兩條路徑通過。這是 reviewer mock 修正，沒有 delivery 修正，也未把第一次失敗隱藏或列為產品 finding。

## 未驗範圍與交回

未啟 Chrome／host／PGQ，未在真頁面產生本輪 RED/GREEN PNG；真 CSS layout、device screenshot、字體實際繪製、正式雙 viewport 功能12項、真 outer group／cleanup，須 Mainline 在鎖定 manifest 後按既有授權驗證。現有 mocked phase/hash tests 不代替這些 host evidence。

**交回 CODE GO**，沒有本範圍新增阻塞；既有 receipt I/O P2 仍非阻塞。只有本 receipt 新增，未改 delivery、不 commit，完成後停寫。正式驗收未完成前，不宣稱視覺問題已由實機 PNG 證實關閉。
