# PPTSKILL WP2-S11 Worker 交付

狀態：首輪 bounded 實作與 scoped mounted 驗證通過；正式 browser／整合驗收尚未執行。STOP WRITING。

- Repo：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical
- Branch：codex/edx-wp2-s11-image-drop；opening f835d9b。
- 單一產品 writer；未 commit、切 branch、委派、啟 Chrome/browser、build、ZIP、full/glob、probe、PGQ、push、merge、deploy；未修改 AI Core/control/protected。
- 讀取完整 task、compiled_lite、05/11 rules。CodeGraph query「deck-editor insertionBusy insertImageFile dragover drop」只回無關 generation-plan/validate-sample，依契約轉 rg。

## Changed paths（完整）

- runtime/deck-editor.js
- tests/edx-wp2-s11-image-drop.test.mjs
- tools/edx-wp2-s11-browser-cases.mjs
- tools/edx-wp1-s4-browser-acceptance.mjs

## 實作

- document dragover/drop 薄 adapter：限 primary .deck 內 connected .slide file transfer；依唯一 DOM 與 canonical ID、layout、busy、chooser 驗證。
- Files/types 或 file items 識別；text/URI 與外部 target 不 preventDefault，不讀 getData／fetch。slide 內 file 事件防止導頁；無效 identity/mode/lock 不提交。
- dragover 不讀 files／bytes／payload，不 serialize，不改 selection／revision／geometry；多 file items 以 metadata 回 none。
- 單檔沿 S9 optimizer 與 S8 insertion；多檔／directory empty 拒絕 status；不自行新增 MIME policy。
- 從 S10 提取局部 insertionTarget/insertionOptions，共用首個空缺 ID、560/288/480/320、contain、File.name；接受時取消 gesture 並 select target，finally 只釋放 insertionBusy。
- S8/S9 helper、public API、schema、dependencies、20MiB gate 不變；S10 舊 assertions/browser cases、mounted helper 完全未改（hash 已驗）。

## RED → GREEN 與命令

| run | exit | tests | pass | fail |
|---|---:|---:|---:|---:|
| public RED | 1 | 27 | 3 | 24 |
| 首輪 GREEN | 0 | 27 | 27 | 0 |
| scoped | 0 | 191 | 191 | 0 |
| final scoped | 0 | 192 | 192 | 0 |

S11 最終 29 cases。首輪 RED 檢出缺事件入口；GREEN 前將 S11 新測試中的 detached 節點預期改為「不屬本 deck，不接管」，並移除未使用的測試 helper。後續強化 missing-id 非目前頁 case，新增外部 slide 與多檔 dragover metadata case；沒有修改任何 S10 或更早 assertions。多檔 dragover 調整後才重跑 final scoped。

scoped 僅 S11、S10 UI、S9 File、S8 insert、S6 selected-image UI、S7 fit、S1 export cleanup、WP1 keyboard/selection（明列 10 檔）。原始 RED 與每次執行 log 皆保留；沒有產品 GREEN 後 test FAIL。另有一次前置讀 repo config/toolchain_paths.sh 路徑不存在（exit 1），已保存記錄並改讀 AI Core 正確位置；未執行該 shell 的 mkdir。

- 四個 source node --check：exit 0。
- 最終 browser cases syntax：exit 0。
- git diff --check：exit 0。
- commands：/private/tmp/pptskill-wp2-s11-commands.json（逐命令 args/exit/counts/log；非測試 counts 為空物件）。
- source hashes：/private/tmp/pptskill-wp2-s11-sourcehash.json（opening 與 final SHA-256、bytes；含舊測試/helper 不變確認）。
- 各次 log：/private/tmp/pptskill-wp2-s11-red.log、green.log、scoped.log、final-scoped.log、syntax-*.log、diff-check*.log、final-diff.log、final-status.log。

## Browser harness 交接（尚未跑）

Mainline 正式 host 既有 runner 加 --image-drop-regression；flag 會先跑未改的 S10 chooser cases，再跑獨立 S11 cases，沿 S10 三頁合法 fixture。沿 runner 既有雙 viewport、navigation 前 error/network listeners、remote0、targetClosed 與 acceptance.json。

S11 正向使用 Input.dispatchDragEvent dragEnter/dragOver/drop，data={items:[],files:[localPNG],dragOperationsMask:1}；必須觀測 trusted drop 與 optimizerCalls，方法缺失或未投遞即失敗，禁止 API fallback。涵蓋正常／同檔／無圖頁／跨頁／gesture cancel／deferred busy／multi／optimizer reject／export offline。真 3×2 PNG經原 optimizer；檢查 decode、geometry、fit、alt、old roots、selection；每個 viewport 輸出新 image-drop.png。

每次 CDP 嘗試先保存 receipt entry，記 commands、before/after、實際 events/isTrusted/eventCounts/trustedDropCount/optimizerCalls。negative dropEffect=none 若使 drop 未投遞，dropGuardObserved=false，不宣稱 guard 已由 native drop 實測；另派 synthetic negative，明列 route。text/URI、外部 target、empty files 使用 synthetic negative。S11 不宣稱 Finder 人工操作或 crop pixel。

官方 schema 唯讀核對：2026-09-23，https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Input.pdl ，DragData files/items/dragOperationsMask 與 dispatchDragEvent enum 已核對；未呼叫 CDP/browser。

## 未驗範圍／風險

- browser harness 只有 syntax check；CDP native 投遞、optimizer 真 decode、實際 pointer／viewport／offline screenshots、browser errors/remote0/targetClosed 均待 Mainline 正式 host。
- 未跑 Mainline 68 檔 full、build/ZIP lifecycle/source/protected4/hash/delta、四支 affected PGQ、Independent Review。
- mounted 是 public 事件 listener＋DOM double／optimizer stub，不能替代瀏覽器或真 File 解碼。
- Mainline 新增的 control/evidence 檔可見於 final-status.log，均非本 Worker 寫入，未納入 changed paths。

STOP WRITING
