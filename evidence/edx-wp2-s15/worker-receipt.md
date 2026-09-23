# PPTSKILL S15 Worker receipt

狀態：STOP WRITING。Worker 交付，不是 Independent GO。

## Product paths

- `/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/runtime/deck-editor.js` sha256=d1f5ca61e2cededd8f31c08caab525cb947a19b17a5990199f0622d53703ff35
- `/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/tests/edx-wp2-s15-insert-text-ui.test.mjs` sha256=0f3460311815863b85c6e8016f65aa7a457b9e2a5cfc7f7b7e64d0c7d6e7f1c1
- `/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/tools/edx-wp2-s15-browser-cases.mjs` sha256=64fbb17dd778c6e02b592fa40ae923abea8080784fe26f32dac313424b95b05c
- `/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/tools/edx-wp1-s4-browser-acceptance.mjs` sha256=08ce88510ecb37dccd503209937ad8aa35cc4a16360d488daf52583de5a681cb
- `/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/tools/edx-wp1-s4-perf-mounted.mjs` sha256=7cdfa94aaacba160ff93b3afe5b0ed02209cd7e0fda4dff58774b79ad9f5a8f4

- `/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/tests/edx-wp2-s12-image-paste.test.mjs` sha256=20aa73a6bcb122a8044019ed083b6b8dde0bd19a57ed72de9464ee5f3b86259f
## 驗證與原始紀錄

| 命令批次 | tests | pass | fail | raw log |
|---|---:|---:|---:|---|
| pptskill-s15-red | 22 | 0 | 22 | /private/tmp/pptskill-s15-red.log |
| pptskill-s15-green1 | 22 | 22 | 0 | /private/tmp/pptskill-s15-green1.log |
| pptskill-s15-scoped1 | 145 | 144 | 1 | /private/tmp/pptskill-s15-scoped1.log |
| pptskill-s15-scoped2 | 145 | 144 | 1 | /private/tmp/pptskill-s15-scoped2.log |
| pptskill-s15-scoped3 | 145 | 145 | 0 | /private/tmp/pptskill-s15-scoped3.log |
| pptskill-s15-scoped4 | 149 | 149 | 0 | /private/tmp/pptskill-s15-scoped4.log |
| pptskill-s15-ime-red | 26 | 25 | 1 | /private/tmp/pptskill-s15-ime-red.log |
| pptskill-s15-scoped-ime-green | 149 | 149 | 0 | /private/tmp/pptskill-s15-scoped-ime-green.log |

完整逐命令與 counts：`/private/tmp/pptskill-s15-receipt.json`。syntax/diff check 全 exit 0；未執行 browser runner。
先前 scoped：`/private/tmp/pptskill-s15-scoped-ime-green.log`（149/149，S15 26 tests）；目前 authoritative 見 repair1。
review patch 含兩個 untracked 新檔：`/private/tmp/pptskill-s15-review.patch`。

## 實作

沿 S13 精確 insert-element、submit 現讀 first-free ID；native dialog 控制 identity/draft，保留空白/non-NFC/Unicode codepoints。失效、cancel、invalid、IME、showModal throw、reentrant submit、gesture 與 chooser 互斥都有 mounted 覆蓋。
IME correction：不攔 keydown 預設行為；synthetic isComposing Escape 未被 preventDefault，組字期間 native cancel 才阻止關閉。
DOM double 薄補原因：原先無 insertAdjacentHTML／showModal／close／focus；只補 native controls 測試入口，既有 assertions 無弱化。
新 --insert-text-ui-regression 只增加 base10＋S15；listener 仍在 navigate 前，既有 console/page/network/HTTP/remote0、targetClosed gate 保留。
browser cases 含真 pointer/UI/CDP Input.insertText、Enter/Escape、synthetic IME／stale／fault、chooser、preview cancel、export draft、offline UI insert/cancel/S14 API edit/move/resize 與 toolbar/dialog 截圖。這些是待執行 cases，不是已取得 browser 證據。

## 邊界與失敗進展

- RED 22 fail：S15 markup/control 尚不存在。
- scoped1 S6 marker teardown fail：新 dialog 永久 chrome marker 不符既有 play cleanup；改為 layout lifecycle ownership。
- scoped2 S6 已過、S15 cancel selection 新失敗：close 當場移除 marker 讓尾隨 click 清 selection；layout 期間保留 ownership，play 再清。
- scoped3 145/145；增加四個邊界測試後 scoped4 149/149。
- Mainline IME 契約核對：ime-red 25/26，移除 keydown preventDefault/stopImmediatePropagation；保留 dialog cancel guard，scoped-ime-green 149/149。

## Known limits

- 未啟動／attach browser；desktop1280/1600、native inert/focus、CDP chooser、offline UI、真 pointer move/resize 待 Mainline 執行。
- CompositionEvent/KeyboardEvent 為 synthetic；不宣稱 OS IME。mounted double 僅邏輯，不模擬原生 inert、完整事件傳播或排版。
- 未跑 full/build/probe/fresh ZIP/PGQ/Independent review；固定 geometry 不保證避障或自動縮字。
- 20MiB authority 未修改；本 Worker 未重跑真大型 HTML size gate。
- 非獨立 GO；shared tree 的 Mainline control/evidence 不屬 Worker 交付。

PNG artifact metadata：已補 bytes/sha256；browser-syntax-artifact 與 diff-check-artifact 均 exit 0。

## Bounded repair1 最終交付

STOP WRITING。原 FAIL 保留；未執行第二 repair 代。

- 修改：runtime/deck-editor.js、tests/edx-wp2-s15-insert-text-ui.test.mjs、tests/edx-wp2-s12-image-paste.test.mjs。累計 product paths 為 6。
- UI bootstrap 僅有既有 editor DOM 時補 dialog；API VM 不新增 UI authority。
- pointerdown 綁專用 button，S7 document listener teardown 不變；S15 synthetic button pointerdown 仍驗 click 前取消 gesture。
- S12 fixture reuse mounted toolbar；既有 assertions 無弱化。
- RED：103 tests / 96 pass / 7 fail，/private/tmp/pptskill-s15-repair1-red.log。
- GREEN：252 tests / 252 pass / 0 fail，/private/tmp/pptskill-s15-repair1-green.log（原 scoped＋WP1S3 bounded geometry、WP1S7 cancel-click、WP2S12 image-paste）。
- diff-check / runtime syntax：各 exit 0；/private/tmp/pptskill-s15-repair1-diff-check.log、/private/tmp/pptskill-s15-repair1-runtime-syntax.log。
- 未 full/browser/build/probe/ZIP；真 pointer/native modal 與 Independent acceptance 留 Mainline。
