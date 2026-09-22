# WP2-S6 Worker scoped 交付

狀態：scoped 完成；stopped writing。不是 review candidate。無 contract fork。

來源 HEAD：33a41590067b1f66fd942ed0a62ccc529506eabf
Branch：codex/edx-wp2-s6-selected-image-ui
契約：tasks/edx-wp2-s6-selected-image-ui.md（完整讀取）；SHA256 54e193e3ea08ff6d5043e940ba44d3cad089f5fcf696f69c2cc78f164f6dd09a

## 實作

- 沿既有 selection.getState/currentId/resolved stable identity 判定單選 image，無第二 selection authority。
- 薄 onSelectionChange reason 區分 refresh/natural blur 與 clear/selection intent；natural blur 即使 snap=true 仍保留 pending target。
- 短命 pending 只存 slideId/elementId；chooser 尚未消耗前不再開第二個 chooser，以免同一 input 的結果被後次 target 覆蓋。顯式意圖會失效 target；cancel/change 解鎖。
- change 先消耗 target、file 與清空 value 再 await S5；後次 picker 不改前次 async target。
- picker pointerdown 先停止 gesture，保留選取與按鈕位置；click 才 capture/open。
- export 沿 editor-chrome cleanup 移除 toolbar/input，boot 沿既有 toolbar 注入方式復原；無新增 dependency/schema。

## 改檔 SHA256

- runtime/component-interaction.js — 6c7c0da2a9e869390a96a2152cdc4badd0319a1866f2bd9bdd0b1ace7435388d
- runtime/deck-editor.js — 0466244829b940b12dcbbdce0b6ffbdefc089b6f2dd1a4a4f54ed1ac9e97279d
- tests/edx-wp2-s6-selected-image-ui.test.mjs — 0d60b289a2fa95a39439245d8af39603d0f85442220eb3c8fcab182d52f786e7
- tools/edx-wp1-s4-perf-mounted.mjs — fef46b96ea353e4a277aef1061cc4833a869807c21e55005a10122882da62d6c
- tools/edx-wp1-s4-browser-acceptance.mjs — 540ee613f0f04db99b56f720f944007d600ccf1fdcedb60b6d21c95e7af04417
- tools/edx-wp2-s6-browser-cases.mjs — 611e05cc118bae98d595449d3c77ebe12c283e0deae091d3aabbdc7d6b527a32

## 執行命令與 counts

node --test 呼叫 5 次（均明列檔，沒有 glob）：

1. S6-only → /private/tmp/pptskill-wp2-s6-red.log：3 tests，0 pass / 3 fail。產品實作前 action 不顯示、picker opens=0，true RED。
2. S6-only → /private/tmp/pptskill-wp2-s6-green.log：3/3 pass。
3. 擴充 S6-only → /private/tmp/pptskill-wp2-s6-expanded.log：22 tests，20 pass / 2 fail。
4. 明列 8 檔 → /private/tmp/pptskill-wp2-s6-regression.log：98/98 pass。
5. 明列 8 檔 → /private/tmp/pptskill-wp2-s6-final-regression.log：100/100 pass（S6 24 tests）。

前三次命令：node --test tests/edx-wp2-s6-selected-image-ui.test.mjs
最終命令：node --test tests/edx-wp2-s6-selected-image-ui.test.mjs tests/edx-wp2-s5-targeted-image-file.test.mjs tests/edx-wp2-s4-replace-asset.test.mjs tests/edx-wp1-s8-mounted-selection.test.mjs tests/edx-wp1-s8-selection.test.mjs tests/edx-wp1-s5-keyboard.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs

node --check tools/edx-wp2-s6-browser-cases.mjs：2 次通過。
node --check tools/edx-wp1-s4-browser-acceptance.mjs：2 次通過。
git diff --check：2 次通過。
CodeGraph query：1 次，回傳不相關 symbol，轉 rg。
browser launch/attach/runner/fixture runner/full glob/ZIP/commit/branch mutation/control/evidence/protected writes：0。

## 失敗歷史

- 預期 true RED：action 不存在，單選 image button hidden，picker opens=0。
- 擴充測試首次 gesture stub 未提供 vendor event.set()，snap=false/true 同次執行各失敗一次。改用既有 h.begin()/h.update() helper，後續全部通過；無同 blocker 連續重試。
- 初期探索使用不存在的 runtime/editor*、tools/edx-wp1-browser*、tools/*cdp* 導致 zsh glob 提示；已用 rg 精準檔案定位，未啟動 runner。
- 未執行 browser，因此沒有聲稱 host errors0、targetClosed、1280/1600 或 natural OS dialog 已驗證。

## 主線待驗／限制

新增 --selected-image-regression 沿既有 base10/S4 fixture runner；真 pointer 選第二圖及 hit button，量測 mousedown 前後 rect，CDP Page.setInterceptFileChooserDialog/fileChooserOpened/DOM.describeNode/DOM.setFileInputFiles 對原 input 注入本地 PNG。記錄 trusted change 與自然 blur 次數；額外 blur/cancel 明示 synthetic。包含同檔重選、新選取/切頁/mode 失效、nonimage/multi、canonical/DOM/geometry/alt/fit、export/offline reopen。CDP seam 不可用會 fail，沒有 API fallback。

僅語法核對 harness，未執行 browser 或 fixture runner。主線執行命令（由其既有正式 host 環境提供 PPTSKILL_DEVTOOLS_ACTIVE_PORT）：
node tools/edx-wp1-s4-browser-acceptance.mjs <主線輸出目錄> --selected-image-regression

主線仍負責正式 host、1280→1600、四支 PGQ 串行、full nonbrowser、ZIP lifecycle/hash/protected4 與獨立 review。既存 untracked .DS_Store/CLAUDE.md/HANDOFF/tasks/evidence 未修改。沒有 commit、push、merge 或下一 slice。
