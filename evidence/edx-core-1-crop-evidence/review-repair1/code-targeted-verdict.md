# Repair1 targeted code verdict（原 Independent Reviewer）

Candidate `2db6185d13a6713700d0186758b1261ff23b9d85`；base `b364cd8923dcb6382e7a60432c7849dc5071af30`。僅審 F1–F5、3 個 runtime 修復檔及受影響的 tests／browsercases／projection lifecycle／單檔輸出接點；沒有擴大為全專案或 S18 歷史審查。未讀 Mainline verdict。

**CODE TARGETED VERDICT：CHANGES_REQUESTED。F2 OPEN（P2）；F1/F3/F4/F5 CLOSED，限下述證據。整卡最終 GO 不成立，host04 完整 lifecycle/PGQ/Evidence visual 仍待續核。**

## P0–P3

P0=0、P1=0、P2=1（F2 殘留，兩種同根因重現）、P3=0。

### [P2] F2 舊 ownership teardown 已發生副作用後 throw，rollback 仍信任舊 flag

- `runtime/image-crop.js:117`，關聯 `:115-116`、`:124`、`runtime/deck-editor.js:529`。
- `reconcile(false)` 先呼叫 disconnect，再把 observing=false；先移除 load/error，再把 listening=false。若呼叫先完成副作用才 throw，後續 flag assignment 沒執行。
- raw patch catch 雖恢復原 node/spec/revision/styles，`rollback` 再進 `reconcile(true)` 卻根據仍為 true 的 observing/listening 判斷不需重新掛載，留下部分 ownership。
- Fresh 重現 A：active crop、dialog 開啟，包裝舊 ResizeObserver.disconnect，先呼叫原 disconnect 再 one-shot throw；applyLocalPatch 建新 crop。API throw 後原 node／位置／spec／revision／style／dialog 都回復，candidate disconnected、candidate callbacks/observers=0；但舊 projection active observer=0（應為1）。下一次 resize 無 callback。
- Fresh 重現 B：包裝舊 img.removeEventListener，先移除 load listener 再 one-shot throw。上述主要狀態回復，但舊 load callbacks=0（應為1），error=1；後續 load 不能重新投影。
- 具體結果：`repair-probe-results.json` 中 `F2_old-disconnect-after`、`F2_old-remove-load-after`，兩項 fresh FAIL。這是依使用者指定「partial 建立／舊 teardown throw」做的 deterministic fault injection；不宣稱原生 API 在一般瀏覽時會自然 throw。
- 重現命令（cwd=repo）：`node /private/tmp/pptskill-core-crop-review-2db6185/repair-probes.mjs`。輸出另存同 tmp，exit 1 表示以上 repair expectation 未滿足。
- 建議：teardown 即使中途 throw 也要使 ownership 狀態可確定，或 rollback 不依可能 stale 的 flags 重建；保留原錯誤且清理其餘已擁有副作用。補兩種 after-effect throw 後 resize/load 的回归驗證。只提建議，Reviewer 未修改產品。

## 逐項狀態

| Finding | 狀態 | Fresh targeted 證據及限制 |
|---|---|---|
| F1 persisted restore | CLOSED | 3 次 synthetic pagehide/pageshow：canonical/revision/src不變、投影還原、各1 load/error listener及1 projection observer；再 resize、load、S18 刪除成功，observer/callback 清除。不是實際導航命中 BFCache 的證據。 |
| F2 raw patch transaction | OPEN / P2 | 原始 partial observe、partial error-listener setup、舊 style teardown throw 三種已 PASS，candidate cleanup、原 node/位置/selection/dialog與後续resize/load/S18通過；上述舊 disconnect/removeEventListener after-effect throw 仍 FAIL。 |
| F3 reset tail rollback | CLOSED | 沿用原 querySelector refresh one-shot fault；spec/revision/CSS/frame與observer/load/error都恢復，之後 resize/load 實際 CSS 更新且 S18 可刪除。 |
| F4 standalone license | CLOSED | normal render、portable export、reopen 再 export 三份文件各恰1 license script；JSON解析全文等於原 MIT 檔、SHA256等於metadata（`4f221aee6e072336700c408c68ab3b96a3fc09f6aebe6f48f1bd99e5ef13faec`）；不僅搜尋作者姓名。 |
| F5 preview target ratio | CLOSED（code/mounted） | 真正 mountCropDialog 操作並讀 frame 寫出的 CSS尺寸与 preview img CSS：250×400、500×200兩種target，preview和confirm後img計算可見區域相同；各20次stage ResizeObserver callback無wholeSpec serialization／revision，取消ownership於close釋放。mounted double 的client尺寸從實際style getter讀回，不假稱真browser layout。 |

Spec axis：F2 failure-state 契約尚未完整。Standards axis：修復沿既有 projection record 與薄 lifecycle/attribution seam；尚有一個 ownership consistency 缺口。沒有因 focused/scoped 全綠抹除 fault probe failure。

## Fresh Reviewer vs 既有 evidence

**Fresh Reviewer：**

- `focused-files.txt` 3 實體files，明確 argv：Node `v25.9.0`、`--test --test-reporter=tap --test-concurrency=1` → **27/27**，fail/skipped=0。
- `scoped-files.txt` 17 個唯一實體files，同模式 → **339/339**，fail/skipped=0。focused 是 scoped 子集，獨立 cases 總數仍339，不相加為366。
- 自己初始 probes 改為修後 expectation＋相鄰副作用，**11組：9 PASS、2 FAIL**；兩個 FAIL 同屬 F2。結果與腳本都在此 tmp。
- Probe 首次將 dialog 的 preview observer 算入舊 projection observer，誤計2；Reviewer 已修正計數只排除同時監控 preview-stage 的dialog observer。這是測量修正，不是產品問題，修正後只有上述兩項真失敗。
- `git diff --check b364cd8 2db6185` PASS。
- 20 source＋4 protected hashes 與更新 source-hashes.json 全相符；8 個 diff paths 的 on-disk git blob 全符合固定 candidate。此8包含 ZIP及其sidecar，不代表8個source檔。
- ZIP只唯讀 bytes/hash/sidecar：**2,316,286 bytes**；SHA256 **82eb4f571ba4283572bafa404dda6888d90dae292ccb06ac536eafe3fcba3880**；一致。未開archive、重建、安裝或執行ZIP lifecycle。
- Vendor pin與四input、bundle、license實體hash仍一致。

**非 Reviewer fresh：**

- Mainline轉述27/339/972不當作Reviewer test證據；972 full本輪未執行。
- host04 existing browser receipt需另作唯讀核對；沒有自己重跑browser/PGQ。host03屬修前正常路徑，不用來證明本次修復。
- host01/02歷史NOT_PASS保留。正式host04/PGQ/Evidence visual supplement/lifecycle在此code verdict時尚未全部收齊。

所有writes僅 `/private/tmp/pptskill-core-crop-review-2db6185/`。沒有repo/git mutation、沒有browser/full/ZIP/install、沒有動Mainline程序。
