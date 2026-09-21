# S7 implementation Worker receipt

狀態：IMPLEMENTATION FROZEN／待 Mainline fresh browser、full non-browser、ZIP 與獨立 review。不是 production PASS／Independent GO。

Branch：codex/edx-wp1-s7。實際 HEAD 見 worker-source-hashes.json。同一 shared worktree、唯一 writer；未 commit、切 branch、安裝、開 agent／visible task、merge、push 或 deploy。未改 task、backlog、handoff、dist 或四個既有 untracked。未啟動／操作 browser；attach 測試使用 CDP double。

## 契約與實作

先讀實體 S7 task、Owner AGENTS 規則、context map 與 implementation 規則。CodeGraph 實際 query 未命中 component interaction，之後 bounded source read。已讀 S6 direction-target/decision.md、gesture-boundary/decision.md 與 probe；S6 只作架構依據，不挪用其 PASS。

8px 開關初始 off，僅記 mount closure；export clone aria-pressed 重設 false，不存 schema／localStorage。On 時 canonical box 投影至無 presentation transform 的 proxy；proxy 與 overlay 位於 slide container，proxy pointer-events:none，Moveable dragTarget 指向 visible component。Drag 僅 left/top、SE 僅 right/bottom，center/middle 明確 false；SE setFixedDirection([-1,-1])。Vendor canonical payload 轉成既有 controller 座標輸入；沒有新量化器、依賴、vendor rebuild 或第二 geometry authority。

Preview 投影 visible component 與 proxy，不提交 canonical。返回 pointer 原點送回 base，避免殘留上一筆 preview 或採用 off-grid 起始修正。S4 begin/update/finish／finite／stale revision/token／validator 保持原介面；S5 keyboard 與 guardedEscape 不變。On 的取消與失敗 release 清 selection/proxy；成功 release 維持選取並從 canonical 重投影。舊 vendor 延遲 callback 以 instance identity 擋掉。

## Changed paths

- runtime/component-interaction.js
- runtime/deck-editor.js
- tests/edx-wp1-s7-snap.test.mjs
- tests/edx-wp1-s4-managed-browser-attach.test.mjs
- tools/edx-wp1-s4-browser-acceptance.mjs
- tools/edx-wp1-s7-browser-cases.mjs
- tools/edx-wp1-s4-perf-mounted.mjs
- tools/edx-wp1-s4-perf-probe.mjs
- evidence/edx-wp1-s7/worker-*：RED/GREEN logs、focused log、on/off perf receipts、fixture-only HTML、hashes、本 receipt。

## 確切命令與結果

工作目錄：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical；Node v25.9.0，/opt/homebrew/bin/node；無安裝。

RED（production 修改前）：

```sh
node --test tests/edx-wp1-s7-snap.test.mjs > evidence/edx-wp1-s7/worker-red.log 2>&1
```

9 tests，0 pass／9 fail；當時沒有開關/proxy，control click 走原本清 selection 路徑。初版 GREEN 的 worker-green-initial.log 為9/9；擴充版 worker-green-expanded.log 為29/29。

最終 focused：

```sh
node --test tests/edx-wp1-s3-*.test.mjs tests/edx-wp1-s4-*.test.mjs tests/edx-wp1-s5-*.test.mjs tests/edx-wp1-s7-*.test.mjs > evidence/edx-wp1-s7/worker-focused.log 2>&1
```

**96 tests／96 pass／0 fail／0 skipped**，1272.453625 ms。其中 S7 31 tests；含 public commit 次數、mounted 雙 scale、多次 preview/export/reopen、零/返回、取消、stale update/release、刪除/替換、bounds/minimum/finite、SE anchor、transform 保留、keyboard/IME/input guard、舊 vendor callback、重複 destroy、payload 成本。DOM/vendor double 不驗 vendor 真量化或真 layout。

Mounted perf：

```sh
node tools/edx-wp1-s4-perf-probe.mjs evidence/edx-wp1-s7/worker-perf-off.json > evidence/edx-wp1-s7/worker-perf-off.log
node tools/edx-wp1-s4-perf-probe.mjs evidence/edx-wp1-s7/worker-perf-on.json --snap-regression > evidence/edx-wp1-s7/worker-perf-on.log
```

每組1/6/12 MiB，各 warmup 30／measured 101 updates；on/off 共606 measured updates，payloadReads／serializations／wholeSpecSerializations 每組皆0。CPU 診斷，非真 browser frame benchmark；不設虛構 ms gate。具名時間數字附於文末，完整浮點數與 source hashes 見兩份 JSON。

只產 fixture，未連 browser：

```sh
node tools/edx-wp1-s4-browser-acceptance.mjs evidence/edx-wp1-s7/worker-fixture --snap-regression --fixture-only > evidence/edx-wp1-s7/worker-fixture.log
node --check tools/edx-wp1-s7-browser-cases.mjs
node --check tools/edx-wp1-s4-browser-acceptance.mjs
git diff --check > evidence/edx-wp1-s7/worker-diff-check.log
```

上述命令 exit 0；diff-check 空輸出。Receipt 產生器曾有一次 template literal quoting SyntaxError，未執行任何寫入；改用 apply_patch 寫本文件，不影響 production 或測試結果。

## 取消副作用與證據

| 觸發 | 狀態處理 | 證據 |
| --- | --- | --- |
| toggle | cancel/restore → stopDrag → destroy/清引用 → 以新設定 bind | S7 mounted toggle；browser 待跑 |
| Escape、pointercancel、blur、scroll、resize、mode/text、selection | cancel/restore；on 清 selection/proxy/control/overlay | mounted 與 S5 guard；browser 待跑 |
| stale update/release、刪除、replacement | 不提交；清 vendor/proxy；observer disconnect | mounted source-evidence |
| destroy/repeat destroy | setMode(false)，清 vendor/proxy/overlay/observer，移除 document/window listeners | mounted repeat teardown |
| 舊 vendor 延遲 end | instance identity 不符即忽略，不提交新 gesture | S7 專項 test |

## Mainline 執行入口（尚未執行）

在 Mainline 已持有且完成容量／生命週期前置的 browser/profile 上執行；沿 S4 attach-only，不 spawn，不關別人的 browser：

```sh
PPTSKILL_DEVTOOLS_ACTIVE_PORT="<Mainline-owned DevToolsActivePort 絕對路徑>" node tools/edx-wp1-s4-browser-acceptance.mjs evidence/edx-wp1-s7/mainline-browser --snap-regression --keyboard-regression --motion-regression --perf-regression
```

S4 外層1280×720／1600×900真 mouse controls與 pointer。S7新增 on/off drag/SE 正/負/零/多 preview/返回原點、preview export、bounds/minimum、Escape及明確標記 synthetic 的 pointercancel/viewport等生命週期事件、toggle/text/selection/stale、keyboard 1/10px／input／modifier／IME、offline reopen、三個既有 treatment × normal/reduced/static motion 與 export/reopen、重複 destroy。S4 外層收集 console/page/network/HTTP/remote errors 並要求各0；finally 關 owned target。Profile／browser supervisor cleanup 仍由 Mainline 負責，不能將 targetClosed 當完整 profile cleanup。

## 風險與 freeze

尚未有本 production candidate 的 fresh browser 證據。真 vendor 動態方向、dragTarget hit routing、兩 viewport layout、motion中的真 pointer、destroy callback時序及 offline export/reopen 必須由上述 harness 實測；mounted tests 不能替代。Browser cases 僅語法／attach failure cleanup 驗證，尚無成功 browser receipt。full non-browser／ZIP lifecycle/hash 依 Owner 明令留 Mainline，未執行。geometry/motion implementation 檔未改，但本卡改變 preview/hit-routing seam，不能僅沿用 PGQ28 宣稱本卡 browser PASS。

worker-source-hashes.json 包含8個 changed source hashes、fixture hash、vendor 與 S6 完全相同的 hash。四個既有 untracked 僅記錄目前 hash，未假稱有本 session 的 before hash 對照。Tracked diff 範圍檢查僅上述授權檔案。

**FREEZE：receipt 與 hashes 完成後，Worker 停止寫入；所有待驗項交 Mainline。**

## 最終 mounted CPU 數字（ms）

| snap | MiB | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| off | 1 | 0.057125 | 0.110958 | 0.264875 |
| off | 6 | 0.075541 | 0.086167 | 0.110916 |
| off | 12 | 0.060708 | 0.079666 | 0.158708 |
| on | 1 | 0.074708 | 0.140375 | 0.255083 |
| on | 6 | 0.096167 | 0.151750 | 0.270833 |
| on | 12 | 0.082958 | 0.095750 | 0.201250 |
