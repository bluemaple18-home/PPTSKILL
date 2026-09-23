import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const p='/private/tmp/pptskill-s13-independent-', root='/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical';
const json=f=>JSON.parse(readFileSync(f));const s=json(p+'final-summary.json'),i=json(p+'integrity.json'),plan=json(p+'test-plan.json');
const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const artifacts=['scoped.log','nonbuild.log','batch2.log','probe.mjs','probe.log','run.mjs','batch2.mjs','test-plan.json','scoped-summary.json','nonbuild-summary.json','batch2-summary.json','integrity-before.json','integrity.json','integrity.log','integrity.mjs','final-summary.json','zip-test.log'];
const report=`# PPTSKILL WP2-S13 獨立審查報告

日期：2026-09-23。Verdict：**GO**。P0=0、P1=0、P2=0、P3=0。**未發現 findings；未發現阻塞問題。**

本次由未參與實作的 Reviewer 獨立完成 source／diff correctness、安全與 regression 審查，未使用子 agent。GO 僅針對本卡約定能力及固定候選；不授權 merge、push、deploy 或下一個 slice。

## 審查 identity 與範圍

- repo：${root}
- base：18b1029c13444f6b40989f421098a9496ef7db0d
- **reviewed candidate：9b7767d88411e9e9a14e72d011726d67f74371a6**
- runtime product：d4d83ac5daeba30a861404dff78d401ca618c700
- handoff HEAD：26d784e76f6df54dc0b281f7964719554f854293
- 結束讀回 HEAD：${s.currentHead}

先讀 handoff_20260923_edx_wp2_s13_review.md、tasks/edx-wp2-s13-insert-text.md、host-acceptance 卡、receipt、source-hashes。使用 /Users/matt/.codex/skills/code-review-gate/SKILL.md。repo 沒有 config/devflow_context_map.tsv；曾讀到 AI Core 舊 worktree 副本，後定位並以 /Users/matt/ai-core/config/devflow_context_map.tsv、compiled_lite.md（digest 83a10349…）與 rules/11-browser-verification-protocol.md 為現行規則。review-orchestrator 只讀參考，未執行產生 repo 檔案或 fanout 的流程；Owner 明示唯讀、禁止子 agent 優先。

在 source decision 前實際 query CodeGraph：image-insertion preflightInsertion insert-element deck-editor render detached text。回傳 style-candidates/full-deck-renderer/validate-sample，未命中主要插入流程，遂限域 rg 與 diff/source。

產品 diff 限於兩個 runtime 檔；另外審查 S13 新測試、S8 descriptor assertion 修改與兩個 browser harness 檔。candidate→指定 handoff HEAD 只有 control/evidence，runtime/tests/tools/dist 差異為空；結束時 candidate→目前 working tree 的同四組差異亦為空。

審查期間 Mainline 在 tasks/edx-wp2-s13-insert-text.md 加入 6 行獨立審查路由說明，屬 control working change；Reviewer 未寫入。既有 4 個 untracked protected 檔原樣。沒有 commit/merge/push/deploy、repo build、browser launch、新 slice 或 product write。

## Fresh 驗證（本 Reviewer 真正執行）

| 執行 | 實體檔 | 具名 PASS | fail / skipped / cancelled |
| --- | ---: | ---: | --- |
| scoped：S13＋S8＋S9＋S1 | 4 | 83 | 0 / 0 / 0 |
| explicit full 第一批：不呼叫 buildDistribution | 58 | 641 | 0 / 0 / 0 |
| explicit full 補跑：臨時 archive 測試 | 12 | 93 | 0 / 0 / 0 |
| **full 跨兩批合計** | **70 唯一檔** | **734 唯一名稱** | **0 / 0 / 0** |

83 scoped 與 full 有重疊，不加總成 817 個不同測試。full 是兩批，**不是單輪 734**。以實際 ℹ tests/pass 與 ✔ 具名行雙重計數，734 個名稱無重複，未使用 TAP-only parser 的初始 0names 作結果。三次 test process exit 均 0。

最初依「不 build」暫緩 12 檔；Owner 隨後明確允許測試自己 mkdtemp 內的 archive。Reviewer 逐一確認 12 檔均傳 explicit archivePath；tools/build-distribution.mjs:37 只在未提供時才預設 repo dist，38–65 寫入暫存 bundle，66–71 只寫明示 archive 與 sidecar，74 清理暫存 bundle。vendor verification 僅讀檔。故補跑 12 檔，沒有重跑前 641，也沒有重建 repo dist 候選 ZIP。TMPDIR 明設 ${p}scratch，測試產物都在此命名前綴內。

另實際執行單一 ${p}probe.mjs：**8/8 checks PASS**（不是另計 full 具名測試）。Node 與 mounted DOM double 各驗非 NFC 組合字、空白/換行/U+2028/U+2029、HTML-like 文字與 export canonical 保真；新 text 不能 edit-text；不會 throw 的 getter 仍拒絕且讀取 0；combining Unicode 500 接受、501 拒絕且 state 不变。mounted double 不冒稱 browser DOM/layout。

6 個 source 全部 node --check PASS；base→candidate 與 candidate→handoff git diff --check 均 PASS。unzip -t CRC 檢查 exit 0。

可重現入口：

- /opt/homebrew/bin/node ${p}run.mjs（scoped＋第一批，會重新執行）
- /opt/homebrew/bin/node ${p}batch2.mjs（只補 12 檔）
- /opt/homebrew/bin/node ${p}probe.mjs
- /opt/homebrew/bin/node ${p}integrity.mjs（唯讀核對 repo，輸出只在 /private/tmp）

## Source／diff 審查結論

| 契約 | 審查落點與證據 | 結果 |
| --- | --- | --- |
| 精確 text/image variant | runtime/image-insertion.js:8、36、45、81；fields 先查 own data descriptors/prototype，再讀值；component variant 再與 type 綁定；oneOf image+text 對應 Node/portable | PASS |
| getter0／hidden／symbols | text 五層 request/target/value/component/geometry 的 required/unknown/symbol/accessor 檢查；hidden 限定 text，避免擴大 S9 舊契約 | PASS |
| Unicode 1–500、不 normalize | image-insertion.js:21 以 code points 計數；update 原樣複製字串；非 NFC/combining 補充 probe 實測 | PASS |
| S9 non-enumerable File options | shared fields 不要求 enumerable；只有 text validateRequest 增 enumerable gate；snapshotFileOptions 沿原資料描述子快照 | PASS，fresh S9 regression 全通過 |
| shared preflight/update | image-insertion.js:57、67；既有 identity 維持、collision 拒絕、explicit slide、canonical geometry projector 沿用 | PASS |
| escape 安全 | deck-editor.js:429–442、full-deck-renderer.js:65；text 進 escaped 文字內容，image 獨立走 asset policy；沒有將 text 當可執行 HTML | PASS（source＋mounted＋committed browser） |
| atomic rollback | deck-editor.js:434–445；clone/update/clean、唯一 root、detached render/project 均在 commit 前；append-before/after throw 移除本次 node，原 spec/revision/selection/gesture 不變 | PASS，fresh fault cases |
| cross-slide／selection／gesture／revision | 成功後一次 revision、cancel/clear；明示 target 不切 current；舊 roots/styles/identities 保留；drag/resize snap on/off 的 preview 不提交 | PASS |
| S1 authority | 新 node 明設 contentEditable=false；現有 direct-text role allowlist 不變；API edit-text 新 component 拒絕 | PASS，不將 direct-edit 排除列 finding |
| export/offline | 新文字/ID/geometry 保留、transient 清除、remount 再插入及 geometry 操作；原 20 MiB size guard 未改 | nonbrowser fresh PASS；真 offline 僅 evidence-only |
| harness regression | S13 flag 同時跑 S8 image；只新增 S13 cases，Escape observer 改 window capture 先於產品 document stop propagation；未削弱取消/安全 assertions | PASS |

Spec axis：符合修正後正式 S13 契約。Standards axis：保留既有 authority、renderer、asset/geometry 政策；未引入新 runtime/registry/vendor/schema 政策。沒有可落到本次 diff 且可重現的 correctness/security/regression finding；因此 finding exactline/trigger/risk/fix 無項目。

## Fresh integrity

source6 實際 SHA256 與 source-hashes.json、candidate blob 全部 MATCH；protected4 MATCH。前後再次核對未漂移。ZIP ${i.distribution.actualBytes} bytes，SHA256：

${i.distribution.actualSha256}

archive package-manifest.json：PPTSKILL 0.1.0、corePath=core、adapters=codex/claude-code/gemini、requiresGit=false、skillPath=skill/pptskill/SKILL.md。${i.distribution.entries} 個 ZIP entries，沒有 duplicate 或 absolute/.. traversal 名稱。archive **61 個 runtime 檔逐一 byte/hash match 工作樹**，不是只比兩個修改檔。zip sidecar 與 manifest/source receipt 一致；未重建候選 ZIP。

${[...i.hashes.sources,...i.hashes.protected].map(x=>'- '+x.path+'：`'+x.actual+'` MATCH').join('\n')}

## Browser／PGQ：明確 evidence-only，非 fresh browser

本輪沒有開 Chrome/CDP/managed attachment、沒有跑 browser 或 affected PGQ。只核對 handoff HEAD 已提交的 host-harness-repair 證據，不把 Mainline 的既有 log 當自己的 fresh。

- acceptance.json 重新逐 record 計數：1280×720 與 1600×900 各 63（base10＋S8 image40＋S13 text13），兩組 status pass，console/pageErrors/networkFailures/httpErrors/remoteRequests 全 0，targetClosed=true。
- acceptance source.html SHA MATCH；26 份 artifact records 的 bytes/SHA MATCH；6 張 screenshot 的 SHA/bytes MATCH，共 32 個 hashes records 通過。
- controller readinessExit=0、insertTextExit=0、pgqExit=0、browserCloseExit=0、supervisorExit=0、ownedRootAbsent/isolationMarkerAbsent=true，前後 source/protected/ZIP receipt 匹配。
- pgq.log 實數 16 個唯一具名 PASS、fail/skip/cancel=0。這是 Mainline 已提交的單輪 affected PGQ，Reviewer 沒有 fresh 執行。
- 已用 view_image 實際打開 1280 與 1600 的 s13-inserted-text-controls.png：新文字「文字 😀」、escaped script 字面內容、selection box/handle、editor toolbar 可見；長 fixture 在固定 geometry 裁切且與「座標保持一致」重疊。符合 visual-check.md 已列限制，不作自動 layout／避障／完整可讀性的驗收，也不列未實作契約 finding。另四張只做 hash，不宣稱視覺檢視。
- 原 host 首輪 I/O unknown/checks0 與 retry Escape observer 失敗未被掩蓋；本次不宣稱修復其歷史 I/O 根因。
- raw-log-hashes 的 29 個 gzip SHA 及解壓 raw SHA 全 MATCH。27 個旁列 .log byte-match；worker-revised-attempt1.log 與 worker-revised-red.log 僅去除行尾空白，所以不可說全部 plain .log raw-hash match；兩份原始 bytes 在 .gz 完整保留，已逐 byte 規則確認差異僅行尾空白，不影響歷史 FAIL 記錄或本輪判定。

剩餘驗證邊界：真 browser、offline 與 PGQ 依已提交證據，沒有 fresh 環境重跑；mounted double 不能取代真 DOM/排版/OS input。API-only、text 不可 direct-edit、固定 geometry、沒有文字 toolbar/native IME/OS clipboard 等均為既定 scope。

## Fresh stdout、報告與 SHA256

報告：${p}review.md。外部完整 checksum 清單：${p}hashsums.txt（含報告本身）；下列檔案也可單獨重算：

${artifacts.map(f=>'- '+p+f+'\n  SHA256 `'+hash(p+f)+'`').join('\n')}

所有 scripts/logs/report/測試暫存只寫 /private/tmp/pptskill-s13-independent-*；Reviewer 未改 repo/candidate/ZIP/protected。未遇額度阻擋。交還 Mainline 後 **STOP**。
`;
writeFileSync(p+'review.md',report);
writeFileSync(p+'hashsums.txt',[...artifacts,'review.md','report.mjs'].map(f=>hash(p+f)+'  '+p+f).join('\n')+'\n');
console.log(JSON.stringify({report:p+'review.md',sha256:hash(p+'review.md'),hashsums:p+'hashsums.txt',verdict:'GO',counts:{P0:0,P1:0,P2:0,P3:0}}));
