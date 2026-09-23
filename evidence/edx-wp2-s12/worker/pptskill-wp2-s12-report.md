# PPTSKILL S12 Worker 交接

狀態：STOP WRITING。Worker 實作與卡列 scoped 驗證完成；非 Mainline GO／Independent Review 結論。

Repo：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical
Branch：codex/edx-wp2-s12-image-paste
工作起訖 HEAD：bd4126a9b92b55178af3d716a512c93b984a9d41（未 commit／branch／push）
規則：已讀實體 tasks/edx-wp2-s12-image-paste.md、compiled_lite、devflow_context_map、coding/browser 規則與 toolchain_paths。CodeGraph 已 query insertionTarget/insertionOptions/insertionSlide/insertionBusy/drop/composingText，但回不相關 renderer symbol，之後使用精確 rg。pptskill SKILL 為產出簡報工作流，本次 runtime 功能實作未套用 deck 產出流程。

## 實作
- document paste 薄 adapter；先判 mode/defaultPrevented/IME、target 與 activeElement 輸入 ownership，再驗 connected deck/slide 或 currentId；沿既有 insertionSlide 唯一 identity。
- FileList 唯一 File authority；items/types 只辨識 marker。不讀文字、URI、HTML、OS clipboard，不新增 optimizer/MIME/asset authority。
- 沿 S10/S11 insertionTarget/insertionOptions 與同一 insertionBusy，cancel('image-paste') 後捕捉 slide，單次 insertImageFile；保留其他 async state 與較晚 S6 chooser。
- 新測試只補自身 fixture 的 editor nav 容器；共用 mounted helper 與全部舊 assertions 原封不動。
- browser runner --image-paste-regression 依序 S10 chooser → S11 drop → S12；保留 runner 1280×720／1600×900、error/http/remote 與 targetClosed gates。
- S12 harness 明列 synthetic ClipboardEvent/DataTransfer/File（isTrusted=false），準備真 optimizer decode 3×2、DOM geometry/roots、current/cross/empty、gesture snap false/true、captured target、mode/input/IME、busy/chooser、reject、export/offline、new-image/toolbar 截圖；empty file marker 特例覆寫 synthetic DataTransfer.types 以可重現 guard。

## 驗證與失敗歷史
- RED：59 tests，34 pass／25 fail，exit 1；當時 product 尚無 paste adapter，保留原始 red.log。
- GREEN 首次：59 tests，57 pass／2 fail，exit 1，保留 green-1.log。toolbar case 的 mounted fixture 缺實際 nav 父容器；IME case 先切 layout 導致既有 setEdit 清 composingText。修正新 fixture 容器與改用 compositionstart 後 assert export 拒絕來證明 IME，未修改產品既有 mode policy、未放寬舊 assertions。
- GREEN 第二次：59/59 pass，exit 0。
- 增補 5 個拒絕不取消 gesture、2 個 async mode 持續完成案例；最終 S12 66 tests。
- 最終 scoped：9 支精確檔名、236/236 pass、0 fail/skip/cancel。未跑 glob/full/browser/Chrome/ZIP/build/PGQ。
- 4 個檔案 syntax check、git diff --check 均 exit 0。
- fixture-only 成功；另確認 3 個 slide IDs、空頁 components 0、inline paste listener 存在（3 checks）。此為 fixture 準備，沒有 browser 執行。

## 修改檔案與 SHA256
- runtime/deck-editor.js
  - bytes: 79881
  - final SHA256: 1b6aa89740042930178db333728e0cfe8e9d2beddb7d1e394a56b0a3e41484dd
  - HEAD SHA256: f4effb516c48acabcfa0cade8cf11a6885e2f81e16867e89d7f5393432741310
- tests/edx-wp2-s12-image-paste.test.mjs
  - bytes: 16718
  - final SHA256: d3045a25b14abeef7e99f9eb4286fed8e417cbb128b1d2ce1b769e07b7ec21f8
  - HEAD SHA256: 新檔，無 HEAD 版本
- tools/edx-wp2-s12-browser-cases.mjs
  - bytes: 14868
  - final SHA256: 0057262a4ab1231ca1f734d2f039ccef6ddc1a52a98f9bce95c6053d1bfe5d4c
  - HEAD SHA256: 新檔，無 HEAD 版本
- tools/edx-wp1-s4-browser-acceptance.mjs
  - bytes: 23161
  - final SHA256: 0c01fda9d4246c835a0707b900105d0029fb99c29f1d1ffa75fb74066178cf6a
  - HEAD SHA256: 0d16f8d81911eeab5011c5d805f45589b8d16f5fefb0a4f6a12671cd11855e21

fixture SHA256：1d377ad2fbb3de7ca174437f39da1dba5001b5cf2f0c2454c910ab291632e4d7
Node：v25.9.0，/opt/homebrew/Cellar/node/25.9.0_3/bin/node

## 每項驗證命令 exit／count／log
- red：exit 1；ℹ tests 59 / ℹ pass 34 / ℹ fail 25 / ℹ cancelled 0 / ℹ skipped 0
  - command: node --test tests/edx-wp2-s12-image-paste.test.mjs
  - log: /private/tmp/pptskill-wp2-s12-red.log
- green-1：exit 1；# tests 59 / # pass 57 / # fail 2 / # cancelled 0 / # skipped 0
  - command: node --test --test-reporter=tap tests/edx-wp2-s12-image-paste.test.mjs
  - log: /private/tmp/pptskill-wp2-s12-green-1.log
- green-2：exit 0；# tests 59 / # pass 59 / # fail 0 / # cancelled 0 / # skipped 0
  - command: node --test --test-reporter=tap tests/edx-wp2-s12-image-paste.test.mjs
  - log: /private/tmp/pptskill-wp2-s12-green-2.log
- harness-check：exit 0；非 test 命令，test count=N/A
  - command: node --check tools/edx-wp2-s12-browser-cases.mjs
  - log: /private/tmp/pptskill-wp2-s12-harness-check.log
- scoped：exit 0；# tests 236 / # pass 236 / # fail 0 / # cancelled 0 / # skipped 0
  - command: node --test --test-reporter=tap tests/edx-wp2-s12-image-paste.test.mjs tests/edx-wp2-s11-image-drop.test.mjs tests/edx-wp2-s10-insert-image-ui.test.mjs tests/edx-wp2-s9-insert-image-file.test.mjs tests/edx-wp2-s6-selected-image-ui.test.mjs tests/edx-wp2-s7-selected-image-fit.test.mjs tests/edx-wp2-s1-direct-text-edit.test.mjs tests/edx-wp1-s5-keyboard.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs
  - log: /private/tmp/pptskill-wp2-s12-scoped.log
- fixture：exit 0；非 test 命令，test count=N/A
  - command: node tools/edx-wp1-s4-browser-acceptance.mjs /private/tmp/pptskill-wp2-s12-fixture --image-paste-regression --fixture-only
  - log: /private/tmp/pptskill-wp2-s12-fixture.log
- scoped-final：exit 0；# tests 236 / # pass 236 / # fail 0 / # cancelled 0 / # skipped 0
  - command: node --test --test-reporter=tap tests/edx-wp2-s12-image-paste.test.mjs tests/edx-wp2-s11-image-drop.test.mjs tests/edx-wp2-s10-insert-image-ui.test.mjs tests/edx-wp2-s9-insert-image-file.test.mjs tests/edx-wp2-s6-selected-image-ui.test.mjs tests/edx-wp2-s7-selected-image-fit.test.mjs tests/edx-wp2-s1-direct-text-edit.test.mjs tests/edx-wp1-s5-keyboard.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs
  - log: /private/tmp/pptskill-wp2-s12-scoped-final.log
- diff-check：exit 0；非 test 命令，test count=N/A
  - command: git diff --check
  - log: /private/tmp/pptskill-wp2-s12-diff-check.log
- editor-check：exit 0；非 test 命令，test count=N/A
  - command: node --check runtime/deck-editor.js
  - log: /private/tmp/pptskill-wp2-s12-editor-check.log
- tests-check：exit 0；非 test 命令，test count=N/A
  - command: node --check tests/edx-wp2-s12-image-paste.test.mjs
  - log: /private/tmp/pptskill-wp2-s12-tests-check.log
- harness-final-check：exit 0；非 test 命令，test count=N/A
  - command: node --check tools/edx-wp2-s12-browser-cases.mjs
  - log: /private/tmp/pptskill-wp2-s12-harness-final-check.log
- runner-check：exit 0；非 test 命令，test count=N/A
  - command: node --check tools/edx-wp1-s4-browser-acceptance.mjs
  - log: /private/tmp/pptskill-wp2-s12-runner-check.log
- fixture-final：exit 0；非 test 命令，test count=N/A
  - command: node tools/edx-wp1-s4-browser-acceptance.mjs /private/tmp/pptskill-wp2-s12-fixture --image-paste-regression --fixture-only
  - log: /private/tmp/pptskill-wp2-s12-fixture-final.log
- fixture-check：exit 0；3 checks
  - command: node /private/tmp/pptskill-wp2-s12-fixture-check.mjs
  - log: /private/tmp/pptskill-wp2-s12-fixture-check.log
- final-status：exit 0；非 test 命令，test count=N/A
  - command: git status --short
  - log: /private/tmp/pptskill-wp2-s12-final-status.log
- hashes：exit 0；非 test 命令，test count=N/A
  - command: node /private/tmp/pptskill-wp2-s12-hashes.mjs
  - log: /private/tmp/pptskill-wp2-s12-hashes.log

commands：/private/tmp/pptskill-wp2-s12-commands.jsonl
source hashes：/private/tmp/pptskill-wp2-s12-source-hashes.json
測試 logs 包含每個 subtest 的結果，不只總數；RED 與中間 FAIL 均保存。
探索／讀取／寫入準備命令未透過 test wrapper；本 session 工具回執均 exit 0、test count=N/A，CodeGraph 回傳無相關符號。未將探索宣稱為測試通過。

## Scope 與待主線驗收
- Worker 只改上列 4 檔；沒有改 control/evidence/protected、沒有修改共用 mounted helper。
- 初始已有 .DS_Store、CLAUDE.md、兩份 HANDOFF untracked；終態另見 Mainline 的 evidence/edx-wp2-s12/ 與 tasks/edx-wp2-s12-host-acceptance.md，均非本 Worker 寫入，未清理或修改。
- 回退只需移除本次 runtime 4 行新增 adapter、runner 新 import/flag 分支，以及兩個新檔；勿整庫 reset 或影響 Mainline control/evidence。
- Mainline 接手讀 diff/hash 後，依卡做正式 managed host 雙 viewport、full nonbrowser、ZIP lifecycle/bytes delta、affected PGQ、cleanup 與獨立 review。
- Browser harness 尚未在真 browser 執行，syntax/fixture 成功不代表 browser pass。OS clipboard 與 Cmd/Ctrl+V 未測，也沒有讀寫系統 clipboard。

STOP WRITING；未授權範圍不再補修。
