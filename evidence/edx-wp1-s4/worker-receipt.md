# EDX-WP1-S4 Worker receipt

## 改前 strict facts／設計／RED 契約
- Base `20b54ac64c99682a20c0af1a71ceb7b4fa6de406`；branch `codex/edx-wp1-s4`。唯一 writer，clean context，共用 workspace sequential；不另派工、不 commit/merge/push/deploy、不啟動 browser、不跑 PGQ。
- Mainline 的 BACKLOG/task 與四個既有 untracked 原樣保留。
- 已讀 task 完整契約、AGENTS、context map、compiled_lite、rules/05、rules/11、rules/20、pptskill、evidence-first-acceptance。此為 runtime implementation，非新簡報／restyle，不套用內容／封面選擇流程。
- CodeGraph query `executeOperation geometry editor export number-flow vendor` 只命中旁系，依授權限域 rg runtime/deck-editor.js、component-geometry.js、full-deck-renderer.js、number-flow-vendor.js、tools 與 S3 tests。
- 既有入口：buildDeckEditorRuntimeScript、executeOperation({operation,target:{slideId,elementId},value})、projectComponentGeometry、serializeHtml clone cleanup、renderFullDeck；vendor 使用 esbuild→metadata hash→verified inline。
- 唯一 canonical geometry：composition.geometryOverrides[componentId]；整數 1600×900，inset/minimum=80，default={x:800,y:280,width:640,height:480}。不新增 schema/operation/state authority。
- 薄 interaction adapter：ephemeral mode/target/gesture，captured rect/revision/node identity；Moveable 真 drag/SE resize 只提供 gesture preview；release <=1 executeOperation；stale/cancel/no-op 不提交，invalid 交 S3 validator 拒絕再復原。
- 單擊僅選取，legacy 需點「套用手動版面」以既有 move operation 寫 deterministic default。文字編輯與版面模式互斥；退出、刪除、target replacement teardown。
- Export clone 既有 geometry reprojection 消除 preview，加移除 runtime vendor styles/selection，保留可重開的 inline vendor/runtime。
- 受影響：runtime/deck-editor.js、full-deck-renderer.js、新薄 adapter/vendor loader；tools vendor build/attach-only acceptance；tests；package/lock；runtime/vendor；本輪 evidence。rollback 僅反向本輪列明 diff，不碰 control/untracked。
- Vendor intake 已獲 Owner 授權：moveable@0.53.0 exact、pnpm --ignore-scripts；沿 S1 integrity/license，包含 bundled transitives licenses；無 CDN、無 Selecto/Floating UI。
- RED 先跑 public adapter 契約：mode/select/legacy、雙 scale conversion、一次提交、invalid/no-op/cancel/stale、export cleanup；browser 真 CDP pointer coverage 由 Mainline 跑，Worker 不冒稱實機 PASS。

狀態：RED 準備中；producer 未 freeze。

## 本輪已執行／dependency 邊界停點
- `node --test tests/edx-wp1-s4-interaction.test.mjs`：RED（缺 adapter module，red.log）→GREEN 5/5（adapter-green.log）。只涵蓋 adapter public API，不代表 browser vendor 閉環。
- offline store 缺 three tarball；sandbox normal install DNS ENOTFOUND。原 session 16266 已 Ctrl-C 結束 exit 130。
- 已授權 escalation：`pnpm add --save-exact moveable@0.53.0 --ignore-scripts --fetch-retries=0` PASS，session 67774 exit 0；install-authorized.log。
- 實測發現 lock transitive chain：moveable@0.53.0 → react-moveable@0.56.0 → react-selecto@1.26.3 → selecto@1.26.3。沒有直接加入 Selecto，但實際 dependency closure 含禁裝項。
- 依 task「需要…超範圍 dependency…停止並回 Mainline」停止；尚未 vendor bundle／UI wiring／browser script，producer 未 freeze，不能進 browser/PGQ/ZIP 或 review candidate。
- 建議 Mainline 裁決：若准許只存在 upstream dependency closure，後續 esbuild metafile 必須證明 portable bundle 不含 Selecto；否則另裁 package override 刪除 unused dependency 的 intake 修改。不自行改 pinned upstream dependency metadata。
- pinned css-styled@1.0.8 dist/styled.esm.js:61–112：style 精確使用 data-styled-id=rCS+hash(css)、data-styled-count，destroy 扣 reference count。後續由 Moveable 實體 control box 的 data-styled-id 對應 exact style selector；不能寬刪 style[data-styled-id]。
- `git diff --check` PASS。Mainline control diff、四個既有 untracked 保留；本輪 modified package.json/pnpm-lock.yaml，新增 runtime/component-interaction.js、tests/edx-wp1-s4-interaction.test.mjs、evidence/edx-wp1-s4/*。

## Mainline bounded 裁決後續做／最終 producer freeze

- Mainline 已更新實體 task/BACKLOG，允許 upstream unused Selecto install/lock closure，禁止 direct import／bundle／功能。原 dependency 停點已解除；未 override upstream metadata。
- **Freeze：2026-09-20T04:53:10Z（台北 12:53:10）**。此後 runtime/tools/tests/package/vendor 不再修改，等待 Mainline 真 pointer evidence；目前僅交獨立 review candidate，不宣稱 browser/PGQ/ZIP PASS。
- producer 實際 16 檔清單：`producer-files.json`；逐檔 SHA-256：`worker-source-sha256.txt`。manifest SHA-256 `4cc2a4deef4291aac8ee7a6cd88ce0aec48b48995c098c188ee7e68833b29c08`。base HEAD 仍為 `20b54ac64c99682a20c0af1a71ceb7b4fa6de406`，未 commit。

### 實際 producer 檔案

- `package.json`、`pnpm-lock.yaml`
- `runtime/component-interaction.js`、`runtime/moveable-vendor.js`
- `runtime/deck-editor.js`、`runtime/full-deck-renderer.js`
- `runtime/vendor/moveable-0.53.0.iife.js`、`moveable-LICENSE.md`、`moveable-metafile.json`、`moveable-vendor.json`
- `runtime/vendor/moveable-licenses/css-styled-LICENSE`
- `tools/build-moveable-vendor.mjs`、`tools/edx-wp1-s4-browser-acceptance.mjs`
- `tests/edx-wp1-s4-interaction.test.mjs`、`edx-wp1-s4-vendor.test.mjs`、`edx-wp1-s4-managed-browser-attach.test.mjs`

### 行為／授權證據

- Moveable 真事件使用 raw client coordinates／slide scale，preview 只改 presentation，release 走唯一既有 executeOperation。單擊不 mutation；legacy 明示初始化；SE resize 不另 move。取消、失效、no-op 不提交；非法 geometry S3 validator 拒絕且復原。
- 選取使用 data-editor-selected；overlay 才標 editor-chrome。css-styled@1.0.8 的 injectStyle 與 croact-css-styled@1.1.9 的 render 實際使用同一 data-styled-id；export 先從 controls 收 exact ID，只刪相符 style，再走既有 clone cleanup／canonical projection。不放寬 geometry gate／attribute order。
- mode／target replacement／slide delete／Escape teardown；MutationObserver 僅處理 stale node，無第二 canonical state。文字模式互斥，play 無 vendor instance。
- 正式 build 本輪獨立產生 metafile、16 inputs／16 package attribution、Selecto/Floating UI inputs 0；verifier 驗 bundle/hash/bytes、metafile/hash/input list/no external imports、license/hash、pinned registry integrity。
- Bundle **247,646 bytes**；gzip **80,891 bytes**；SHA-256 `9d4aedaf4a7535b53b3a3c850e4372c149b1e5cc9845268f84c92649222ee053`。相較 probe 多 global export wrapper；不引用 probe 代替正式 build。
- croact@1.0.4 fallback 僅接受 pinned ESM SHA `bf0189e9d2931dec791625e6fef231a713825cb82989291a6a283bbb69a3dbf6`，保留 Copyright (c) Daybrush 原文 banner，另標明標準 MIT permission 段引用 Moveable LICENSE，非上游独立 LICENSE；Microsoft helper notice 保留。
- 另兩個缺檔套件 css-styled@1.0.8／croact-css-styled@1.1.9 使用共同官方 repo `51fb10e66da6c8e2ca3c121b614a54e527617f08/LICENSE` 原文，metadata 記来源與 hash，其餘套件使用 pinned package LICENSE。

### 最終 non-browser 驗證

- `node --test tests/edx-wp1-s4-*.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs`：**25/25 PASS**，`focused.log`。
- compatibility 沿 S3 的 S1/S2/S3/managed attach＋deck spec/renderer/editor/recipient，再加 S4 三檔：**53/53 PASS**，`compatibility.log`。
- 完整 non-browser：`node --test` 加 `nonbrowser-files.json` 所列 **36 檔，225/225 PASS**，`nonbrowser-full.log`；只排除 Mainline 的 `tests/pgq-wp4-s*.test.mjs`。既有 tests 的歷史 browser receipts 不算 fresh browser 證據。
- `node tools/build-moveable-vendor.mjs` PASS，`vendor-build.log`；fixture-only PASS，`fixture.log`，真正 renderer 產出 `fixture/source.html` **365,120 bytes**。
- 九個修改／新增 JS/MJS `node --check` PASS（`syntax.log`），generated browser script 解析測試 PASS；`git diff --check` PASS（`diff-check.log` 空檔代表無錯誤）。
- 原始 RED 保存於 `red.log`；adapter-green 7/7。attach failure 測試模擬 CDP navigation failure，驗證 receipt/owned target cleanup，不啟動 browser。

### Mainline 建議驗收順序（從 repo root，已 export 受管 port）

1. `shasum -a 256 -c evidence/edx-wp1-s4/worker-source-sha256.txt`
2. `node tools/edx-wp1-s4-browser-acceptance.mjs evidence/edx-wp1-s4/browser-final > evidence/edx-wp1-s4/focused-browser.log 2>&1`
3. 用真正匯出 artifact：`node tools/browser-geometry-qa.mjs evidence/edx-wp1-s4/browser-final/1600-reopen-export.html --motion static --output evidence/edx-wp1-s4/geometry-static.json`
4. 同 artifact：`node tools/browser-geometry-qa.mjs evidence/edx-wp1-s4/browser-final/1600-reopen-export.html --motion normal --output evidence/edx-wp1-s4/geometry-normal.json`
5. Mainline fresh ZIP build/install/smoke/uninstall，記實際 bytes/SHA／source manifest；最後 `node --test --test-concurrency=1 tests/pgq-wp4-s*.test.mjs > evidence/edx-wp1-s4/pgq-browser.log 2>&1`。

- Script attach-only，輸出 `browser-final/acceptance.json`；1280×720／1600×900，真正 Input.dispatchMouseEvent drag/SE resize，Escape cancel，no-op，越界與minimum拒絕，play模式，preview時export clone DOM與spec一致、精確style清除，offline reopen再drag，文字模式互斥、runtime/network/HTTP/Traceback證據，finally清自己target。
- 只生成 fixture：`node tools/edx-wp1-s4-browser-acceptance.mjs evidence/edx-wp1-s4/fixture --fixture-only`；正式 fresh browser 會自行產生其 source，不需重用 fixture-only 的 output。
- 未跑 browser／geometry／PGQ；未執行正式 ZIP 驗收。Known S3 motion P2 保留，不宣稱已修。`.tools/edx-wp1-s4/` 僅本輪下載cache，不納 producer、不 stage。Mainline控制差異及四個既有untracked原樣保留。
