# WP2-S8 Worker receipt（local-only）

狀態：Worker 實作與授權 nonbrowser 驗證完成，STOP WRITING；待 Mainline host 驗收與獨立 review。來源 HEAD：48ee0d34c80f8cc1dc99837817d65f7434fe7f5e；branch codex/edx-wp2-s8-insert-image-operation 已核對。
任務：tasks/edx-wp2-s8-insert-image-operation.md 完整讀取；Owner compiled_lite、rules05（coding/startup）、11、24（prior-art/storage）已讀。
CodeGraph semantic query 已執行，回傳 full-deck-renderer/generation-plan/style-candidates，未提供本卡 editor mutation seam；限域 runtime/deck-editor.js、asset-replacement.js、component-geometry.js、deck-spec.js、component-interaction.js 與指定相鄰 tests/tools。未自行 index。

## 改前事實與既定契約

Reading Map Entry：S8 實體卡；Existing Implementation/Reuse Candidate：assetReplacement.validateRequest、resolveSlideElementIdentities、validateComponentGeometry、portable renderComponent/projectComponentGeometryStyle、createDeckEditor candidate→commit。
Existing Seam：Node executeOperation 與 portable executeOperation；新增閉包可序列化 image-insertion contract，沒有第二 writer/model。
Prior Art JIT/License：同 HEAD 既有內部實作，沒有新增 donor/dependency；Absorb：validation/projection/resolver；Do Not Absorb：picker/auto-ID/text/chart/schema/identity resolver 變更。
Why Custom：components membership＋geometry 的 atomic insert 尚缺；Why not less：content.push 不能保證 DOM/identity/rollback；Why not more：卡外能力禁止。Deviation：none。
Public API：{operation:'insert-element',target:{slideId},value:{component:{id,type:'image',dataUri,alt,fit?},geometry:{x,y,width,height}}。
修改預期：runtime/image-insertion.js、runtime/deck-editor.js、tests/edx-wp2-s8-insert-image.test.mjs、既有 descriptor snapshot、必要 mounted helper、browser runner 與新 cases。唯一 product writer；不寫 control/evidence/protected/AI Core。
Rollback：只移除本次 bounded diff；不操作既有未追蹤 .DS_Store、CLAUDE.md、兩份 HANDOFF。
Scope：禁止 browser/Chrome/attach/fixture runner、full glob、ZIP/build/probe、commit/branch、子 agent；Node 固定 /opt/homebrew/bin/node。
驗證：先 S8 Node＋mounted RED，再同檔 GREEN、卡片指定 scoped regression、各變更 JS/MJS node --check、git diff --check。Browser 僅 syntax；Mainline 才可真機驗收。

## 交付改檔（共 8；未 commit）

- `runtime/image-insertion.js`：新共用閉包：exact own-data payload、S4 policy、S3 geometry、identity 保留檢查；image-only descriptor。
- `runtime/deck-editor.js`：Node／portable 接線；clean(candidate)；detached render/project；append 前後 throw remove rollback；成功 revision+1／cancel／clear。
- `tests/edx-wp2-s8-insert-image.test.mjs`：20 項 Node／mounted 契約與失敗注入測試。
- `tests/edx-wp1-s2-stable-identity-operation-path.test.mjs`：descriptor snapshot 僅追加 insert-element。
- `tests/edx-wp1-s3-bounded-geometry.test.mjs`：descriptor snapshot 僅追加 insert-element。
- `tools/edx-wp1-s4-perf-mounted.mjs`：必要 DOM double：解析新 img child／HTML entities。
- `tools/edx-wp1-s4-browser-acceptance.mjs`：追加 --insert-image-regression import／fixture 選項／case hook；base10/listener/navigation/cleanup 不變。
- `tools/edx-wp2-s8-browser-cases.mjs`：新 API-driven insert＋真 pointer 選圖/fit/drag/resize、3×2 PNG decoded、rect/hit、export/offline、screenshot assertions；尚未執行。

## 驗證結果／逐命令 counts

最終 scoped 共 10 個 test commands，150 tests / 150 pass / 0 fail / 0 skip；8 次 node --check 全部 exit 0，git diff --check exit 0。沒有 full glob。所有命令 cwd 為本 repo；下表為實際執行命令。

| 命令 | 結果 counts | exit | log（同 prefix） |
|---|---|---:|---|
| `/opt/homebrew/bin/node --test tests/edx-wp2-s8-insert-image.test.mjs` | RED：18 tests / 5 pass / 13 fail | 1 | `RED-tests.log` |
| `/opt/homebrew/bin/node --input-type=module`（首次接線 heredoc） | 修改腳本解析失敗；editor/helper/snapshot 未寫 | 1 | `FAIL-edit-script.log`（錯誤轉錄與根因） |
| `/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp2-s8-insert-image.test.mjs`（接線失敗後） | 18 tests / 5 pass / 13 fail | 1 | `FAIL-edit-script-tests.log` |
| `/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp2-s8-insert-image.test.mjs`（修正接線後） | 18 tests / 18 pass / 0 fail | 0 | `GREEN-initial-tests.log` |
| `/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp2-s8-insert-image.test.mjs` | tests 20; pass 20; fail 0; cancelled 0; skipped 0; todo 0 | 0 | `GREEN-edx-wp2-s8-insert-image.test.mjs.log` |
| `/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp1-s2-stable-identity-operation-path.test.mjs` | tests 10; pass 10; fail 0; cancelled 0; skipped 0; todo 0 | 0 | `GREEN-edx-wp1-s2-stable-identity-operation-path.test.mjs.log` |
| `/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp1-s3-bounded-geometry.test.mjs` | tests 14; pass 14; fail 0; cancelled 0; skipped 0; todo 0 | 0 | `GREEN-edx-wp1-s3-bounded-geometry.test.mjs.log` |
| `/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp2-s4-replace-asset.test.mjs` | tests 14; pass 14; fail 0; cancelled 0; skipped 0; todo 0 | 0 | `GREEN-edx-wp2-s4-replace-asset.test.mjs.log` |
| `/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp2-s5-targeted-image-file.test.mjs` | tests 20; pass 20; fail 0; cancelled 0; skipped 0; todo 0 | 0 | `GREEN-edx-wp2-s5-targeted-image-file.test.mjs.log` |
| `/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp2-s6-selected-image-ui.test.mjs` | tests 25; pass 25; fail 0; cancelled 0; skipped 0; todo 0 | 0 | `GREEN-edx-wp2-s6-selected-image-ui.test.mjs.log` |
| `/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp2-s7-selected-image-fit.test.mjs` | tests 29; pass 29; fail 0; cancelled 0; skipped 0; todo 0 | 0 | `GREEN-edx-wp2-s7-selected-image-fit.test.mjs.log` |
| `/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp1-s1-export-cleanup.test.mjs` | tests 5; pass 5; fail 0; cancelled 0; skipped 0; todo 0 | 0 | `GREEN-edx-wp1-s1-export-cleanup.test.mjs.log` |
| `/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp2-s1-direct-text-edit.test.mjs` | tests 6; pass 6; fail 0; cancelled 0; skipped 0; todo 0 | 0 | `GREEN-edx-wp2-s1-direct-text-edit.test.mjs.log` |
| `/opt/homebrew/bin/node --test --test-reporter=tap tests/edx-wp1-s4-interaction.test.mjs` | tests 7; pass 7; fail 0; cancelled 0; skipped 0; todo 0 | 0 | `GREEN-edx-wp1-s4-interaction.test.mjs.log` |
| `/opt/homebrew/bin/node --check runtime/image-insertion.js` | syntax 1 | 0 | `GREEN-check-image-insertion.js.log` |
| `/opt/homebrew/bin/node --check runtime/deck-editor.js` | syntax 1 | 0 | `GREEN-check-deck-editor.js.log` |
| `/opt/homebrew/bin/node --check tests/edx-wp2-s8-insert-image.test.mjs` | syntax 1 | 0 | `GREEN-check-edx-wp2-s8-insert-image.test.mjs.log` |
| `/opt/homebrew/bin/node --check tests/edx-wp1-s2-stable-identity-operation-path.test.mjs` | syntax 1 | 0 | `GREEN-check-edx-wp1-s2-stable-identity-operation-path.test.mjs.log` |
| `/opt/homebrew/bin/node --check tests/edx-wp1-s3-bounded-geometry.test.mjs` | syntax 1 | 0 | `GREEN-check-edx-wp1-s3-bounded-geometry.test.mjs.log` |
| `/opt/homebrew/bin/node --check tools/edx-wp1-s4-perf-mounted.mjs` | syntax 1 | 0 | `GREEN-check-edx-wp1-s4-perf-mounted.mjs.log` |
| `/opt/homebrew/bin/node --check tools/edx-wp1-s4-browser-acceptance.mjs` | syntax 1 | 0 | `GREEN-check-edx-wp1-s4-browser-acceptance.mjs.log` |
| `/opt/homebrew/bin/node --check tools/edx-wp2-s8-browser-cases.mjs` | syntax 1 | 0 | `GREEN-check-edx-wp2-s8-browser-cases.mjs.log` |
| `git diff --check` | diff check 1 | 0 | `GREEN-diff-check.log` |

## 契約證據與失敗處理

- RED 的 Node／mounted 合法插入皆因 slide-only target 尚未支援失敗；getter calls 亦暴露既有 generic path 不適用。沒有用單純 reject 當成插入成功。
- 一次 bounded 實作循環中發生 1 次接線腳本 template literal 收尾語法錯誤；失敗前未改 editor。修正該腳本後 18/18 GREEN；加強 append 指定錯誤斷言與 snap drag/resize，最後 20/20 GREEN。未發生 contract fork 或同類兩次無進展；未啟動 Repair 2。
- 最終 S8 tests：跨頁同 ID、不同 ID、replay/duplicate 拒絕、exact keys、symbol/accessor/非法 prototype、getter calls=0、MIME/policy／geometry、null-prototype frozen records、long-ID collision 拒絕改名與可保留 identity 的 collision 接受。
- 注入 missing DOM、既有 DOM identity 衝突、detached DOM exception、append-before／append-after throw；比對 canonical、整個 DOM、revision、selection、active gesture 不变。append tests 明確要求捕捉對應 append 錯誤。
- 成功測試涵蓋 snap on/off × drag/resize：preview 取消、selection 清空、舊 node references/focus/inline opacity 保留、current slide/mode 保留、revision 僅加一次。
- 新 ID 可 replace-asset/fit/move/resize；Node renderer 與 portable export 再 extractDeckSpec/re-render 恰一 root；mounted remount 後選取及 fit 可操作。所有舊內容／字級／motion／slots／order／geometry／其他 slides 採全 spec equality。
- 拒絕發生在 canonical commit 前；detached render/project 先完成，append throw 移除本次 node；成功後才 revision/cancel/clear。既有 schema、identity resolver、asset-policy、renderer 功能皆未修改。

## 未驗範圍／主線交付界線

- Browser harness 僅 node --check：未啟動 browser、Chrome、attach、fixture runner；雙 viewport 1280×720／1600×900、decoded PNG、真 pointer、offline raw HTML reopen、screenshot、console/errors/HTTP/remote0／targetClosed 均是待 Mainline 執行的斷言，非本 Worker 已收集的真機證據。
- mounted DOM double 與 vendor 替身僅驗 public runtime／原子性，不宣稱實際排版、PNG decode 或 crop 像素驗收。
- 未執行 full nonbrowser、ZIP/build/probe、protected4/hash、PGQ affected journeys；沿卡片由 Mainline 執行。未做 aggregate insert admission；20MiB export guard 未變更。
- 共享 worktree 的最後 status 出現 `evidence/edx-wp2-s8/` 與 `tasks/edx-wp2-s8-host-acceptance.md`，非 Worker 寫入，未讀寫或清理。原有四個未追蹤檔亦保留。
- 無 commit／branch mutation／push／merge／control／repo evidence／protected／AI Core write、無子 agent；CodeGraph 未自行 sync/index，索引可能待主線更新。
- Donor：既有內部程式碼，source SHA 同上；新增第三方依賴 0。最終 source HEAD 仍為 `48ee0d34c80f8cc1dc99837817d65f7434fe7f5e`。

## 最終 product 檔案 SHA-256（供主線核對工作樹）

- `runtime/image-insertion.js`：`20b5a1f818aa3899794db8c34f315dc7fe0bd5edebcd667f17b0067bb8b9c2dd`
- `runtime/deck-editor.js`：`a9f3a22116cc78eaa2bfad2d71830ff467001ebd50e8f27f8dab5de0c6716db4`
- `tests/edx-wp2-s8-insert-image.test.mjs`：`47dbc481f455fec8c2d56ed698a2da8b72b63ba91a1892c5bc3663253013d24d`
- `tests/edx-wp1-s2-stable-identity-operation-path.test.mjs`：`edea07875dc4e4807926218e39048b45a986c320b2a41288da4eb7910f53e3f0`
- `tests/edx-wp1-s3-bounded-geometry.test.mjs`：`5bc5bb9b2bf05431b33dc0851a2958e4463a9ebb7dffbfffec9bb823b0d26aa6`
- `tools/edx-wp1-s4-perf-mounted.mjs`：`50ea8518c5dfb3943f95b951281a721741545fea8072123474433dc654e2d93e`
- `tools/edx-wp1-s4-browser-acceptance.mjs`：`0458bfd11596eaa4ae813128671afae45316ca997f2685cfd7dd7dd52180b514`
- `tools/edx-wp2-s8-browser-cases.mjs`：`5c413efd7470c06bd61d9d62fff1b0d4af7ecd46db2a075c6b2324e6753106a5`

STOP WRITING。未宣稱 candidate／GO；Worker 交付止於以上實作與 scoped nonbrowser 證據。
