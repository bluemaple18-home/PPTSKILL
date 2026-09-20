# EDX-WP1-S3 Worker receipt

## 改前 strict facts

- 工作：component-only bounded geometry；branch `codex/edx-wp1-s3`，base `b43def29751fa8d964a5fa59d90c77df1fadc729`；啟動 tracked clean，四個指定 untracked 原樣保留。
- Owner 邊界：「直接編輯此shared branch的runtime和tests」、「不要commit」、「不再派子代理」、「不得直接spawn browser，browser實機與ZIP交Mainline」。GPT-6 Astra 已授權；唯一程式 writer，Mainline 唯讀／驗收。
- 已讀 task、handoff、全域 AGENTS、context map、compiled_lite、rules/05、11、19。PPTSKILL authoring skill 是製作 deck 的流程，本次 runtime 開發不套用其 outline/style approval。
- CodeGraph task query：`sanitizeCompositionSpec executeOperation OPERATION_DESCRIPTORS renderComponent geometry override exportDeckHtml`，成功取得 sanitizer→renderer 與 editor caller 候選。bounded prepare 一次，`prepare_required=false`、indexed HEAD 與 base 相符；第二次 task query：`runAtViewport browser-geometry-qa CdpClient managedPortFile`，成功。未安裝 dependency。
- 已查 source：`sanitizeSlide`→`sanitizeComposition`；`createDeckEditor`→`executeOperation`→`commit`；`renderFullDeck`→`renderComponent`；browser `clean`／`executeOperation`／`serializeHtml`；schema `compositionSpec`。影響 importer 為 renderer、recipient DeckSpec parse、export runtime 與 focused/compatibility tests。
- 現況 measured gap：geometry 不在 sanitizer allowlist；edit-text 硬編 role allowlist；browser descriptor clone 可變；browser export clone 直接保留 live presentation style。geometry QA `runAtViewport` 自行 spawn，缺 managed attach。

## 鎖定契約

- `composition.geometryOverrides` optional object，以原始 component ID 作 key，value 完整 `{x,y,width,height}`。stable `{slideId,elementId}` 經既有 identity resolver 找到 component，再映射此欄位；不新增 layout store 或 schemaVersion。
- `executeOperation({operation:'move-element',target:{slideId,elementId},value:{x,y}})`；resize 的 value 為 `{width,height}`。只接受 component。值須 finite integer；最小 80×80；canonical 1600×900，safe inset 80，完整 rect 不可越界。不以 8px grid clamp 使用者值。
- 首次 geometry operation 用 deterministic manual box `{x:800,y:280,width:640,height:480}` 補齊另兩欄；此為進入 manual geometry 的明示預設，不聲稱重建 legacy flow box。無 override 的 legacy 路徑完全不套用。
- 共用單一 geometry validator 與 descriptor allowlist；Node/browser 使用同一 function source。sanitizer 驗證所有 override 值，移除不存在 component 的 orphan；operation stale target 必須拒絕。content edit 保留，duplicate 複製 slide-local 值。
- renderer 只投影 canonical rect；export clone 對 component root 重建 geometry presentation，移除 live transform。recipient parse/reopen 使用 embedded DeckSpec。失敗不先同步 DOM 文字或部分寫入。
- Mainline 為滿足既有 managed lifecycle 規則決定 geometry QA bounded attach：有 `PPTSKILL_DEVTOOLS_ACTIVE_PORT` 時只建／關自己的 target，不 kill foreign browser；無 env 保持舊行為。新增 S3 focused attach-only browser script，由 Mainline 串行執行雙 viewport/static-normal、export/reopen 與 PGQ/ZIP gates。
- why_not_less：只改 Node 無法證明 portable/browser 契約；why_not_more：不做 interaction UI、history、AI bridge、vendor 或通用 registry。
- 回退：只撤回本輪列出的 runtime/schema/tests/tools/receipt diff；不碰指定四檔、不 reset、不 commit。

## 驗證記錄

- 既有 Node `v25.9.0`；工具鏈以 Bash source `/Users/matt/ai-core/config/toolchain_paths.sh`。首次 zsh source 不支援 Bash 語法，未執行測試；切回 Bash 後正常，無 dependency install。
- RED：`red.log`，exit 1，1 PASS／8 FAIL；geometry operation 的 object value 被既有 string validator 拒絕、descriptor 缺操作、sanitizer 未拒絕 invalid。
- 初版 GREEN：`green-initial.log`，9/9 PASS。後補 constructor、safe-area exact boundary、legacy component patch 與 managed attach failure-path coverage。
- 最終 focused：`focused.log`，26/26 PASS，包含 S2 10 項、S3 geometry 14 項、managed seam 2 項。
- 最終 compatibility：`compatibility.log`，42/42 PASS。
- 最終 non-browser full：`nonbrowser-full.log`，33 檔／214 tests PASS，清單存 `nonbrowser-files.json`，排除 Mainline 串行的 `pgq-wp4-s*`。其中讀舊 receipt 的 tests 不能取代 fresh browser evidence。
- `syntax-diff.log`：10 個 JS/MJS syntax、schema JSON parse、`git diff --check` PASS。
- runner 失誤：macOS Bash 不支援 `mapfile`，空清單使 Node 自動探索所有 tests，誤含 PGQ browser tests；該 run 失敗退出、不計入驗收，保留 `runner-selection-failed.log`。改用 Node 明確非空清單，避免 fallback discovery。Worker 未連線／操作 Mainline managed browser。
- Mainline 初次 focused browser 四組 PASS，但後續新 fixture authority RED 優先；保留 `geometry-static-initial.json`／`geometry-static-initial.log`，不能以初版 PASS 蓋過 fail。

### Exact commands

全部在 `<repo-root>`，使用既有 runtime：

```sh
source /Users/matt/ai-core/config/toolchain_paths.sh
"$NODE_BIN" --test tests/edx-wp1-s3-bounded-geometry.test.mjs > evidence/edx-wp1-s3/red.log 2>&1
"$NODE_BIN" --test tests/edx-wp1-s2-stable-identity-operation-path.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs tests/edx-wp1-s3-managed-browser-attach.test.mjs > evidence/edx-wp1-s3/focused.log 2>&1
"$NODE_BIN" --test tests/edx-wp1-s1-export-cleanup.test.mjs tests/edx-wp1-s2-stable-identity-operation-path.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs tests/edx-wp1-s3-managed-browser-attach.test.mjs tests/p0-r1-deck-spec.test.mjs tests/p0-r5-full-deck-renderer.test.mjs tests/p0-r7-deck-editor.test.mjs tests/p0-r8-recipient-handoff.test.mjs > evidence/edx-wp1-s3/compatibility.log 2>&1
```

RED command 已於實作前執行；不可用當前 GREEN 再覆寫原始 `red.log`。

最終 full 實際使用以下 Node argv runner，避免 Bash 版本與空清單問題：

```js
import { readFileSync, openSync, closeSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const files = JSON.parse(readFileSync('evidence/edx-wp1-s3/nonbrowser-files.json', 'utf8'));
if (!files.length || files.some(f => f.includes('pgq-wp4-s'))) throw new Error('測試清單不合法');
const log = openSync('evidence/edx-wp1-s3/nonbrowser-full.log', 'w');
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: ['ignore', log, log] });
closeSync(log);
process.exitCode = result.status ?? 1;
```

## 最終實作與 source freeze

- `runtime/component-geometry.js`：唯一 deterministic validator、default manual box、own-property lookup、orphan sanitizer、bounded presentation style 與 browser function-source 共用。
- `runtime/deck-spec.js`：optional CompositionSpec geometry sanitizer 與 validation。
- `runtime/deck-editor.js`：新增且僅新增 move／resize descriptors，Node/browser 共用 allowlist，深度 immutable snapshot，clone/validate/commit，export/reopen 重建 canonical component style，legacy 非 geometry component 清除 live root style。
- `runtime/full-deck-renderer.js`：canonical geometry 投影、非 slot manual component root、共用 effect treatment；所有 manual component root 是 slide 的直接子元素。
- `schemas/deck-spec.schema.json`：optional geometryOverrides metadata，不升 schemaVersion。
- `tests/edx-wp1-s2-stable-identity-operation-path.test.mjs`：更新 operation count／共享 enforcement 斷言；原 edit-text、identity 與 legacy adapters 仍測。
- `tests/edx-wp1-s3-bounded-geometry.test.mjs`：Node/browser API VM、legacy、finite/integer/safe area、失敗原子性、constructor ID、duplicate/delete、content patch、renderer/recipient round-trip。
- `tests/edx-wp1-s3-managed-browser-attach.test.mjs` 與 `tests/helpers/edx-wp1-s3-managed-browser-probe.mjs`：不啟動 browser 的 navigation failure probe，驗證只建／關 owned target，無 env 的 focused script 拒絕執行。
- `tools/browser-geometry-qa.mjs`：僅 lifecycle seam；authority/geometry gate 邏輯未改。
- `tools/edx-wp1-s3-browser-acceptance.mjs`：attach-only，listener 早於 navigation，雙 viewport/static-normal、offline reopen、24 類 invalid、immutable、duplicate/delete、prototype ID、containing block、live style 污染與三個 canonical DOM authority checkpoint。
- Source 最後修改：geometry QA producer `2026-09-20T11:01:30+0800`；geometry module `11:02:42`；editor、renderer、focused script `11:13:38`。其後最終 focused/compatibility/full/syntax/diff 均已重跑。
- Freeze：runtime/tools/tests/schema 不再修改，後續只補 receipt/docs。SHA 對照 `worker-source-sha256.txt`。

## Mainline 驗收交接

先設定有效的 owned managed port；不使用任何已失效的舊 port。依序執行：

```sh
node tools/edx-wp1-s3-browser-acceptance.mjs evidence/edx-wp1-s3/browser > evidence/edx-wp1-s3/focused-browser.log 2>&1
node tools/browser-geometry-qa.mjs evidence/edx-wp1-s3/browser/canonical.html --motion static --output evidence/edx-wp1-s3/geometry-static.json
node tools/browser-geometry-qa.mjs evidence/edx-wp1-s3/browser/canonical.html --motion normal --output evidence/edx-wp1-s3/geometry-normal.json
node --test --test-concurrency=1 tests/pgq-wp4-s*.test.mjs > evidence/edx-wp1-s3/pgq-browser.log 2>&1
```

- Focused script 自動重建 `source.html`／`canonical.html` 及四組 legacy/export/prototype HTML；正式 receipt 檔名為 **`browser/acceptance.json`**。
- 若僅重建 fixture：`node tools/edx-wp1-s3-browser-acceptance.mjs evidence/edx-wp1-s3/browser --fixture-only`；Mainline 正在操作的 output 不得同時重建。
- 初次 focused PASS 與 initial geometry FAIL 都在 `11:13:38` 修正前，不是最終 candidate evidence。須以修後的 focused＋geometry 四組與 source SHA 比對為準。
- PGQ 由 Mainline 串行執行；producer 自 `11:01:30` 後未變。Fresh ZIP build/install/smoke/uninstall、實際 ZIP bytes/SHA、managed browser lifecycle cleanup 均由 Mainline 收證。
- 本 Worker 不 commit／merge／push／deploy、不安裝依賴、不派 subagent；四個既有 untracked 未修改。
- 未完成事項：以文末「Mainline 最終證據核對與 Worker 交回」為準；Worker 不把待收證項目宣稱 PASS。

## Mainline 新 fixture authority 回報（修前 facts）

- Mainline `geometry-static.json`：兩 viewport 僅 portable `rendered_content_mismatch`；runtime、requiredVisibility、raster、geometry、motion 與錯誤數皆通過。
- CodeGraph authority query 未命中實際 producer seam，限域讀 `tools/browser-geometry-qa.mjs:225–258`。既有 gate 直接比較移除 transient attributes 後的 `outerHTML`；不修改此 gate。
- 根因：Node renderer 把 geometry/style 放在 edit-target 前；browser projector remove 後重加在 edit-target 後。需讓 Node/browser renderer 與 projection 都將 geometry/style 置於 component root 最後，並新增相同正規化的 browser 斷言。此修正使舊 runtime browser/ZIP 證據失效，須重建 fixture 並重驗。

## Mainline 最終證據核對與 Worker 交回

- Mainline 已完成修後 focused browser：`browser-final/acceptance.json` 四組 PASS（static／normal × 1280×720／1600×900）。Worker 已直接讀取並確認每組 operation、reopen、prototype canonical authority 均為 true，console／pageErrors／networkFailures／HTTP errors 均為 0，四個 owned target 均已關閉。
- 正式最終 fixture/output 為 `browser-final/`；先前 `browser/acceptance.json` 僅為歷史測試，不再作為最終 candidate 證據。
- `verification-source.sha256` 與 Worker 的 `worker-source-sha256.txt` 均逐檔核對 OK。runtime/tools 自 freeze 後未修改；本次只更新本 receipt。
- Mainline 對真正 browser export `browser-final/static-1600-export.html` 執行 static geometry gate，最終 `geometry-static.json` 已核對 PASS：1600×900／1280×720 的 runtime、contentIntegrity、requiredVisibility、rasterVisibility、geometry、motion 全 PASS；issues 與 console／pageErrors／networkFailures／HTTP errors 均為 0。
- Fresh ZIP：`distribution-build.json` 的 build 為 built；`distribution-lifecycle.json` 的 lifecycleStatus 與 packageSmokeStatus 均為 pass，已完成 install／smoke／uninstall。
- Worker 實測交付 ZIP 為 **2,155,908 bytes**，低於 12 MiB warning／20 MiB hard gate；SHA-256 實測符合 `150a23fa7fe9ab643c80009b5d22b3320811911eb7fade2e952379c61d9c0258`。Host capability 為 partial：Codex／Claude Code 已辨識，Gemini CLI 缺少；此為該機器 capability 記錄，不等於 ZIP lifecycle 失敗。
- `pgq-browser.log` 尚未出現 suite 最終統計，交由 Mainline 收尾。其餘正式 geometry／PGQ 最終裁決、managed browser 根目錄 cleanup 與 independent review 仍由 Mainline 負責。
- Worker 交付完成：runtime/tools/tests/schema 持續 freeze、未 commit，沒有待修的已知 Worker blocker；不再重跑／改寫 Mainline 的 browser 或 ZIP 輸出。
