# Crop/Evidence clean Independent Reviewer — initial verdict

審查固定 candidate `b364cd8923dcb6382e7a60432c7849dc5071af30`；base `45d6e0c287eafcd63bd9529c905358cad79f8bb9`；runtime/ZIP `0b88f60eed5011050eca517a32bd641d2149eca2`。

**Initial verdict：CHANGES_REQUESTED（spec 契約有缺口）；不給 Independent GO。**

產品程式 bounded 範圍已完整走讀，含 canonical、Node/portable operation、所有指定 Evidence cover 入口、pending/reset、投影、dialog、export/reopen、rollback/observer/lifecycle、vendor 與既有 deck／pointer 成本。此處「完整」指指定產品來源與相鄰呼叫路徑，不表示所有真 browser、完整 PGQ 或 installer 驗收已完成。未讀 Mainline code-review／acceptance-notes／其他 Reviewer verdict。

Spec axis：正常路徑及 331 scoped cases 通過，但下列 preview、rollback、lifecycle、portable attribution 尚不符合完整契約。Standards axis：共享 closure／registry／精確 pin 採既有 seam，未增加第二模型；failure rollback 與既有 vendor attribution 模式仍有缺口。P0=0、P1=0、P2=5、P3=0。五項均有本次具體重現，不以尚未跑 browser 當 finding。

## Findings

### F5 [P2] decorative cover 的「裁切結果」預覽使用 dialog 比例，與提交後可見範圍不同
- 位置：`runtime/image-crop.js:167`，相關 `:145`、`:72-78`。
- 觸發：240×160 原圖、crop `{x:.2,y:.15,width:.5,height:.6}`、decorative＋cover，投影片 figure=250×400；dialog 結果框為 330×170。
- 重現：`node /private/tmp/pptskill-core-crop-review-b364cd8/preview-probe.mjs`（cwd=repo）。`preview-result.json` 記錄 preview 可見 x=.2..7、y=.256818..643182；實際 figure 可見 x=.325..575、y=.15..75。原圖點 (.22,.45) 預覽可見，提交後消失。
- 原因：`update()` 對固定 170px 高的 dialog frame 直接使用 cover；未以目標 figure 的長寬比建立等比例最終預覽。
- 影響：使用者人工確認的最終範圍與提交結果不一致，尤其直式 frame。Evidence contain 不受這個額外 cover 裁除影響。
- 建議：結果預覽保持選定目標 frame 的比例，並在該 frame 內縮放投影；補不同方向 frame 的 preview-vs-commit 可見區域／pixel 比對。
- 證據等級：fresh 純 projection 幾何＋來源；未聲稱已以 browser 截圖重現。信心高。

### F1 [P2] pagehide 清除投影後缺少 persisted pageshow 恢復
- 位置：`runtime/deck-editor.js:656`；相关 `runtime/image-crop.js:97`、`:127`。
- 觸發：active crop 頁面進入 back-forward cache，再返回同一 document。
- 重現：`adversarial.mjs` 的 `F1_pagehide_persisted_loses_projection`：對 mounted runtime 發送 `pagehide({persisted:true})` 及 `pageshow({persisted:true})`。
- 結果：canonical 仍 active；img 從 `object-fit:fill;...clip-path:inset(...)` 回到 `object-fit:contain`；load callbacks=0，pageshow handlers=0。再呼叫 S18 delete 得到 `delete-element image DOM 與 canonical 失配。`。
- 影響：從歷史返回後 crop 不顯示，observer 也不再跟隨尺寸；canonical 與 DOM 分歧並使 S18 拒絕刪除。
- 建議：區分永久 teardown 與 persisted pagehide，或在 pageshow 重新依 canonical 建立投影 ownership；覆蓋 BFCache 恢復及 S18。
- 證據等級：fresh mounted lifecycle event；真 browser 是否進入 BFCache 尚待專項核實，沒有宣稱 browser 實測。信心高於程式路徑，環境條件已明列。

### F2 [P2] raw component patch 的新投影失敗後，canonical 回退但 DOM 留在 candidate
- 位置：`runtime/deck-editor.js:527`，相關 `:595`、`runtime/image-crop.js:123`。
- 觸發：active cropped 圖片經 applyLocalPatch 改有效 crop tuple；在新節點 ResizeObserver.observe 注入 throw。
- 重現：`adversarial.mjs` 的 `F2_raw_patch_projection_failure_keeps_candidate_DOM`。
- 結果：API throw，canonical 與 revision 恢復；舊 img 卻已斷開，新 img 留在 document，只有 contain/full-image CSS 且沒有 load callback。
- 原因：`old.replaceWith(next)` 先執行；隨後 `projectCropImages()` 可 throw；applyPatch catch 只恢復 spec，未恢復原 node／projection ownership。這個新投影副作用未包含在原 raw patch transaction。
- 影響：失敗操作仍改動展示、失去已確認裁切；後續 decode/resize 與 S18 可能面對錯誤 DOM。
- 建議：投影成功後才發布新節點，或在 catch 恢復原 node 位置、樣式與 observer/listener；補 raw patch 路徑投影 throw 的原子性測試。
- 證據等級：fresh mounted deterministic fault injection；不宣稱原生 observe 通常會失敗。信心高。

### F3 [P2] reset 後若提交尾段失敗，rollback 只恢復 projection 值而未恢復 observer/listener
- 位置：`runtime/image-crop.js:132`，相關 `:125`、`runtime/deck-editor.js:593`。
- 觸發：active crop → reset；sync 已清除 load/error listeners 並 disconnect observer，之後 refreshSelectedImage 注入 throw。
- 重現：`adversarial.mjs` 的 `F3_reset_rollback_drops_observer_and_load_lifecycle`。
- 結果：canonical、revision、即時 CSS 都回到 active crop；active observers=0、load callbacks=0。
- 原因：checkpoint 只存 projection；rollback(before) 只 assign `r.projection=before`，未恢復 sync 先前改變的 observer/listening 狀態。
- 影響：畫面乍看已回退，但下一次 resize／load 不會重新投影；失敗回退不是完整 lifecycle 回退。
- 建議：checkpoint/rollback 包含 ownership 狀態，或依 before snapshot 重新 reconcile observer/listener；補 sync 成功、後段失敗的測試。
- 證據等級：fresh mounted deterministic fault injection。信心高。

### F4 [P2] 新增 noble hash bundle 未把其授權文字帶入 standalone HTML
- 位置：`runtime/crop-hash-vendor.js:7`；相關 `tools/build-crop-hash-vendor.mjs:14`、`runtime/image-crop.js:138`。
- 觸發：一般 renderFullDeck 或 portable exportHtml；不需 crop 才嵌入 hash runtime。
- 重現：`adversarial.mjs` 的 `F4_portable_noble_license_omitted`：rendered HTML 含 `PPTSKILLCropHash`，不含 vendor LICENSE 的 `Copyright (c) 2022 Paul Miller`；portable export 同樣缺失。
- 原因：builder 設 `legalComments:'none'`；helper 只回 bundle，未讀取/輸出 `crop-hash-LICENSE.md`。ZIP 有 LICENSE 不能補足單獨傳遞的 HTML。
- 影響：standalone portable 複本缺少此 vendor 的 attribution，未遵循 repo 既有 Moveable／Selecto 會嵌 license 的方式及本卡 vendor/license 契約。
- 建議：依既有安全嵌入方式附完整 license，檢查 license hash，並驗證 normal render/export/reopen 的單檔內容保留它。
- 證據等級：fresh HTML 字串內容检查＋本地 LICENSE／builder/helper source，不是廣泛法律意見。信心高。

## Fresh Reviewer 執行

- 確認 scoped manifest 是 17 個唯一且存在的實體 files，以 manifest 展開為 Node argv，命令為 `node --test --test-concurrency=1 <17 paths>`；沒有 glob／npm／yarn。
- Node `v25.9.0`；**331 tests、331 pass、0 fail、0 skipped**。命令記錄 `scoped-argv.json`，完整輸出 `fresh-scoped.tap`（Node 預設 spec reporter，不冒稱 TAP）。三個 Crop files 位於同一次 scoped run，未把相同 cases 重複計數。
- `adversarial.mjs`：9 組 fresh probes，0 probe execution errors；含 4 findings 重現、Node/portable 各 7 條 pending/cover/reset 檢查、legacy no-crop、tuple/cache 200 state checks、busy async asset 互斥。
- `preview-probe.mjs`：1 組幾何重現。合計 **10 組 adversarial probes**，另外計數，非 331 個 Node test cases 的一部分。fault probes 的成功代表成功重現缺陷，不代表產品 pass。
- `git diff --check 45d6e0c b364cd8` 通過。
- 20 個 source hashes＋4 個 protected hashes 與提供 manifest 一致；22 個 candidate changed files 的 on-disk git blob 均符合 b364cd8；0b88f60→b364cd8 只變 fixture test 與 browser fixture/case 檔。
- ZIP 僅 fresh 讀 bytes/hash/sidecar/git blob：2,315,483 bytes，SHA256 `0be064da1a26064a056f8f0c2c910c04a09440d578c733c19eb9c87f608709c5`，與 source-hashes/distribution-lifecycle/sidecar 及 0b88f60 一致。**沒有解壓、重建、安裝或跑 ZIP lifecycle。**
- Vendor fresh 核對：exact @noble/hashes 2.0.1；四個 isolated source input 的 bytes/hash、MIT license hash、bundle hash 都與 metadata 相符；package/lock integrity 字串相同。bundled crypto 僅 digest 使用的無網路/儲存/entropy surface，scoped UTF8/20MiB 與 Node SHA256 parity 通過。
- integrity 腳本初次使用 git show binary 超出 Node maxBuffer（reviewer 工具錯誤）；改成唯讀 git hash-object 比對後完成。沒有作為產品 failure。

## Existing evidence 核對（不是 fresh tests）

- focused-files 3、scoped-files 17、nonbrowser-files 78；既有 focused-01=19/19、scoped-01=331/331、nonbrowser-01=964/964。Reviewer **未重跑 78-file full suite**。
- distribution-lifecycle.json 的 lifecycle/package smoke/profile 均 pass；host capability 為 partial（Gemini CLI missing）。這些只是既有 receipt，不能稱本次 fresh installer validation。
- distribution-content-verification.json 宣稱九個 runtime/schema ZIP entries match，bytesDelta=13,911；本次只核對整個 ZIP hash，沒有重新開 archive 驗內容。
- vendor-verification.json 的 input/license/bundle/package-pin true 與本次 fresh 檔案 hash 核對相容。
- 正式 host-acceptance-01/02 的歷史 NOT_PASS 保留，不由第三輪覆蓋。不讀其他 verdict，不用使用者轉述的 host-03 數字作 fresh 證據。
- **本 initial verdict 產出時尚未檢閱 host-03 最終 acceptance/PGQ/lifecycle/visual supplement。Browser evidence 狀態為 PENDING_REVIEW。** 未等待它而停止產品 code review；也沒有啟動、停止、attach 或干擾任何 Chrome／Mainline 程序。

## 完整範圍覆核清單與限制

| 指定範圍 | 本次結果／證據 |
|---|---|
| canonical tuple、sanitizer、exact plain data、registry | 共享 closure 用於 Node/portable；shape、finite、bounds、Evidence protected containment、confirm、digest owner；fresh scoped＋hash/tuple probes |
| Evidence cover 所有入口及 reset 後分類 | S7、replace-asset、raw patch/import sanitizer、reset retention 都追到共同拒絕邊界；fresh scoped 與雙 runtime probes |
| 換 source/raw tuple pending、原 src 保留 | 同尺寸也因 tuple mismatch pending，prepare contain；原 src 不做 projection 重寫；fresh scoped、raw delta probes |
| normal/portable projection、export/reopen | lazy natural dimensions、CSS projection、copyClean、export cleanup、duplicate/reopen 走讀與 fresh scoped；F1/F2/F3、preview F5 缺口 |
| dialog busy/stale/decode/selection/S18 | 互斥、revision/source/slide/selection/node checks、decode reject、晚到 confirm、cancel/Escape、delete invalidate 走讀及 scoped；busy API probe |
| rollback/observer/lifecycle | first-write styles rollback、clone cleanup、prune/delete、pagehide 均審；F1/F2/F3 有 fresh 重現 |
| vendor pin/license/input/bundle | 本地 hash 與 known vectors parity；F4 standalone attribution 缺口；未網路下載、未安裝 |
| legacy deck／每 pointer 成本 | legacy no-crop 不加 img listener/style 的 fresh probe；scoped 20MiB preview 無 hash/whole-spec serialization、ResizeObserver 無 hash；不是 browser perf timing claim |
| browser/PGQ/visual/installer | 未 fresh 執行；正式 receipts 留作同一 Reviewer 續核，不能由上述 Node 結果推出 GO |

重現 cwd：`/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical`。所有 Reviewer writes 僅在本 report 同一 `/private/tmp/pptskill-core-crop-review-b364cd8/`；沒有 code fix、git mutation 或 protected write。
