# Core2 獨立唯讀產品 Review

固定 candidate：`2bb1aafcc12694fa64a972e3bb76c9b3618d1cdd`。
Base：`a3fd195a4a4c5b33ccbe4cccd3c2a8f121c93889`。

**CODE verdict：REQUEST_CHANGES。Whole-card：BLOCKED / BROWSER_PENDING，不給 GO。**
P0=0、P1=1、P2=1、P3=0。主線裁決並決定是否修復，Reviewer 未改 candidate。

## GL-R1 — P1：群組 SE handle 被子 Moveable 邊線遮擋

- 位置：`runtime/component-interaction.js:286–292`，主要定位 line 291。
- 實際 native group 以多個 nodes 為 target，但未隱藏 child default lines。主線 host04 在 1280×720 完成 marquee/group/drag/preview export 後，SE handle 的 14×14 中心 (640,424) 被 `DIV.moveable-line.moveable-direction` 命中。
- trusted resize +124/+40 沒有 resizeGroupStart/update/end；trace 只有先前 dragGroupEnd。文字 canonical 維持 `{x:180,y:330,width:240,height:120}`，預期 width/height 288/144。群組 resize 是本卡主要產品路徑，故 P1。
- 證據：主線 `evidence/edx-core-2-group-lock/host-acceptance-04/group-lock/acceptance.json`，本 tmp 保存 `host04-acceptance-readonly-copy.json`。Reviewer 已唯讀核對 hit、trace、canonical assertion 及五類 errors 均 0；並非 Reviewer fresh browser。
- 主線診斷 harness commit `81fd40926f2a303184e3175971b5df3d3a906943` 相對 candidate 只改 `tools/edx-core-2-group-lock-browser-cases.mjs`；本輪 runtime/schema 固定 candidate。
- 建議：group only 使用既有 pinned vendor 的 `hideChildMoveableDefaultLines:true`，由主線以 native hit-test＋resizeGroup events＋canonical/DOM 比例重播。不能只以 VM event mapping PASS 關閉。
- Replay：沿既有正式 `--group-lock-regression` 流程進行 layout → marquee → group → drag → SE resize；本輪沒有自行啟 browser。

## GL-R2 — P2：refresh 已生效後的 exception 留下錯誤互動投影

- 位置：`runtime/deck-editor.js:598–599`。
- `commitGroup` 暫設新 spec/revision 後呼叫 layout.refresh；catch 只還原 spec/revision/成員 style、geometry。若 refresh 已根據 locked candidate 移除 handles/target，接著才拋錯，catch 沒有恢復原互動投影。
- 獨立 synthetic replay：選取未鎖群組 → 包裝既有 `layout.refresh`，先呼叫 original 再 throw → 執行 lock-elements。
- 實測：operation 拋錯；canonical 與 revision 正確 rollback；selection 仍是兩個成員，但 layout target 從完整群組變成 null、vendor 已 destroyed。鎖定沒成立，原先可用的 handle/nudge 卻遺失，需重新選取或 refresh 才恢復。
- **證據限制：這是 after-effect exception 故障注入；未證明普通 browser 必然或自然觸發。不是一般 lock 操作必壞，也沒有 canonical 持久化損毀。** P2 conditional residual，請主線裁決，不因這一點單獨升格成 P1。
- 建議：在回退 canonical 後恢復互動投影，並明確界定 refresh 的例外邊界；不新增 second state/history。
- Replay（預期目前 1 FAIL）：`cd /private/tmp/pptskill-core2-review-2bb1aaf && node --test rollback-probe.test.mjs`。
- 精確程式：`rollback-probe.test.mjs:7`，log `rollback-probe.tap`。

## Fresh 驗證

| 批次 | 結果 | 邊界 |
|---|---:|---|
| focused 原測試 | 20 PASS | 固定 SHA tmp 快照 |
| scoped 原測試，9 unique files | 214 PASS | S8/S9/S10/S11、crop、crop UI、replace asset、S14、S16 |
| 自設 bounded probes | 13 PASS | Node / portable VM synthetic |
| rollback after-effect probe | 1 FAIL | GL-R2，synthetic |
| 合計 | 247 PASS / 1 FAIL | 非 browser/full/PGQ/ZIP |

Scoped 首輪 164 PASS＋3 file-load failures，原因是 Reviewer tmp archive 少複製 `design/materials/golden-design-grammar.v1.json`；不是 candidate 行為失敗。補入同 SHA design/themes/contracts 後，只重播三個未載入檔案，50 PASS。原始 `scoped.tap` 保留，後續 `scoped-replay.tap` 保留，不抹去首輪失敗。

完整 9 檔名清單在 `receipt.json`。Focused 與 scoped 共 10 個既有 unique test files，自設 2 個 probe files。固定六個重點 source/schema/test 的 byte hash 已與 git show candidate 比對一致。`git diff --check base candidate` exit 0。

自設 probes 覆蓋：未鎖 group 的指定 edit/replace 保留 membership；孤立 transform/delete 拒絕；全組 target 次序/no-op revision；跨頁未知 target；cross-realm own-data payload；clone isolation；無 geometry 的 singleton lock/unlock；raw patch；composition/content patch 保護及其他元件正常 patch；metadata descriptor/getter/sparse/symbol/prototype/部分 lock；async optimizer busy 與 locked late submit；gesture preview export／stale revision；Node/portable descriptors parity。

靜態核對：同一 composition authority、schema 新欄位與 deterministic semantic validator、exact own-data payload、同頁 independent text/image、group membership/geometry guards、UI selection 整組展開、Moveable 原生 group event routing、取消與 stale guards、export cleanup、slide duplicate metadata clone。沒有把 source/VM 視為 trusted browser 驗收。

## 留給原線 targeted re-review

1. 主線處理 GL-R1，提交新 candidate；核對最小 diff 與原 pinned vendor，重播 group resize/hit/native events，雙 viewport 及後續 lock/unlock/ungroup/export/reopen 正式證據仍須補齊。
2. GL-R2 由主線決定修復或明示保留 residual；如修復，只做 targeted fault/recovery regression，勿抹掉本輪 FAIL。
3. 既有 Crop F2 OPEN/P2 原樣保留，與 GL-R2 是不同 finding，不列新 repair scope。
4. 本卡不要求群組 8px snap；disabled/title 已核對。不要求 scene graph、第二 state/history。
5. repo/ZIP/protected 未修改；writes 僅此 tmp；未啟 browser、PGQ、full、install、merge、push。browser/full 最終狀態仍由主線 evidence 提供，再由同一 Reviewer 原線核對。
