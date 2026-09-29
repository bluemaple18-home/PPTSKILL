# Visual fixture — 獨立唯讀 Review A

日期：2026-09-29。**CODE GO：未發現本次 scope 的阻塞問題。** 可交 Mainline 依兩審結果鎖定 manifest；目前 pending 正常。本次不是實際 browser visual acceptance，沒有啟 Chrome／host／PGQ，也沒有將舊 PNG 或 mock 截圖當成本輪驗收。

依 code-review-gate 分開核對 spec／standards。CodeGraph source query 回傳無關的 style/geometry source，未命中新 gate，遂改用指定檔案 read／diff。只新增本 receipt，未修改 delivery、manifest、原 review，未 commit；既有 client receipt I/O P2 維持非阻塞，不重審、不修。

## 固定 SHA256

以下均為目前未提交候選，不以 repo HEAD 代替工作目錄 bytes：

| 路徑 | SHA256 |
| --- | --- |
| `tools/edx-wp1-s4-browser-acceptance.mjs` | `25d23a56745f6533f4d95a089592b487247d140705aa27ee7646afe4325d0c5b` |
| `tools/edx-core-3-fixture-visual-gate.mjs` | `bb9d1f0a3dfc7d102212db366803ee65af9ae02ab9efd6c45917529f94f6a909` |
| `tests/edx-core-3-fixture-visual-gate.test.mjs` | `2ae436c912d018056488d1d9bfeda6b0f89f77e7a9f85462a92d4f96d202cd27` |
| `host-client-visual-fixture.py` | `ae571cd3a8290ca21711b330b5c54842174875c9d9d67ff12bed227ae135759b` |
| `host-controller-visual-fixture.py` | `b4504a9635330c839ba320d8296ea591a8f006f74b6a871004c9cb8f4dcc1ae9` |
| `host-controller-visual-fixture-test.py` | `f87669e61d09eb8f1024bcdc51e9e9852ddc8066a20a12390b70b534fded0c6f` |
| `host-controller-visual-fixture-manifest.json` | `7abc5aa1e6009bf3a4a031c730feb7835d10562ed81fc83a1876112516eb3a74` |
| `visual-fixture-client-audit.json` | `9d8664ef3f7e4aaeb567e591a6eb2f45819ed09736364e6a74a18bc74306b873` |

最後五個檔案位於 `evidence/edx-core-3-undo-redo/`。實際重算 manifest harnessFiles、audit 本身及 audit files，全數吻合。

## Spec 判定

| 要求 | 審查結果 |
| --- | --- |
| 僅移測試 A/B | harness diff 將 history-a/history-b 的 y120 改為600，x120/360、width180、height120不變。新程式只在 undo-redo fixture 分支增加負控制與gate；沒有改產品title、font或runtime。 |
| 原位置 RED | 暫態只改A/B DOM top至120px；要求 gate.pass=false且issues精確為兩個title-overlap，故不能以元素缺失、hidden、offscreen或其他錯誤冒充RED。title/rightquote measurement須與candidate一致。 |
| 新位置 GREEN | candidate的A/B computed top先確認600px；GREEN要求可見、文字仍A/B、有效有限正尺寸、整框在viewport內，且与title無正面積交集。geometry gate無負容忍值。 |
| 隱藏／offscreen不能取巧 | DOM measurement檢查client rect及node到祖先鏈的display、visibility、opacity；gate要求visible=true、title非空、A/B文字不變與完整viewport bounds。刪除、零尺寸、非finite、出界及visible=false均有離線反例。這是元素框／CSS可見性gate，不是OCR、glyph ink、任意clip-path或第三方遮罩的完整painted-visibility判定；不外推其範圍。 |
| finally完整restore | RED mutation在try內，finally回寫A/B完整原inline style（null則removeAttribute），settle後重測，整份measurement須與candidate深相等。RED screenshot／assert失敗也執行restore，且不生成成功GREEN；獨立6-case mock probe如下。 |
| PNG／source identity | producer由CDP取得PNG，檢signature及viewport dimensions，保存path/bytes/SHA。controller核對雙viewport、phase／原因、candidate/restored、title/rightquote不變、A/B visible/text/top、四張PNG exact path/bytes/SHA/header/dimensions，以及本輪source.html實際SHA。缺RED、改hash、缺PNG等均拒絕。 |
| 原11功能檢查 | 與HEAD逐項比對11個原inline `run.checks.push`，全部保留且相關功能區段無刪除；新增唯一visual項，所以本輪預期每viewport **12項＝原11＋visual1**。原Core3 toolbar/replay/export及target finally仍在。 |
| 產品／字體／ZIP／core不動 | scope diff沒有產品/字體/core改動。controller實際唯讀identity test核對canonical committed/current bytes、75 source／4 protected／固定ZIP及callchain；全部通過。未以修改產品或字體解遮擋。 |

source identity的精確解讀：`sourcePath/sourceSha256`是固定生成fixture來源；visual插入點在既有export/reopen/drag檢查之後，當時DOM已含那些合法操作，`pageUrl`另記目前頁面。PNG不是「未經操作的source.html逐像素截圖」，也不宣稱其等於後續undo-redo-export。receipt將初始來源與執行中measurement分開保存，符合本次A/B位置負控制用途。

## Controller copy 與副作用

實際對比 `host-controller-owned-group.py`：只換本輪OUT／manifest／audit／client路徑，新增`verify_visual_gate()`、finalize visualFixture條件及browser-evidence呼叫。既有launch、wait、diagnostic、identity、capacity、exact root/marker/PID確認與unknown不介入流程均未改。

`host-client-visual-fixture.py`對比owned-group版本只有controller import檔名一行差異。普通產品／Browser.close children仍繼承canonical唯一outer PGID；沒有新增session、signal controller、kill、terminate、tmp清理或cleanup authority。舊controller僅作固定pure checks/tasks來源，舊獨立product-group runtime沒有重新接回。

新visual verifier是在host收尾的browser-evidence步驟執行；任何缺件、來源／PNG漂移或visual gate未完成都不滿足finalize，不能以舊的browserVerified單獨PASS。pending manifest仍在launch前拒絕，沒有被測試解鎖。

PNG header/dimensions檢查不是完整PNG解碼器；此流程的production來源固定為CDP，本次單元測試的24-byte合成header只驗證欄位／缺件gate，不能作為真PNG證據。正式host仍須產生並保存真雙viewport RED/GREEN PNG。

## Reviewer fresh 離線驗證

從 repo root 可重播：

```sh
/opt/homebrew/bin/node --test tests/edx-core-3-fixture-visual-gate.test.mjs
/Users/matt/ai-core/.venv/bin/python -B evidence/edx-core-3-undo-redo/host-controller-visual-fixture-test.py
```

實際結果：

- geometry gate **4/4 PASS**，0fail/skip；含雙viewport120RED／600GREEN、hidden/offscreen/missing/empty/zero-bounds、全部rect欄位非finite／型別錯誤、viewport無效、正面積交集邊界。
- controller **14/14 PASS，0.233s**，0error/failure；本review以import/unittest loader執行同module全選集，包含實際唯讀identity、visual證據缺件、同PGID普通child mapping、timeout/signal、非零阻止PGQ、observer不完整、unknown outer wait不介入。
- 獨立finally probe **6/6 PASS**：從候選source抽取`const capture = async name =>`至對應`else`前的完整visual區段，以AsyncFunction執行原區段，mock evaluate/CDP/writeFile，使用實際fixtureVisualGate。區段SHA為`3f30031bc88f27bee56c2ce99356ac8283d20aca6f2cea6b3a774742b30df1d4`。每個1280/1600viewport分別測正常、首RED capture拋錯、RED gate assertion拋錯。全部最終A/B完整style及measurement恢復；正常PASS且兩張mock輸出，兩種錯誤皆INCOMPLETE、無GREEN成功。沒有實際browser、沒有將mock PNG寫成證據檔。
- 新舊checks比對結果：prior11/current12/removed0，新增僅「Core3 可見fixture避開標題／原120 RED與600 GREEN」。

一次read因工作目錄已在repo卻重複加repo前綴而找不到檔案，之後以正確相對路徑讀取；未影響測試或更動檔案。未引用Worker offline log作為Reviewer fresh結果。

## 未驗項／交付界線

本次沒有真viewport rendering、真font raster／pixels、CDP截图、PNG視覺人工比對、host group收斂或PGQ執行。因此判定是 **code/spec/standards GO，HOST VISUAL ACCEPTANCE NOT_RUN**，不能拿先前owned-group成功或本次mock RED/GREEN直接關閉這輪visual修復。

既有client receipt I/O P2保持非阻塞，本輪未新增阻塞finding。Mainline取得兩審後再鎖定新manifest及執行本輪正式驗收；此review不授權擴產品／字體／runtime修補。收据完成，停寫。
