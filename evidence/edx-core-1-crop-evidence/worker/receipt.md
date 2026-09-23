# 核心 1/6 Crop Worker implementation 交接

2026-09-24；同一卡，已停止 repo write，等待 Mainline。
Repo：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical

## 已交付的產品行為

- `crop-image`／`reset-image-crop` registry＋Node/portable shared exact contract。
- canonical crop 為純 normalized rect；imageSafety 獨立保存 classification／protectedRect／reviewDigest。
- digest=SHA256 UTF8 JSON 固定 tuple `[dataUri,crop??null,classification,protectedRect??null]`，rect 固定欄位順序；cache 只在冷路徑建立。native Node crypto 與 noble portable parity。
- CSS width/height/position/clip-path 投影，不改原 img src，不碰 figure motion transform。ResizeObserver 只讀已驗小 snapshot；失敗 candidate 不發布到 observer，rollback 還原 DOM/canonical/revision。
- Evidence 必須 contain＋人工 protectedRect＋確認；reset 保留 safety、移除 crop、重新確認 null-crop tuple。無 crop reset no-op。S7／replace／patch／import 的 Evidence cover 拒絕。
- source／crop／classification／protectedRect 改變且舊 digest 失配時保留意圖，full-image contain 並提示待重確認；不增加來源 history。
- 原生 number/range、完整原圖與結果 preview、保護 overlay、確認、取消、Escape、busy／stale／decode／切頁／selection／S18 delete 競態。
- export 清 crop chrome 與 live CSS projection，重開由 canonical 重新投影；duplicate 重建 projection ownership，刪頁清理 load callback。

## 實際改檔

修改 8 檔：
- runtime/deck-editor.js
- runtime/deck-spec.js
- runtime/full-deck-renderer.js
- schemas/deck-spec.schema.json
- tools/edx-wp1-s4-browser-acceptance.mjs
- tools/edx-wp1-s4-perf-mounted.mjs
- tests/edx-wp1-s2-stable-identity-operation-path.test.mjs
- tests/edx-wp1-s3-bounded-geometry.test.mjs

新增 10 檔：
- runtime/image-crop.js
- runtime/crop-hash-vendor.js
- runtime/vendor/crop-hash-2.0.1.iife.js
- runtime/vendor/crop-hash-LICENSE.md
- runtime/vendor/crop-hash-vendor.json
- tools/build-crop-hash-vendor.mjs
- tools/edx-core-crop-browser-cases.mjs
- tests/edx-core-crop.test.mjs
- tests/edx-core-crop-ui.test.mjs
- tests/edx-core-crop-fixture.test.mjs

兩支舊 exact operation list 只增加 crop-image、reset-image-crop literal；未放寬 assertions。perf-mounted 只補可注入的真 TextEncoder API，未改現有成本 counters。
主線既有 package.json／pnpm-lock.yaml／tasks／evidence 變更保留未碰；未寫 protected／S18 evidence／AI Core／dist，未 commit/push/merge。

## 最終驗證與 logs

Focused：19/19 PASS，3 個實體 files：
- tests/edx-core-crop.test.mjs
- tests/edx-core-crop-ui.test.mjs
- tests/edx-core-crop-fixture.test.mjs

log：`/private/tmp/pptskill-core-crop-worker-focused-final.log`

Fresh scoped：331/331 PASS，17 個實體 files（包含上述 3 檔），另 14 檔：
- tests/edx-wp2-s4-replace-asset.test.mjs
- tests/edx-wp1-s2-stable-identity-operation-path.test.mjs
- tests/edx-wp1-s3-bounded-geometry.test.mjs
- tests/edx-wp2-s6-selected-image-ui.test.mjs
- tests/edx-wp2-s7-selected-image-fit.test.mjs
- tests/edx-wp2-s15-insert-text-ui.test.mjs
- tests/edx-wp2-s16-edit-text-ui.test.mjs
- tests/edx-wp2-s17-text-double-click.test.mjs
- tests/edx-wp2-s18-delete-element.test.mjs
- tests/edx-wp1-s4-perf.test.mjs
- tests/edx-wp1-s1-export-cleanup.test.mjs
- tests/p0-r1-deck-spec.test.mjs
- tests/p0-r5-full-deck-renderer.test.mjs
- tests/p0-r7-editor-export.test.mjs

log：`/private/tmp/pptskill-core-crop-worker-scoped-final.log`
`node --check`：image-crop.js、deck-editor.js、browser cases 通過。
`git diff --check -- runtime tools schemas tests` 通過（無輸出）。

## RED／失敗歷史（均已解決）

1. 最初 RED 缺 `runtime/image-crop.js`：`pptskill-core-crop-worker-red.log`。這是主線 pause 前的舊 nested/source-only 測試，不拿它當新 tuple 行為證據。
2. pin bundle builder 初期遇 symlink 實體路徑邊界與虛擬 stdin entry 被誤當檔案；改 realpath 並排除虛擬 entry，最後成功。最終 vendor log 保存 metadata：`pptskill-core-crop-worker-vendor.log`。沒有 install。
3. `focus-01.log` 舊測試仍查 reviewedSource／sourceDigest，依 Mainline 更新為獨立 safety／tuple。
4. `focus-02.log` style failure 測試在 Proxy style 上覆寫 method 不會真的覆寫；改用真方法委派的 style double 注入 before/after throw，測試未放寬。
5. `scoped-01.log` 兩個 exact operation lists 未加兩個新 literal；舊 minimal VM 無 dialog。補 literal，無 dialog 時不 mount UI；scoped-02 為 47/47。
6. `focused-03/04/05/06.log` UI 真正找出的 malformed option markup、crop button ownership 與 dialog closure；修正 `<option>` 標記，crop control marker 僅 layout 期間存在。async decode 測試改等待事件迴圈完成而非猜 microtask 次數。
7. `scoped-03.log` S6 play teardown 殘留新 control marker（273/274），修正 mode-off cleanup；focused-06 同時驗 S6，僅餘 decode promise 等待測試，後續 focused-07 已全綠。
8. 一次本機批次編輯 script 誤對 const 重新賦值，停在 browser cases 擴充之前；已用定點 patch 補入，未影響當時已通過的 330 scoped。最終 browser syntax／fixture 與 331 scoped 皆成功。

所有上述 log 前綴都是 `/private/tmp/pptskill-core-crop-worker-`；不存在尚未解決的 failing test。

## Vendor／browser fixture／Mainline 執行入口

SHA256 bundle：4,903 bytes，@noble/hashes 2.0.1 MIT；pin/integrity、4 個 input hashes/bytes、license hash、bundle hash/bytes 已在 vendor metadata。20MiB／UTF8／surrogate 與 Node crypto parity PASS。

本次只執行：
```sh
node tools/edx-wp1-s4-browser-acceptance.mjs /private/tmp/pptskill-core-crop-worker-fixture --crop-regression --fixture-only
```
輸出：`/private/tmp/pptskill-core-crop-worker-fixture/source.html`，600,493 bytes。
log：`/private/tmp/pptskill-core-crop-worker-fixture.log`。

正式 host 由 Mainline 提供自己 owned 的 DevToolsActivePort：
```sh
PPTSKILL_DEVTOOLS_ACTIVE_PORT='<Mainline-owned DevToolsActivePort>' node tools/edx-wp1-s4-browser-acceptance.mjs '<Mainline output directory>' --crop-regression
```
此 branch 僅 base10＋Crop，不可合併其他 --*-regression。工具只 attach，不 launch；既有 harness 擔任 errors0 與 owned target finally close。兩 viewport 1280×720／1600×900。

browser cases 已包含：六色含 AXIS／軸線的橫直 PNG、真 screenshot pixel oracle（明列 edge exclusions）、confirm/reset／Evidence 拒絕、same-size replace pending／raw crop pending／重確認、不同 frame 比例、decorative cover、export/offline reopen、style throw 後 resize pixel 回驗、切頁、S18 late decode/delete。range pointer、number keyboard、confirm 按鈕走真 CDP；其餘用途／數值設定與負例有明示 API 驅動。browser cases 尚未執行。

## 能力界線／交主線

- Worker 沒有跑 browser、full regression、ZIP lifecycle 或 host acceptance；原型 8cases/216pixels 不冒稱本產品證據。
- 本次自驗為 nonbrowser contract／mounted API／PNG 結構與數學，不是 rasterizer／真 pointer 驗收。
- browser fixture 僅 PNG；GIF／SVG／JPEG／WebP 的 decoder／動畫行為未驗。產品保留 src、不重編碼，不因此宣稱各格式已通過。
- ZIP byte delta、fresh packaging、正式 host acceptance、受影響 PGQ 由 Mainline 接續。
- 若正式 browser 出現 failure，以該 failing case 返回同一卡修正；本次沒有新 blocker。
