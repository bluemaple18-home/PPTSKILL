# PPTSKILL WP2-S2 single-writer Worker result

狀態：產品 checkpoint，可供主線凍結；尚非正式 host 驗收完成或 Independent Review GO。
Repo：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical
Branch：codex/edx-wp2-s2-role-font-size
開卡／目前 HEAD：65e59e65f2766be5c115ba982c3559eba8b5bf44（Worker 未 commit）。

## 固定契約與實作

- 僅 title/subtitle，fontSize 整數 16..160；null reset；空 map absent；不新增 subtitle／其他字段。
- 新 role-typography.js 閉包共用 Node／portable validator、descriptor、map sanitation、計算與 font-size projector；無新增 dependency。
- strict envelope／value／target，拒絕 prototype key、繼承型 payload、非字串 identity、extra keys、NaN/Infinity/fraction/string。先驗證再提交；no-op revision 以 active gesture 驗證。
- contextual number input、套用／還原；focus 移到 toolbar 保留 stable target，先 sync 合法文字；IME pending 擋 UI 與 public typography operation；切頁／模式清 target。
- font-size 投影保留 inline default/priority、motion style；renderer／export canonical 一致。export 移除 typography toolbar；portable boot 重建工具列。
- ZIP build 原先遞迴收 runtime，已在既有 lifecycle coreFiles 必要清單加入 role-typography.js；未執行 ZIP/lifecycle，未動 dist。

## 可凍結產品檔案（恰 12 個；排除主線 control）

- runtime/role-typography.js
- runtime/deck-editor.js
- runtime/deck-spec.js
- runtime/full-deck-renderer.js
- schemas/deck-spec.schema.json
- distribution/lib/lifecycle.mjs
- tests/edx-wp2-s2-role-font-size.test.mjs
- tests/edx-wp1-s2-stable-identity-operation-path.test.mjs
- tests/edx-wp1-s4-managed-browser-attach.test.mjs
- tools/edx-wp2-s2-browser-cases.mjs
- tools/edx-wp1-s4-browser-acceptance.mjs
- tools/edx-wp1-s4-perf-mounted.mjs

逐檔 SHA256：/private/tmp/pptskill-wp2-s2-product-sha256.json
BACKLOG.md 與 tasks/edx-wp2-s2-host-acceptance.md 為主線變更，不屬 Worker 清單；未改其他 tasks/handoff。

## RED → GREEN 與 failures 根因

1. 初始 meaningful RED：4 tests / 0 pass / 4 fail；尚無 operation、sanitizer 丟失 override、UI toolbar 缺失。log：/private/tmp/pptskill-wp2-s2-red.log。
2. 核心初次 GREEN：4 / 4 pass，log：/private/tmp/pptskill-wp2-s2-green-initial.log。
3. scoped initial 47 / 46 pass / 1 fail：既有 registry snapshot 列五個 operation；更新 exact 清單納入 set-typography，未放寬 validator。log：/private/tmp/pptskill-wp2-s2-focused-initial.log。
4. expanded 7 / 6 pass / 1 fail：測試的 motion fixture 缺既有 role/replay 且 target 多填 role；修正 fixture 符合既有契約，未改 motion validator。log：/private/tmp/pptskill-wp2-s2-expanded.log。
5. 邊界補測 RED：7 / 6 pass / 1 fail；portable elementId 的 object.toString 可被 Object.hasOwn 轉型接受。共用 validator 加入 typeof elementId==='string' 後 GREEN。log：/private/tmp/pptskill-wp2-s2-target-type-red.log。
6. 最終 scoped：66 tests / 66 pass / 0 fail / 0 skipped；包含 WP2-S2 7 cases、S1、identity、export cleanup、interaction、perf 與 managed attach stub。log：/private/tmp/pptskill-wp2-s2-focused-final.log；exit：/private/tmp/pptskill-wp2-s2-focused-final.exit = 0。

上述 failures 各有定位與進展，沒有同一 blocker 兩次無進展。修正均未縮小卡片 coverage 或放寬固定契約。

## 精確 commands

工作目錄均為 repo root。未使用 npm/yarn，未啟 browser。

```sh
node --test tests/edx-wp2-s2-role-font-size.test.mjs > /private/tmp/pptskill-wp2-s2-red.log 2>&1
node --test --test-reporter=tap tests/edx-wp2-s2-role-font-size.test.mjs tests/edx-wp2-s1-direct-text-edit.test.mjs tests/edx-wp1-s2-stable-identity-operation-path.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs tests/edx-wp1-s4-interaction.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/edx-wp1-s4-managed-browser-attach.test.mjs > /private/tmp/pptskill-wp2-s2-focused-final.log 2>&1
node tools/edx-wp1-s4-browser-acceptance.mjs /private/tmp/pptskill-wp2-s2-fixture --typography-regression --fixture-only > /private/tmp/pptskill-wp2-s2-fixture.log 2>&1
git diff --check > /private/tmp/pptskill-wp2-s2-diff-check.log 2>&1
```

各 JS/MJS 修改檔另以 node --check 檢查，schema 以 JSON.parse 檢查，全部 PASS：/private/tmp/pptskill-wp2-s2-syntax.log。
fixture-only exit0（只產生 HTML，未連 browser）：/private/tmp/pptskill-wp2-s2-fixture.log、/private/tmp/pptskill-wp2-s2-fixture.exit。
diff check exit0：/private/tmp/pptskill-wp2-s2-diff-check.log、/private/tmp/pptskill-wp2-s2-diff-check.exit。
四 protected untracked + 現有 dist 頂層檔 SHA 前後相同：/private/tmp/pptskill-wp2-s2-protected-before.json、/private/tmp/pptskill-wp2-s2-protected-check.json。

## Browser case coverage（已寫，未在真 browser 執行）

沿既有 runner 的 --typography-regression；1280×720、1600×900，attach-only，既有 listeners／owned target finally cleanup 保留。新 flag 的失敗 navigation／cleanup 由 stub 測試通過，不能代替真 browser。

- 真 CDP double-click title/subtitle；number input 經真 click/focus、DOM value/input event 填值、真套用／還原按鈕。
- 16／160 computed font-size 與 canonical 對照；空值／15／161／fraction／非法文字的 UI 原子拒絕。
- toolbar focus sync；text edit preserves font；synthetic CompositionEvent guard（UI apply/reset + API），不是原生 OS IME。
- layout/play 及切換另一 slide 清 target，隱藏按鈕程式點擊仍拒絕 stale mutation。
- export/offline reopen、無 typography toolbar/contenteditable/selection chrome；canonical geometry/motion/content/style/otherSlides preservation；重開後 toolbar reset 回 default。

## 風險與主線待驗

依最新分工，完整 non-browser、ZIP build/lifecycle、正式 host 雙 viewport、四支 affected PGQ 串行、host capacity/cleanup receipts、獨立 review 全數交主線。本 Worker 僅交 scoped 與 attach stub 證據，不誇大為 independent review 或 browser PASS。

需 host 確認真版面／computed font、pointer focus 與 synthetic IME、匯出 DOM normalization、離線重開工具列重建；原生 OS IME 不在 synthetic coverage 內。沒有已知未排除 scoped failure，沒有 architecture fork。未 commit/merge/push/deploy，未開下一 slice。
