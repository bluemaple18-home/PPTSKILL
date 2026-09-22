# WP2-S7 Worker 交接

狀態：限定實作與 scoped nonbrowser 驗證完成；交回主線，停止寫入。此報告不作 candidate／GO 判定。

- Repo：`/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical`
- Branch：`codex/edx-wp2-s7-selected-image-fit`
- 開始／結束 HEAD：`55fbe7912a57cdf75afc7dc3bd8147852a21119a`
- 已讀實體 `tasks/edx-wp2-s7-selected-image-fit.md`、使用者 bootstrap、context map、rules05／11／24。任務卡較早 Base 不取代本輪明示 HEAD。
- CodeGraph query：`selectedImageTarget image toolbar picker replace-asset cancel gesture`，projectPath 為本 repo；回傳 design-grammar／style-candidates／build-theme-previews，無相關 runtime 結果，改用限定 runtime／tests／tools 的 rg 與原始碼。
- 無 browser／Chrome／attach／fixture runner／build／ZIP／probe／commit／branch mutation／AI Core 寫入。未建立 task、worktree 或子 agent。

## 改檔（六個產品檔案）

| 路徑 | 變更 |
| --- | --- |
| `runtime/deck-editor.js` | S6 toolbar 加 contain／cover native group、aria-label／pressed／裁邊 title；沿原 tokens；讀 live selected target，透過既有 replace-asset 寫 fit；default contain no-op；pending picker 禁用；operation 後刷新 |
| `runtime/component-interaction.js` | fit action click 不落入清 selection；pointerdown／keyboard click 取消 preview 並保留 selection；snap 已取消 gesture 的尾隨 End 不再清 selection；沿既有 keyboard ownership guard |
| `tools/edx-wp1-s4-perf-mounted.mjs` | 加 fit DOM double；resizeStart 的 setFixedDirection stub；update 可傳 vendor snap geometry 欄位 |
| `tests/edx-wp2-s7-selected-image-fit.test.mjs` | 新增 29 mounted／markup cases |
| `tools/edx-wp1-s4-browser-acceptance.mjs` | `--image-fit-regression` 沿既有兩圖片 fixture、base10、listeners、双 viewport、錯誤與 targetClosed 檢查呼叫新 cases |
| `tools/edx-wp2-s7-browser-cases.mjs` | 真 pointer 選第二圖及 fit、native Tab／Space／Enter／arrow、rect／hit／pressed、全 spec 保留、gesture cancel、selection／mode、S7 截圖、export／offline reopen |

`tools/edx-wp2-s6-browser-cases.mjs` 未修改；使用既有 `--selected-image-regression` 可同 run 執行 S6 chooser 回歸，原 CDP chooser／synthetic blur/cancel 標示與語意保留。

既有 `.DS_Store`、`CLAUDE.md`、兩個 HANDOFF 未碰。最後 status 出現主線的 `evidence/edx-wp2-s7/` 與 `tasks/edx-wp2-s7-host-acceptance.md`，本 Worker 未写入。相同 tmp prefix 的 host-controller.py／verify-build.py 不屬本 Worker，未修改／執行。

## 已驗契約

- 單選第二 image、contain／cover 往返、缺省 contain 不補欄位不加 revision、同 fit no-op、未知 fit／無 target 拒絕，無第一圖 fallback。
- fit click 讀 live dataUri；optimizer 不執行；全 DeckSpec 比對保留其他 image／slide、alt／dataUri、geometry／composition／typography／motion／style／background。
- same-image clicked、nonimage／multi／clear／切頁／edit／play／delete／destroy／DOM removal 的 hidden／disabled／stale-target 拒絕。
- picker pending 不被 fit pointerdown／click 破壞；cancel／empty／change／blur-change 恢復正確狀態。
- drag／resize × pointer／keyboard × snap on/off 取消 preview 後只 commit fit；default no-op 也取消 preview 並保留 selection。
- toolbar arrows／modifier／IME 沿原 guard；selection refresh payload reads=0、wholeDeck serializations=0。
- mounted export 移除 toolbar／controls，匯出 DeckSpec remount 後可切 fit；此項不是實際瀏覽器 offline reopen 證據。

## 執行命令與 counts

以下命令 cwd 均為上述 repo；Node 固定 `/opt/homebrew/bin/node`。未使用 test glob。

### 1. RED

```sh
/opt/homebrew/bin/node --test tests/edx-wp2-s7-selected-image-fit.test.mjs > /private/tmp/pptskill-wp2-s7-red.log 2>&1
```

26 tests：0 pass／26 fail／0 skipped。新增 controls 尚未實作的真 RED。最初 shell wrapper 後接 `tail`，wrapper exit=0；未獨立擷取 node exit，不能將 wrapper 0 當測試成功。完整 log 保留明確 fail counts／stack。

### 2. 最小實作第一次

```sh
/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp2-s7-selected-image-fit.test.mjs > /private/tmp/pptskill-wp2-s7-green-1.log 2>&1
```

26 tests：22 pass／4 fail／0 skipped；exit=1。

### 3. 修正後七支 scoped

```sh
/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp2-s7-selected-image-fit.test.mjs tests/edx-wp2-s6-selected-image-ui.test.mjs tests/edx-wp2-s5-targeted-image-file.test.mjs tests/edx-wp2-s4-replace-asset.test.mjs tests/edx-wp1-s5-keyboard.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs > /private/tmp/pptskill-wp2-s7-scoped-1.log 2>&1
```

119 tests：119 pass／0 fail／0 skipped；exit=0。

### 4. 最終 scoped（新增三個 S7 cases，並擴至四支受 End／cancel 變更影響的相鄰測試）

```sh
/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp2-s7-selected-image-fit.test.mjs tests/edx-wp2-s6-selected-image-ui.test.mjs tests/edx-wp2-s5-targeted-image-file.test.mjs tests/edx-wp2-s4-replace-asset.test.mjs tests/edx-wp1-s5-keyboard.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/edx-wp1-s1-export-cleanup.test.mjs tests/edx-wp1-s4-interaction.test.mjs tests/edx-wp1-s7-snap.test.mjs tests/edx-wp1-s7-cancel-click.test.mjs tests/edx-wp1-s7-control-routing.test.mjs > /private/tmp/pptskill-wp2-s7-scoped-final.log 2>&1
```

196 tests：196 pass／0 fail／0 skipped；exit=0。S7 新檔共 29 cases。相鄰測試只跑既有 node tests，無 browser process。

### 5. 語法與 diff

| 命令 | log（皆 `/private/tmp/`） | counts／exit |
| --- | --- | --- |
| `/opt/homebrew/bin/node --check tools/edx-wp2-s7-browser-cases.mjs` | `pptskill-wp2-s7-browser-cases-check.log` | 1 check／0 error／exit 0 |
| `/opt/homebrew/bin/node --check tools/edx-wp1-s4-browser-acceptance.mjs` | `pptskill-wp2-s7-runner-check.log` | 1 check／0 error／exit 0 |
| `/opt/homebrew/bin/node --check runtime/deck-editor.js` | `pptskill-wp2-s7-editor-check.log` | 1 check／0 error／exit 0 |
| `/opt/homebrew/bin/node --check runtime/component-interaction.js` | `pptskill-wp2-s7-interaction-check.log` | 1 check／0 error／exit 0 |
| `/opt/homebrew/bin/node --check tools/edx-wp2-s7-browser-cases.mjs`（focus prep 調整後） | `pptskill-wp2-s7-browser-cases-final-check.log` | 1 check／0 error／exit 0 |
| `git diff --check` | `pptskill-wp2-s7-diff-check.log` | 1 check／0 error／exit 0 |

語法／diff 成功時空 log 為正常現象，exit 已於本 session 確認。新檔亦由 node parsing／tests 驗證。

## Failed history（未刪除或覆蓋）

1. RED：26 fail，全部留在 `pptskill-wp2-s7-red.log`。
2. GREEN-1：snap=true 的 drag pointer／keyboard 在尾隨 End 後 group hidden（2 fail）；resize pointer／keyboard 缺 mounted event.setFixedDirection（2 fail）。完整留在 `pptskill-wp2-s7-green-1.log`。
3. 修復：已取消 gesture 的 End 直接忽略；helper 補 vendor event seam，S7 update 明列 snap left／top／width／height，確保 preview 不是 NaN。其後 119／119 與最終 196／196。
4. 前置探索亦有路徑查找失敗：一次在父 cwd 對 tests／tools／config／rules 查找得到不存在；一次猜測 AI Core 路徑不存在。改由技能 symlink 找到 `/Users/matt/ai-core`，未據此修改產品。CodeGraph 無相關結果如上。這些不是產品測試 pass，也未隱藏為成功。

本輪無同類修復連續兩次無進展；無待裁決 fork。

## 未驗 scope／主線接手

- browser harness 僅寫入與 `node --check`，沒有執行 runner（包括 fixture-only）、Chrome、attach、CDP 或 screenshot capture。
- 主線既有受管 host 執行入口請同帶 `--image-fit-regression --selected-image-regression`。runner 仍使用 `PPTSKILL_DEVTOOLS_ACTIVE_PORT`、原 base10 與 1280×720／1600×900；此為接手提示，Worker 未執行。
- S7 预期新截圖：`1280-s7-selected-image-fit.png`、`1600-s7-selected-image-fit.png`；目前僅有產生程式碼，沒有本輪真截圖或視覺 pass。
- 真 pointer hit／rect、native keyboard、computed object-fit、S6 chooser、offline reopen、errors／HTTP／remote=0、targetClosed 仍須主線實跑。mounted 的 synthetic events 不替代上述證據。
- full 明列 nonbrowser、build／probe／ZIP delta、source.png／protected／hash、四支 affected PGQ 串行、Browser.close／supervisor／root／marker cleanup 與 Independent Review 均未執行。
- 新 controls 的實際佈局與雙 viewport 視覺、vendor 真 pointer 行為保留為 host 驗收風險；不宣稱 browser acceptance。
- 回退以這六檔 Worker diff 為界，勿整庫 reset 或碰主線 control／evidence。

STOP WRITING：報告交付後不再修改產品或主線檔案。
