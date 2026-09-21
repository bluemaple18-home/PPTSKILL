# S7 Web GPT 修復驗證 receipt

狀態：`NON_BROWSER_PASS / HOST_RETRY_CONSUMED / HARNESS_NOT_RUN`。這不是 S7 GO、Independent GO 或 review candidate。

## Preflight

- Repo：`PPTSKILL-canonical`，branch `codex/edx-wp1-s7`。
- HEAD：`4cd4540a71aa7f94cc60e4495155c572034a57a4`；修復仍在工作樹，未把 HEAD 誤當 candidate。
- 初始 preflight 的 task tool registry 未直接暴露 CodeGraph，因此先依 repo 規則使用 bounded `rg` / source diff；後續 root-cause follow-up 經 deferred tool discovery 取得 CodeGraph，並以它核對 AI Core capacity/browser routing seam。
- `motion-reset-hashes.json`：14/14 sources 與 4/4 protected 檔案 SHA-256 全部吻合。
- 四個 protected untracked 未修改／stage。

## Source boundary

本輪 repair-specific production diff 僅核對 `runtime/motion-primitives.js`：reduced/static 的 `transform:none!important` reset 改為排除 `[data-pptskill-editor-chrome]`、`.moveable-control-box` 及其後代；animation/transition/opacity/clip-path 的全體 reset 維持。`:where(...)` 保持排除條件零 specificity；內容節點與 pseudo-elements（含 subtitle `::after`）仍受 transform reset。未發現 geometry/vendor/pointer workaround 混入這個 repair diff。

歷史失敗證據維持：`motion-resize-diagnostic/acceptance.json` 為 1280×720、67 checks 後 reduced resize FAIL，actual 637×477、expected 624×464，`targetClosed=true`。Static 只有 source-level 同風險，不宣稱曾 fresh browser 失敗。

## Fresh verification

1. `node --test tests/edx-wp1-s7-motion-reset.test.mjs`
   - exit 0；4/4 PASS。
2. CSS parser：`esbuild.transform(buildMotionCss(), { loader: 'css', target: 'chrome120' })`
   - warnings 0；exit 0。
3. `git diff --check`
   - exit 0。

現有 `motion-reset-nonbrowser.log` 為同一組已核對 source hashes，記錄 337/337 PASS、0 fail、0 skipped；本 verifier 依卡片節流規則沒有在無 source drift／新疑慮時重跑整套 337。

## Browser gate / environment

- 規則 11 的同 blocker 高互動 UI 失敗上限已達 2 次；卡片要求 Owner 明示授權後才允許一次 targeted retry，換 executor 不重置計數。
- Owner 已於本輪明示「授權」，承接前一輪唯一待確認事項，因此本 verifier 將其套用為卡片要求的一次 targeted browser retry 授權；再次失敗即停。
- 歷史 routing / enter managed sessions 均為 `resource observation unknown (scan limit)`、exit 2；`mainline-checkpoint-cleanup.json` 確認兩個 owned root absent、isolation marker absent，但不等同 browser 環境可用。
- 授權後先新增窄 verifier harness `targeted-browser.mjs` 並完成 `node --check`；它尚未取得 browser，因此沒有產生產品 PASS/FAIL。
- 唯一一次受管 browser 啟動使用 `ai-core/scripts/tmp_session.py browser` 與 canonical Chrome executable，未放寬任何 scan/capacity 參數。入口在 `DevToolsActivePort` ready 前以 exit 2 停止，實際輸出為：`nice(5) failed: operation not permitted`，接著 `NO_GO: unable to measure host capacity`。
- 因 browser 未 ready，`targeted-lifecycle/`、`targeted-browser/`、`targeted-browser.log` 與 `browser-close.json` 均未建立；沒有 target/navigation/console/network/pageerror 產品證據，也沒有 browser root 可由本 verifier 宣稱已啟動或清理。
- 依 Owner 的「再次失敗即停」與規則 11，本 verifier 在這次 environment failure 後停止，沒有第二次 targeted retry；未改 ai-core helper、未繞過 host-capacity / scan gate、未裸 spawn Chrome。

因此 browser 部分本輪狀態為 `ENV_BLOCKED`，不是產品 PASS/FAIL，也不能回 `TARGETED_PASS`。

### 2026-09-21 runtime root-cause follow-up

- Fresh runtime probe 確認目前 verifier 執行於 `CODEX_SANDBOX=seatbelt`。
- 直接呼叫 canonical `measure_host_capacity()` 可穩定重現失敗；`/private/tmp` 的 Foundation 原始值為 `total=494384795648`、`physical=67321401344`、`admission=0` bytes。repo 路徑亦同樣得到 `admission=0`。因此 `_validated_capacity()` 以 non-positive capacity fail closed，`assert_projected_capacity()` 再轉成 `NO_GO: unable to measure host capacity`。
- AI Core 既有 task evidence 已記錄同一環境差異：受限工具環境曾得到 `admission=0`，改在 host environment 後 Foundation important-usage 回復非零並通過。這與本輪 fresh probe 相符；目前沒有證據支持修改 Foundation sensor、降級成 raw `shutil.disk_usage` 或放寬 Rule 24。
- CodeGraph 核對既有 routing：`browser_acceptance_producer.require_standalone_browser_launch()` 已明確在 `CODEX_SANDBOX` 拒絕 standalone Playwright/Chrome；Rule 17/Rule 11 也要求 sandbox 使用既有 Chrome extension / Codex Browser，完整 standalone Playwright artifact 則移到允許 browser process 的 host/runtime。
- Native browser inventory 顯示目前已有 Chrome extension browser 與 Codex in-app browser；因此「Chrome 不存在」不是 blocker。但 `chrome-devtools-mcp` attach 目前失敗，原因是正常 Chrome profile 沒有 `DevToolsActivePort`。extension UI path 可做 bounded live UI observation，不能冒充本卡要求的完整 Playwright console/network/pageerror regression evidence。
- 嘗試做一次 unsandboxed、read-only host capacity probe 時被 runtime auto-review 擋下；未取得 host-side fresh capacity 數值，也沒有藉此繞過 sandbox。這次 blocked probe 不算 browser retry。
- `nice(5) failed: operation not permitted` 未在 lifecycle source 找到對應控制路徑；canonical lifecycle 在 capacity admission 前已因 `admission=0` 足以 deterministic fail。現有證據不支持把 `nice(5)` 當本輪主要根因。

結論：本輪重複失敗的根因是 **standalone managed-browser lifecycle 被從 `CODEX_SANDBOX` 執行**。正確修法是 routing correction，不是再次修 S7 motion code，也不是弱化 capacity gate。後續若需要本卡的完整 targeted browser regression，必須在允許 browser process 且可取得 Foundation important-usage 的 host/runtime 執行既有 managed lifecycle；若只做現場 UI triage，才使用目前可用的 Chrome extension / Codex Browser。

### 2026-09-21 formal host-runtime retry

- Owner 更新本卡後授權一次正式 host-runtime targeted browser retry；執行前 `host-targeted-*` / `host-lifecycle-*` 結果目錄不存在，因此確認本次新授權尚未被其他執行者消耗。
- Host-side preflight 以 unsandboxed runtime 執行，`CODEX_SANDBOX=None`。Foundation capacity fresh 值為 `total=494384795648`、`physical=74364575744`、`admission=85144319470` bytes；未修改或繞過 Rule 24。
- 啟動前重驗 `motion-reset-hashes.json`：14/14 sources、4/4 protected 全 MATCH。
- 正式 retry 只走 `/Users/matt/ai-core/scripts/tmp_session.py browser` 與 canonical Chrome executable，建立 owned root `/private/tmp/aic-b-736da995b25b4e2992f7b93f5fef4348`。launcher 已輸出 `browser-starting` metadata。
- lifecycle stderr fresh 顯示 Chrome 已到 `DevTools listening on ws://127.0.0.1:49613/devtools/browser/...`；但 bounded controller 在期限內沒有以卡片要求的 `DevToolsActivePort` 檔完成 readiness，因此依單次授權停損終止本輪。沒有改用 stderr port、沒有另起 profile、沒有第二次 browser launch。
- `targeted-browser.mjs` **沒有開始執行**，因此沒有 navigation、console/network/pageerror 產品斷言，也沒有 `acceptance.json`；本輪不能判產品 PASS/FAIL 或 `TARGETED_PASS`。
- Cleanup 已 fresh 核對並保存於 `host-targeted-20260921/cleanup.json`：supervisor 已退出、owned root 已不存在、repo isolation marker 不存在、cleanup 後 DevToolsActivePort 路徑不存在；attempt 後 14+4 hashes 仍全 MATCH。
- 本次正式 host-runtime retry 授權已消耗。狀態為 `HARNESS_NOT_RUN / CLEANUP_VERIFIED`；不得在同一授權下再啟 browser。

## Fresh / inherited evidence boundary

- Fresh：14+4 hash 核對、repair source diff、motion-reset 4/4、CSS parse、diff check、sandbox root-cause preflight，以及正式 host-runtime retry 的 host capacity、managed browser startup、readiness stop 與 cleanup evidence。
- Inherited：337/337 non-browser log、歷史 browser failure、PGQ 28 unique。
- 未驗證：修復後 reduced/static 真 browser cascade/SE handle、兩 viewport pointer resize、subtitle `::after` computed style、export/reopen、affected PGQ content-integrity / required-visibility。正式 host retry 未進 harness，不能把 Chrome 到達 CDP listening 當成任何產品驗收。

## Changed paths / side effects

Verifier 未修改 production source、tests、ZIP、schema、vendor、ai-core，也未 merge／push／deploy。Verifier 只新增/更新 `webgpt-verification/receipt.md` 與窄 browser harness `webgpt-verification/targeted-browser.mjs`；harness 未取得 browser。原 S7 delivery 工作樹與既有 evidence 保持原狀，四個 protected hash 重驗仍完全一致。

## Next step

本 verifier 已執行並消耗更新卡片允許的一次正式 host-runtime targeted browser retry。Host runtime 與 Foundation capacity 均已正常，但 managed Chrome readiness 未以要求的 `DevToolsActivePort` seam 完成，因此 harness 未啟動；cleanup 已驗證。回原 Mainline 裁決是否另開新的 browser readiness 修復／驗證範圍；本 verifier 不自行重試、不改產品 code。

## Readiness controller text-fixture follow-up

- Owner 要求先取回原 host controller 並以文字 fixture 檢查 readiness，不啟動 browser。本輪遵守：沒有 Chrome/browser launch，沒有修改產品、AI Core helper、capacity sensor 或安全閘門。
- 原 controller 完整命令已從本輪 tool history 取回；readiness deadline 為 `240 × 0.05s` 名義約 12 秒，supervisor 提前退出走 exit 27，deadline 未 ready 走 exit 28。
- 原 run 沒有逐 poll 保存 `DevToolsActivePort` 的 stat/bytes/mtime/errno；只能確認最後 exit 28，這個 evidence gap 保留。
- 完整文字 fixture matrix 已補：empty、one-line、two-line、無 final newline、延遲完成、missing path、directory/read error、supervisor early exit、invalid port、invalid endpoint。
- 確認 defect：`wc -l` 對「完整兩行但第二行無 final newline」只回 1；延遲補完第二行但不補 final newline 也持續 false-negative。logical-line parser 可正確 ready。
- 這個 fixture 證明原 controller predicate 足以造成 false-negative，但因原 host run 沒保存 port-file bytes，不能宣稱它就是當時唯一或已證實的 Chrome-side 根因。
- 修正版 predicate 與 fixture 結果保存於 `readiness-controller-repair.md`；保留原 timeout、managed lifecycle、supervisor stop-loss 與 exit 27/28，不採 stderr port、不增加 timeout。
- 本輪狀態：`READINESS_CONTROLLER_TEXT_FIXTURE_PASS / NO_BROWSER_LAUNCH`。下一次真 browser 仍需 Mainline/Owner 新授權。
