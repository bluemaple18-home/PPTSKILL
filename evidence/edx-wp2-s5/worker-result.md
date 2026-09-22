# WP2-S5 Worker receipt

狀態：stopped writing；Independent Review candidate，非 Mainline acceptance GO。
Repo：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical
Branch：codex/edx-wp2-s5-targeted-image-file
HEAD：1133dcb542d834fe78539f35c7b08c2a278fe0b5（未改）

## 結果與邊界

optional replaceImageFile(file, target) 已實作。undefined／省略沿目前頁第一張；明示 target 經共用 S4 exact own-data plain/null-proto 驗證並複製 stable ID，optimizer 前確認既有 image，完成時重查 captured identity，提交沿原 replace-asset。沒有 file 仍回 null。
未新增 UI、schema、registry、selection authority 或 mutation 路徑；asset optimizer／size policy 未改。status 結果訊息在 commit 前計算，避免 malformed warnings 在提交後才拋錯。

產品僅六檔：
- runtime/asset-replacement.js：抽出並共用 validateTarget；原 descriptor／mutation 保留。
- runtime/deck-editor.js：optional target admission、snapshot、live validation；保留舊 missing-target error。
- tests/edx-wp2-s5-targeted-image-file.test.mjs：20 個 mounted cases，包含 default/undefined/strict/getter0/optimizer0、跨頁、non-enumerable/null-proto、caller mutation、async export/switch、missing/type-change/reject/invalid result、DOM、完整 canonical 保留、gesture no-op/stale、長 ID、export roundtrip。
- tools/edx-wp1-s4-perf-mounted.mjs：僅測試 VM 注入 mutateSpec hook，重現 canonical image 移除／type-change；未進產品 API。
- tools/edx-wp2-s5-browser-cases.mjs：API-driven 真 File／optimizer、指定第二張、caller mutation/export/switch、cross-slide/default/undefined、strict admission optimizer0/getter0、DOM decode/alt/fit/geometry、export/offline。
- tools/edx-wp1-s4-browser-acceptance.mjs：import、S4 fixture reuse、--targeted-image-file-regression dispatch。原 base10 pointer、1280→1600、errors0／targetClosed 路徑保留。

## 驗證與命令 counts

node --test 共 5 次，均明列檔名，沒有 glob。共 156 個執行實例：154 PASS／2 FAIL（包含 true RED 與已修正 regression）；最終 unique selection 67/67 PASS。

| 次序 | 明列 selection | 結果 | log |
| --- | --- | --- | --- |
| 1 | S5 單檔，僅首個案例 | 0/1，true RED | /private/tmp/pptskill-wp2-s5-red.log |
| 2 | S5 單檔，最小 GREEN | 1/1 | /private/tmp/pptskill-wp2-s5-green-minimal.log |
| 3 | S5 單檔，完整 mounted | 20/20 | /private/tmp/pptskill-wp2-s5-mounted.log |
| 4 | S5＋S4＋perf＋asset-size | 66/67 | /private/tmp/pptskill-wp2-s5-targeted.log |
| 5 | 相同四檔 | 67/67 | /private/tmp/pptskill-wp2-s5-targeted-final.log |

S5 單檔命令：
`node --test tests/edx-wp2-s5-targeted-image-file.test.mjs`

最終四檔命令：
`node --test tests/edx-wp2-s5-targeted-image-file.test.mjs tests/edx-wp2-s4-replace-asset.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/p1-r10-asset-size.test.mjs`

node --check 共 6 次（上列六檔），全 PASS；git diff --check 共 2 次，全 PASS。
真 browser／browser runner／fixture-only runner／full tests／ZIP build／probe：全部 0 次。
commit／切 branch／merge／push／deploy：全部 0 次。
以上 counts 是測試／驗證／受限操作命令，不包含唯讀探索與編輯工具呼叫。

## 失敗歷史（未覆蓋 log）

1. true RED：未修改 runtime 時 explicit 第二張 target 被忽略，第一張誤改；assert deepEqual 捕捉真實行為差異，非 import／syntax 假失敗。
2. scoped regression 首輪：既有 perf 案例要求 /圖片元件已移除/，新 validation 改了錯誤文案。恢復原文案後相同 selection 全 PASS；沒有放寬 test。
3. 唯讀 discovery 曾遇 repo 不含 config/rules、錯猜 ai-core 路徑、zsh 無匹配 editor glob／不存在 local-patch 檔；改用 /Users/matt/ai-core 與明列 deck-editor.js。一次檔名探索誤涵蓋父 workspace，輸出過多截斷；未執行其內容、未造成產品變更。CodeGraph 一次 query 回傳無關符號，改 bounded rg。這些不是產品／測試 blocker。

無 blocker；沒有同 blocker 兩次無進展。沒有重跑 browser/full/ZIP 或執行任何可間接 build ZIP 的 selection。

## 全部改檔 SHA256

| 檔案 | SHA256 |
| --- | --- |
| runtime/asset-replacement.js | `124ec868348fa4fea9b5ecc59a94a6001550b24dc392b784dbd8791c1f40b5bf` |
| runtime/deck-editor.js | `92e608690b6262dd102c8cb48dfc023ecd337f6bd5ee39f86a3b3bbc049bd8fd` |
| tools/edx-wp1-s4-perf-mounted.mjs | `9a5f6581a7602c468c379a6e3ead1c517c08bdd4b0c0d568d9350a261a742ec3` |
| tools/edx-wp1-s4-browser-acceptance.mjs | `b8ae1eeb298e21ab4447ac0e9e8b4f5ead631e2c852c71eec8c365abc6a1bead` |
| tools/edx-wp2-s5-browser-cases.mjs | `93f30319adc163df386aca89641316443cc0216b3136dfaad61f2dc1a3fd12a2` |
| tests/edx-wp2-s5-targeted-image-file.test.mjs | `a8ff67177a5242c4c1aeef5b2e561e00437a2a3d9314f7360d0aa146e987ec9f` |

## Protected 與限制

/private/tmp/pptskill-wp2-s5-protected-before.log 與 /private/tmp/pptskill-wp2-s5-final-check.log：.DS_Store、CLAUDE.md、HANDOFF-20260914-P0-R11-R1-S3.md、HANDOFF-20260914-PGQ-WP1.md，4/4 SHA256 MATCH。
未寫 tasks/control/evidence 或任何 protected 檔；主線既有 evidence/edx-wp2-s5 與 host card 保留。runtime/tests/tools 之外只寫 /private/tmp receipt/log。

browser module 已完成且語法通過，尚未真 browser 驗證，不能宣稱 live geometry、decode、offline、errors0 或 targetClosed 已實測。Mainline 依 host 卡執行正式 managed browser、四支 PGQ、full nonbrowser、ZIP/build/probe/hash 等；Worker 未執行或接管。
mounted 的 optimizer 是既有 stub，type-change 用 test-only injection；真 File／真 optimizer 的證據必須由 browser host 補齊。
無新 pointer-update wholeSpec 掃描／serialization；既有 perf selection PASS。ZIP bytes 差額未量測，留 Mainline。

回退範圍僅以上六個產品檔；不動其他未追蹤檔。Worker 在本 receipt 完成後停止寫入。
