# Core2 Repair1 targeted re-review — Ramanujan

固定 candidate：`88f401c7798976babfd28df991a6ba5b6b784e4e`。
原 CODE candidate：`2bb1aafcc12694fa64a972e3bb76c9b3618d1cdd`；diagnostic HEAD：`81fd40926f2a303184e3175971b5df3d3a906943`。

**CODE：GO（僅 GL-R1、GL-R2 與 Repair regression）。新／未解 findings：P0=0、P1=0、P2=0、P3=0。GL-R1、GL-R2 均 RESOLVED。**

**Whole-card：PENDING。尚待 Mainline 提供 host06 controller／PGQ／cleanup final receipts；本報告不是 whole-card GO。** 本輪未重審其他 scope；既有 Crop F2 OPEN/P2 不計入本輪 counts，維持原狀。

## GL-R1 — RESOLVED

`runtime/component-interaction.js:291` 只在 group 設 `hideChildMoveableDefaultLines:true`，仍沿既有 pinned Moveable 與 native group events，單一元件選項不變。

唯讀核對主線 host06 `group-lock/acceptance.json`：

| viewport | receipt | SE hit | trusted events | minimum release |
|---|---|---|---|---|
| 1280×720 | 27 check records PASS | true，原生 SE control | resizeGroupStart / resizeGroup / resizeGroupEnd 全有 | -700/-200，拒絕；gesturing=false |
| 1600×900 | 27 check records PASS | true，原生 SE control | resizeGroupStart / resizeGroup / resizeGroupEnd 全有 | -700/-200，拒絕；gesturing=false |

正常 resize +124/+40 的 canonical／DOM 成員比例斷言通過。後续 lock/unlock/ungroup、export/offline reopen 通過。兩 viewport console/page/network/http/remote 各 0；27 是 receipt check records（含診斷），不是 27 個獨立 test cases。

host05 歷史 NOT_PASS 保留：handle 修復後，Moveable 到 minimum 邊界停止中途 update，先前有效 preview 被提交。新 `component-interaction.js:322–327` 在 group resize End 使用 finite release pointer 更新最後候選，再由既有 validator 決定是否提交；未新增 pointer engine。host06 對同一路徑的全 spec 不變斷言通過，status 為 minimum 拒絕。Reviewer synthetic probes 另外驗證 revision／style 不變，以及 return-to-base、最後有效 release、cancelled stale end 不復活候選。

## GL-R2 — RESOLVED（synthetic 條件）

`runtime/deck-editor.js:599` 在回復 spec/revision/rect 後，透過 `component-interaction.js:485–486` 的 `restoreProjection` 重用同一 refresh 閉包恢復 selection/target/vendor。回退次級例外不覆蓋原始 operation error。沒有加入第二份持久狀態。

- 原初審 `rollback-probe.test.mjs` **byte-for-byte 不變**，只複製到新 candidate 快照旁執行：原 1 FAIL → fresh 1 PASS。
- 舊 `review-initial/rollback-probe.tap` 的 1 FAIL 存在，hash 記錄於 receipt。
- focused 覆蓋原始 error object identity、恢復 target/selection/handle，以及 restore 已生效後再次 throw 仍保留原錯。
- 新獨立 probes 分別覆蓋 lock、unlock、ungroup、move-group、resize-group 的 after-effect rollback；檢查 canonical/revision/style/selection/target，未鎖群組恢復後能再完成 resize。
- **證據仍是 synthetic after-effect injection，沒有宣稱普通 browser 曾自然觸發此 exception。** 持續無法重建投影的 DOM/vendor 基礎設施故障不在本次已證實條件內。

## Fresh counts 與重播

| 批次 | 結果 |
|---|---:|
| focused `edx-core-2-group-lock.test.mjs` | 23 PASS |
| bounded interaction / snap / mounted-selection，3 unique files | 43 PASS |
| 原始 unchanged rollback probe | 1 PASS |
| 新 Repair regression probes | 9 PASS |
| **合計** | **76 PASS / 0 FAIL** |

均在固定 SHA tmp archive 執行，未跑 full／PGQ／browser。命令：

```sh
cd /private/tmp/pptskill-core2-review-2bb1aaf/repair1-88f401c
node --test candidate/tests/edx-core-2-group-lock.test.mjs
node --test candidate/tests/edx-wp1-s4-interaction.test.mjs candidate/tests/edx-wp1-s7-snap.test.mjs candidate/tests/edx-wp1-s8-mounted-selection.test.mjs
node --test rollback-original.test.mjs repair-regression.test.mjs
```

Logs：`focused.tap`、`scoped.tap`、`rollback-original.tap`、`repair-regression.tap`。

## Source／ZIP／browser evidence binding

- `git diff --check 2bb1aaf 88f401c` PASS；product diff 限兩個 runtime、focused test、browser harness，另有 ZIP／checksum。
- group-lock contract、deck-spec、schemas、pinned vendor 相對原 candidate 無變動。
- 8 個重點 source/test/harness/ZIP 檔與 `git show 88f401c:<path>` byte-match。
- ZIP 2,322,437 bytes；SHA256 `1f8ed872504a5a9f655a52dad2adda52d065e78288eb3d34d698475858dfa2b9`，checksum 檔一致，`unzip -t` PASS。
- ZIP 中 runtime/schema/contracts **74 個檔案全部與固定 source byte-match**；只讀 unzip 輸出，未安裝、未 build 或改 ZIP。
- host06 `group-lock-source.html` 與固定 candidate `renderFullDeck(await groupLockFixture())` **完整 byte-match**，SHA256 `fa69c33857a28f11d737a59fdaacbda3d61896884c04300ad427dc2d59b5c797`。
- host06 receipt 列出的 **38 個 artifacts** 均核對 SHA256 一致；本輪未另啟 browser，亦未宣稱圖片視覺重審。
- 詳細 hash、事件與 counts 見 `receipt.json`、`source-zip-verification.json`；host05/06 receipt 已只讀複製至本 tmp。

## Final receipts 待補

請 Mainline 原線提供 host06 controller final status、四個 affected PGQ 檔／16 unique 結果、cleanup／owned-root removal，以及 source/ZIP/protected freeze receipt。未交付前 PGQ／controller／cleanup 均列 pending，不由 browser acceptance 單獨推定全卡完成。同一 Reviewer 後續只補核這些 final evidence。

全程 repo read-only；writes 僅本 reviewer tmp。未改 source／ZIP／protected，未啟 browser／PGQ／full／install，未 merge／push／deploy。
