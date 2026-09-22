# WP2-S4 Worker 交付（local-only）

狀態：stopped writing。產品實作與 scoped 測試完成；不是最終 acceptance GO。
Source HEAD：b04f399f07e499a4996c4db5d4acfa653f6a7cbd。
Branch：codex/edx-wp2-s4-replace-asset。未切 branch／commit／merge／push／deploy。
Repo：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical。

## 全部產品改檔（9）

- runtime/asset-replacement.js（新增）：共用 serializable strict payload／image stable target mutation／局部 DOM projector／descriptor；重用 asset-policy。
- runtime/deck-editor.js：registry 接入，Node replaceImage 與 portable replaceImageFile 皆經 executeOperation；缺省保留，async captured stable target，canonical/DOM 回退，semantic revision。
- tests/edx-wp2-s4-replace-asset.test.mjs（新增）：Node/portable strict、getter zero、symbol/proto/inherited/extra、multi-image、preservation、長 ID、non-enumerable data properties、DOM identity、atomic rollback、optimizer async、gesture stale/noop、export/reparse、PNG 結構檢查。
- tests/edx-wp1-s2-stable-identity-operation-path.test.mjs：必要 registry snapshot 增補 replace-asset。
- tests/edx-wp1-s3-bounded-geometry.test.mjs：必要 registry snapshot 增補 replace-asset。
- tests/edx-wp1-s4-managed-browser-attach.test.mjs：新增 asset-replacement flag 的 mocked attach／listener／owned cleanup coverage。
- tools/edx-wp2-s4-browser-cases.mjs（新增）：獨立 API-driven 案例 module，真實小 PNG＋canvas 圖、第二 image canonical/live DOM、真 optimizer 延遲結果、export 換 object／切頁、離線 reopen；不宣稱新圖片 UI 或 OS clipboard。
- tools/edx-wp1-s4-browser-acceptance.mjs：三處接線 import／fixture／--asset-replacement-regression dispatch。原十個 base pointer cases、1280×720→1600×900、hooks/errors/targetClosed 仍走原 runner。
- tools/edx-wp1-s4-perf-mounted.mjs：DOM double image child，用於局部投影與 clone/export 的有效測試。

四個 protected untracked 未編輯。未寫 control/task/evidence 產品內容；工作中主線新增的 evidence/edx-wp2-s4 與 tasks/edx-wp2-s4-host-acceptance.md 未碰。
注意下面「執行範圍偏差」：既有測試的間接 browser/ZIP 行為違反 Worker 分工，不能因此宣稱全程沒有啟動嘗試或 ZIP 產出。

## 最終驗證

111/111 PASS，log：/private/tmp/pptskill-wp2-s4-final-targeted.log。

```sh
node --test tests/edx-wp2-s4-replace-asset.test.mjs tests/edx-wp1-s2-stable-identity-operation-path.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/edx-wp1-s4-managed-browser-attach.test.mjs tests/p0-r7-editor-export.test.mjs tests/p1-r10-asset-size.test.mjs tests/edx-wp2-s1-direct-text-edit.test.mjs tests/edx-wp2-s2-role-font-size.test.mjs tests/edx-wp2-s3-copy-font-size.test.mjs
```

另：git diff --check，node --check runtime/asset-replacement.js、runtime/deck-editor.js、tools/edx-wp2-s4-browser-cases.mjs、tools/edx-wp1-s4-browser-acceptance.mjs 全 PASS。最終逐檔 SHA256 與 source SHA 保存在 /private/tmp/pptskill-wp2-s4-final-check.log。

20MiB size policy 原封不動，仍在既有 export guard；未新增 operation 層 HTML size 計算或放寬 policy。現有 asset-size tests 通過。正式 browser 中 decode()、computed DOM／canonical export 比對仍待主線。

## 測試命令與完整失敗歷史

以下 log 都保留，沒有覆蓋失敗 log。

1. red.log：`node --test tests/edx-wp2-s4-replace-asset.test.mjs`，0/6。首次 runtime 改動前已得到真正 RED：portable operation 不支援、strict getter 被執行、registry descriptor 缺失。另三個 Node FAIL 是測試 fixture 的 underline-sweep 少必要 subtitle target，不能冒稱那三個是產品 RED。
2. green-1.log：同命令，3/6。portable operation／strict／registry 已 GREEN；Node 三個 FAIL 同上 fixture（與 red 的該三個是同根因，但整體從 0→3 有進展）。補上合法 subtitle target，未改 motion runtime。
3. red-node-baseline.log：以 `node --input-type=module` 讀 `git show b04f399:runtime/deck-editor.js`、absolute file URL 重寫 imports 後以 data-module 執行舊版；fixture(0) image 設 alt=保留/fit=cover，只傳 dataUri 呼叫 replaceImage，assert 原 alt。FAIL `'' !== '保留'`，直接確認 Node baseline 缺省覆寫。這是實作後補充的 baseline 驗證，不偽稱在實作前。
4. green-2.log：`node --test tests/edx-wp2-s4-replace-asset.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/p0-r7-editor-export.test.mjs`，27/28。新 operation 在 removed slide 回「找不到 slide」，舊 perf 契約要求「圖片元件已移除」。加 wrapper 存活檢查保留原訊息；與 motion fixture 不同 blocker。
5. green-3.log：同第4命令，新增 async/DOM 測試後 33/34。測試把 img.style.setProperty 指派成 throw，但 DOM double Proxy.set 把它當 CSS 欄位，沒有真的覆寫 method。改成替換 img.style 為 throwing stub；runtime rollback 不須改。與第4不同 blocker。
6. targeted.log：`node --test tests/edx-wp2-s4-replace-asset.test.mjs tests/edx-wp1-s4-perf.test.mjs tests/p0-r7-editor-export.test.mjs tests/edx-wp1-s2-stable-identity-operation-path.test.mjs tests/edx-wp2-s2-role-font-size.test.mjs tests/edx-wp2-s3-copy-font-size.test.mjs`，61/61 PASS。
7. full-nonbrowser.log：實際命令是 `node --test tests/*.test.mjs`，452/458，6 FAIL。名稱錯誤：這不是純 nonbrowser！2 FAIL 為 bounded-geometry registry snapshot 尚缺 replace-asset（Node/VM 同一原因）；已必要更新。另4 FAIL 為同批 browser 依賴環境不可用（DevTools port 未就緒，兩支再表現為空 stdout JSON parse error）；停止該環境路徑，未重試、更未換 selection 重置同 blocker 預算。
8. harness-final.log：`node --test tests/edx-wp2-s4-replace-asset.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs tests/edx-wp1-s4-managed-browser-attach.test.mjs tests/p1-r10-asset-size.test.mjs`，54/54 PASS。
9. 額外唯讀 PNG 診斷：inflate scanline 成功，但 CRC check 發現 IDAT=false；修正 fixture CRC。加入 PNG signature／chunk CRC／尺寸／scanline／render test。不是 browser failure，也沒有跑 browser 來試錯。
10. final-targeted.log：上述最終命令，111/111 PASS。包含後續 non-enumerable data property 明確複製與 fixture CRC test；沒有未解的 scoped product FAIL。

全部 log 前綴 `/private/tmp/pptskill-wp2-s4-`。沒有透過換測試選擇宣稱被排除的環境 FAIL 已解；它仍屬未完成 host acceptance。

## 執行範圍偏差與主線待辦

- Worker 誤把 `tests/*.test.mjs` 當 nonbrowser，導致4支既有 PGQ tests 間接執行 browser-geometry-qa，嘗試 standalone Chrome spawn；皆無 ready DevTools port，無成功 browser 驗收證據。已明確通知主線。既有工具 finally 有 SIGTERM 與 profile rm；本次未獨立量測 process cleanup，不能宣稱 managed cleanup receipt PASS。
- 同一全測試命令也間接執行多支 buildDistribution／ZIP 測試（tmp archive），違反 Worker 不做 ZIP 的分工；未將其算成主線 ZIP build/probe/source freeze 的完成證據。未直接執行 tools/build-distribution CLI、未寫 repo dist；不清除歸屬不明 tmp 產物。
- 主線須依既有正式 tmp_session／容量與 host 卡執行 --asset-replacement-regression、4支 affected PGQ 串行、最終 nonbrowser/ZIP/probe/hash/protected 與 managed cleanup。這份 worker receipt 不取代該等驗收。
- 本輪 CodeGraph 實查 query=`replaceImage replaceImageFile executeOperation operation registry`、projectPath 指向 canonical，結果只給無關 design-grammar；依卡限定 fallback 到 editor／asset policy／renderer／mounted helper／相鄰測試與 runner，未新建 graph/index。
- 最終僅已核准的 image-only operation；沒有新 selection/file picker UX/crop/drop/clipboard/schema/dependency。

stopped writing
