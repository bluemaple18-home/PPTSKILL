# PPTSKILL WP2-S3 Worker 交接

狀態：SCOPED PASS / STOPPED WRITING；尚非 full acceptance / browser PASS / review candidate。
時間：2026-09-22T05:07:20.974Z
Repo：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical
Branch：codex/edx-wp2-s3-copy-font-size
交接 HEAD：1165f140f5ead0d0ef7813955275c2670221d500
Worker 沒有 commit / merge / push / deploy，沒有啟 browser、fan-out、寫入 BACKLOG/tasks/handoff/evidence/dist/protected。

## 完成範圍

- 單一 session closure snapshot 恰為 {fontSize}；copy 只取 canonical explicit integer 16..160，invalid/default source 保留原 snapshot。
- Node/portable 共用 exact request/target/value={} helper；拒絕多餘欄位、prototype/inherited/getter（測試驗證 getter 未執行）。
- paste 遞迴進原 set-typography mutation/projector；原 executeOperation spec 回傳契約維持，copy/no-op 不增 revision。
- toolbar 複製字級／貼上字級，canonical override 與 snapshot 決定 disabled；切頁/模式清 target；portable API 也要求 active text target，IME UI/API 均拒絕。
- UI 合法操作走既有 syncText；snapshot 跨頁/模式/source修改/reset/刪除保留；export 不清 live clipboard，reopen 空 clipboard。
- 兩處 exact registry snapshots 增列新 operations，未弱化舊 assertions。mounted stub 增按鈕與 test-only revision probe，產品 API 未增 probe。
- 新 --style-copy-regression 重用 attach-only runner；双 viewport 1280×720/1600×900。真雙擊、number input/CDP 輸入、按鈕 pointer；rect 非零與 elementFromPoint hit 均驗證，避免 hidden=false/rect0 假通過。涵蓋跨頁 snapshot、IME、stale target、export/live clipboard、source刪除、offline reopen 空 clipboard；IME 明示 synthetic。

## 精確 Worker 改檔（9 檔；SHA-256）

|檔案|SHA-256|
|---|---|
|runtime/deck-editor.js|8f541520a9be93e936ba4a776a27a11fe9f1ef0516b1cff165a37362f06e9fc6|
|runtime/role-typography.js|bc6072e6992b0ceb02bc63a487bae2507fc2b7ef834e5ae4eb1d57f06673399e|
|tests/edx-wp2-s3-copy-font-size.test.mjs|fda215d7f6dfa1414c8dccc596b09f4e2ec445b10a49159343f19790e0e20295|
|tests/edx-wp1-s2-stable-identity-operation-path.test.mjs|6da66980536f35ec06fd290c9f32eb1786ae4728404dfa77eda5d43ef104e771|
|tests/edx-wp1-s3-bounded-geometry.test.mjs|df6ffb7dc801bd2f5dccb61d0860212d75d2ee9c9e9456db3534ae1dfb3a6d4e|
|tests/edx-wp1-s4-managed-browser-attach.test.mjs|ea7c8aa6b9da65829df201505f579c034b3be51a6850a62982b41a2ce2ced01b|
|tools/edx-wp1-s4-browser-acceptance.mjs|ec47cab9f8a79a394c0c6050561fd9df4b239443959ee2e5464f1c2a2555d1f0|
|tools/edx-wp1-s4-perf-mounted.mjs|26a7c85c1d9b83af3cc81be908a474e2bed8617234971525d38293b93dfb3093|
|tools/edx-wp2-s3-browser-cases.mjs|2825bff03018f90929d266a56ea993e150085ea98dd391fce4e2b4e0c33a3cfa|

其中新檔：tests/edx-wp2-s3-copy-font-size.test.mjs、tools/edx-wp2-s3-browser-cases.mjs。

## Commands / counts / failures

所有命令 cwd 均為上述 repo；node=/opt/homebrew/Cellar/node/25.9.0_3/bin/node（v25.9.0），沒有新增 dependency。

1. RED（產品修改前）：
   node --test tests/edx-wp2-s3-copy-font-size.test.mjs > /private/tmp/pptskill-wp2-s3-red.log 2>&1
   6 tests / 0 PASS / 6 FAIL。預期：operation 尚不支援、descriptor/toolbar 缺少。
2. 初次 GREEN 嘗試：
   node --test tests/edx-wp2-s3-copy-font-size.test.mjs tests/edx-wp2-s2-role-font-size.test.mjs > /private/tmp/pptskill-wp2-s3-green-attempt1.log 2>&1
   13 tests / 12 PASS / 1 FAIL。Node 測試 fixture 缺 subtitle 使既有全 spec validator 拒絕 seed set-typography；修正為初始 fixture 直接帶 explicit override 後 copy。未放寬 validator。
3. focused 第二次：
   node --test tests/edx-wp2-s3-copy-font-size.test.mjs tests/edx-wp2-s2-role-font-size.test.mjs tests/edx-wp2-s1-direct-text-edit.test.mjs tests/edx-wp1-s2-stable-identity-operation-path.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs > /private/tmp/pptskill-wp2-s3-green-attempt2.log 2>&1
   46 tests / 46 PASS / 0 FAIL。
4. 最終 scoped（補完 getter hardening、browser runner flag 後）：
   node --test tests/edx-wp2-s3-copy-font-size.test.mjs tests/edx-wp2-s2-role-font-size.test.mjs tests/edx-wp2-s1-direct-text-edit.test.mjs tests/edx-wp1-s2-stable-identity-operation-path.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs tests/edx-wp1-s4-managed-browser-attach.test.mjs > /private/tmp/pptskill-wp2-s3-scoped-final.log 2>&1
   59 tests / 59 PASS / 0 FAIL / 0 skipped / 0 cancelled，exit=0。S3 9 tests，其餘保留 S1/S2/registry/geometry/managed attach 舊 checks。
5. Harness 語法：node --check tools/edx-wp2-s3-browser-cases.mjs，exit=0。
6. Fixture-only（不開 browser）：
   node tools/edx-wp1-s4-browser-acceptance.mjs /private/tmp/pptskill-wp2-s3-fixture --style-copy-regression --fixture-only > /private/tmp/pptskill-wp2-s3-fixture.log 2>&1
   exit=0；source.html 494394 bytes，SHA-256 3045440e036f894be10d23bf1ad5af72e9c1de747ec01ff5c71910dc523e6bbd。
7. git diff --check > /private/tmp/pptskill-wp2-s3-diff-check.log 2>&1，exit=0（空 log）。

## Raw logs

- /private/tmp/pptskill-wp2-s3-red.log
  SHA-256 73df8bf06ea168bee33fbd54d1a918c8522f9921258d894c45a04570a2c6c761
  ℹ tests 6; ℹ pass 0; ℹ fail 6; ℹ cancelled 0; ℹ skipped 0
- /private/tmp/pptskill-wp2-s3-green-attempt1.log
  SHA-256 f79d788b83e4f541c02ca873a0227ff6d124b7b577ccc2ac45b6ea0044de2fef
  ℹ tests 13; ℹ pass 12; ℹ fail 1; ℹ cancelled 0; ℹ skipped 0
- /private/tmp/pptskill-wp2-s3-green-attempt2.log
  SHA-256 306d9a7cfd1ddb286cdaed2e975b2575d929df60a4bff88e9f80463123b15fc2
  ℹ tests 46; ℹ pass 46; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0
- /private/tmp/pptskill-wp2-s3-scoped-final.log
  SHA-256 b9520136f1e2996a161dae470631cacb670970b194dfb01ec696c60f12b06b95
  ℹ tests 59; ℹ pass 59; ℹ fail 0; ℹ cancelled 0; ℹ skipped 0
- /private/tmp/pptskill-wp2-s3-fixture.log
  SHA-256 089f92074b9a5e601f6884227f4e04a5096a3a9bdf74c9d5c56aefd3941a110b
  見原始輸出
- /private/tmp/pptskill-wp2-s3-diff-check.log
  SHA-256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  見原始輸出

## 主線續接／限制

- 未執行 full nonbrowser、ZIP lifecycle、protected hash freeze、真 browser、四支 affected PGQ；遵照 single-writer Worker 邊界留給主線。managed attach tests 使用 mock CDP，不冒充真 browser PASS。
- Host 命令：node tools/edx-wp1-s4-browser-acceptance.mjs <host-evidence-dir>/style-copy --style-copy-regression（需 Mainline managed PPTSKILL_DEVTOOLS_ACTIVE_PORT）。
- Browser case 按鈕尺寸/hit assertions 與真 pointer 已寫入，尚待主線驗證真實 rendering/OS 行為。
- 沒有未解 scoped test failure。先前 RED 與 fixture FAIL 全數保留 raw logs，沒有混合計算成單輪。
- CodeGraph 兩次查詢未回傳相關 editor/typography 符號（只回既有 style-candidates），依指令 fallback rg。首次定位 context map 時 home rg 產生權限 denied，未寫入相關路徑；後續定位 /Users/matt/ai-core/config/devflow_context_map.tsv。
- 卡片 current HEAD 與卡中 Base 不同，啟動時 HEAD 為 1165f14；branch 正確。未 reset/rebase。
- Shared workspace 觀察到 Mainline control 變更（BACKLOG 及 host acceptance 卡等）；不屬上述 Worker 改檔，未改動／還原。
- 適用規則 frontend change-mode=addition / operate，沿用既有 toolbar 與 S2 CSS specificity，不導入視覺系統或額外 dependency。

## 工作樹觀察（僅紀錄，不代表均由 Worker 修改）

```text
M BACKLOG.md
 M runtime/deck-editor.js
 M runtime/role-typography.js
 M tests/edx-wp1-s2-stable-identity-operation-path.test.mjs
 M tests/edx-wp1-s3-bounded-geometry.test.mjs
 M tests/edx-wp1-s4-managed-browser-attach.test.mjs
 M tools/edx-wp1-s4-browser-acceptance.mjs
 M tools/edx-wp1-s4-perf-mounted.mjs
?? .DS_Store
?? CLAUDE.md
?? HANDOFF-20260914-P0-R11-R1-S3.md
?? HANDOFF-20260914-PGQ-WP1.md
?? tasks/edx-wp2-s3-host-acceptance.md
?? tests/edx-wp2-s3-copy-font-size.test.mjs
?? tools/edx-wp2-s3-browser-cases.mjs
```
