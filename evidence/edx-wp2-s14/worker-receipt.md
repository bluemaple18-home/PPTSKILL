# PPTSKILL S14 bounded Worker receipt

狀態：REVIEW_CANDIDATE／STOP。Worker 自驗完成；Mainline 接正式驗收。本 receipt 不是獨立 Review 或正式 GO。
repo：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical
branch：codex/edx-wp2-s14-edit-text-component

## Changed files（僅六檔）
- runtime/deck-editor.js
- runtime/image-insertion.js
- tests/edx-wp2-s14-edit-text-component.test.mjs
- tests/edx-wp1-s2-stable-identity-operation-path.test.mjs
- tools/edx-wp2-s14-browser-cases.mjs
- tools/edx-wp1-s4-browser-acceptance.mjs

## 實作
- Node／portable 同一 edit-text 新增 type=text component 分流，私有 canonical type guard；不依 descriptor 放寬其他 type。
- S13／S14 共用 imageInsertion.validateTextValue：1–500 Unicode code points；保留 non-NFC、空白、換行、HTML-like text。
- exact plain／null-proto／crossrealm data descriptors；getter0，拒絕 unknown／symbol／hidden／非法 prototype。S9 nonenumerable image／File 舊契約維持。
- portable 先 clean(candidate) 並確認無額外清理差異，驗 unique connected slide、element ID／edit-target／canonical text、純文字子節點；textContent 原地投影。setter-before／after throw 回復舊子節點／文字、保留原 root；提交前不改 canonical／revision／gesture／selection。
- 同值不呼叫 DOM setter、不取消 preview；成功一次 revision 並取消 preview／清 selection；IME 組字拒絕、其他未 sync role DOM 不提交。
- S1 direct UI、S13 不可 editable、legacy JSON editor 未修改。role 值政策沿舊路徑：portable 空 subtitle 可接受；Node 原有 deck validation 仍拒絕空 subtitle（未收緊）。
- browser flag --edit-text-component-regression 接既有 asset fixture，順序 base → S8 → S13 → S14；含真 pointer drag／resize、snap false／true、API fixture、setter／IME fixture、escaped text、identity／geometry 保留、offline reopen/reedit/insert/move 與每 viewport 一張 screenshot。

## 真 RED → GREEN
1. 修改 product 前執行新 S14：26 tests，11 pass／15 fail。
   /private/tmp/pptskill-s14-worker-red.log
   具名失敗含：Node／mounted existing／new／cross-slide、exact data descriptors getter0、null-proto／crossrealm、descriptor、snap false／true drag／resize、IME guard。
2. 首次 product 實作後：26 tests，23 pass／3 fail。
   /private/tmp/pptskill-s14-worker-green-attempt1.log
   定位為 fixture／既有政策：Node 空 subtitle 原有 validator 拒絕；citation 需 public:true 才不被 sanitizer 移除。修正新測試 fixture 與 legacy policy assertion；未擴張產品契約。
3. 六檔第一次 scoped：119 tests，119 pass／0 fail。
   /private/tmp/pptskill-s14-worker-scoped-attempt1.log
4. 補強 hash collision／跨頁同 ID／reorder／export stable pair（Node＋mounted）及同值 setter 呼叫數，最後六檔 scoped：122 tests，122 pass／0 fail。
   /private/tmp/pptskill-s14-worker-scoped-final.log

| 實體檔案 | 最終 pass |
| --- | ---: |
| tests/edx-wp2-s14-edit-text-component.test.mjs | 29 |
| tests/edx-wp2-s13-insert-text.test.mjs | 22 |
| tests/edx-wp2-s8-insert-image.test.mjs | 20 |
| tests/edx-wp2-s9-insert-image-file.test.mjs | 35 |
| tests/edx-wp2-s1-direct-text-edit.test.mjs | 6 |
| tests/edx-wp1-s2-stable-identity-operation-path.test.mjs | 10 |

重現命令（repo root）：
```sh
/opt/homebrew/bin/node --test tests/edx-wp2-s14-edit-text-component.test.mjs tests/edx-wp2-s13-insert-text.test.mjs tests/edx-wp2-s8-insert-image.test.mjs tests/edx-wp2-s9-insert-image-file.test.mjs tests/edx-wp2-s1-direct-text-edit.test.mjs tests/edx-wp1-s2-stable-identity-operation-path.test.mjs
```

四支修改 runtime／browser .js/.mjs 的 node --check 與 git diff --check 均 exit 0。所有中間 fail log 保留，不覆寫。

## 邊界與剩餘風險
- 未執行 browser／PGQ／full／build／ZIP，未 commit／push／merge／deploy，未用子 agent。protected4 無 Worker 寫入。
- 真 browser pointer／DOM Text node 回復、errors0／targetClosed、1280×720／1600×900 截圖實檢與 offline 正式證據尚待 Mainline；mounted 是 DOM double，不冒稱瀏覽器排版或 native IME。
- 工作中觀察到 BACKLOG.md、evidence/edx-wp2-s14/、tasks/edx-wp2-s14-host-acceptance.md 的 control/evidence 變更；Worker 未寫入或還原。初始既有未追蹤 .DS_Store／CLAUDE.md／兩份 HANDOFF 未動。
- CodeGraph 已先 query executeOperation edit-text image-insertion validateText，回傳無關 style/composition symbols；再限域 rg。實體 task、devflow_context_map implementation/frontend 對应 compiled_lite、05 coding、11 browser rules 已讀。
- 無其他實體測試阻擋而需擴充允許檔案；未出現同類兩次無進展。

## 交付檔案 SHA-256
```text
c1997be759d8f515b350c45fb98ed2578993f386b4f66a56deca3fe1e95a31d5  runtime/deck-editor.js
0c250610800a2eb59adea70289e03d3f021679aafc9859f120259aaae262d646  runtime/image-insertion.js
7c324a5fe96bfd17cc41d64decf5dce815977777d204b2941ee79a381567eedb  tests/edx-wp2-s14-edit-text-component.test.mjs
864c98c1f7d9bfe681adf97abda12ef36daecbb0e900d4eeaa516dbe5f0cce59  tests/edx-wp1-s2-stable-identity-operation-path.test.mjs
a2e5a8add67bd5754dda8bfe50c7abb93f8ea3fb21959f2521b8576831571233  tools/edx-wp2-s14-browser-cases.mjs
abd0f6da795824ff272930a94109e0e5ba51fb055efc62f5346118bcd805620c  tools/edx-wp1-s4-browser-acceptance.mjs
```

STOP：Mainline 接正式驗收。
