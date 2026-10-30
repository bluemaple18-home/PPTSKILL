# EDX-WP2-S13 — API-driven 安全新增文字元件

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Base/main/origin-main: 18b1029c13444f6b40989f421098a9496ef7db0d（S12 GO closure 已 FF／push；遠端實測一致）
Branch: codex/edx-wp2-s13-insert-text
traces_to: BACKLOG §10.1 decision3 Safe Insert 文字、decision7 identity、decision8 共用 operation；§10.3 WP2；§10.4 insert-element。
Dependencies: S8 shared canonical insertion、WP2-S1 direct text editing 與 S12 Mainline integration 均完成。無未解 blocking edge；只開本 slice。

## 缺口與裁決

既有 insert-element 僅 image；text schema／renderer／editor 已存在。CodeGraph query 回不相關 symbol，rg 確認 image-insertion.js 與 deck-editor detached DOM img-only gate。measured minimum 是同一 operation 多一個精確 text variant；無取代、新 registry、writer、runtime 或第二 mutation authority。少於此無法沿公開 operation 插文字；更多 UI、auto-ID、rich text、paste text、影片／表格／chart、group/history 皆不吸收。

## 契約

1. 公開 Node／portable executeOperation 同一 payload：`{operation:'insert-element',target:{slideId},value:{component:{id,type:'text',text},geometry:{x,y,width,height}}}`。component 只允許 id/type/text；既有 image variant 完整保留。沿既有 ID／geometry／data-descriptor validation，拒絕 getter（讀取 0）、symbols、hidden/unknown/missing fields、非法 prototype、text/image 混搭；descriptor 精確 oneOf 兩 variant，Node／portable 一致。
2. text 嚴格 string，依現有 schemas/deck-spec.schema.json nonEmptyText 的 1–500 Unicode code points；不 trim、不轉型、不 truncate。保留換行、Unicode、空白；HTML-like 內容只作文字 escape，不產生 script/img/link 或執行。schema 不新增格式或容量政策。
3. 共用既有 imageInsertion preflight/update（可保留名稱以免無效 refactor），唯一 stable ID、geometryOverrides、append-before/after-throw rollback；拒絕不得 partial mutation。現有元件 identity／DOM roots／內容／style／typography／motion／其他頁不變；成功一次 revision，cancel gesture 不 commit preview、清 selection；跨頁明確 target 不誤切 current slide。
4. detached render 按 component.type 驗證：image 仍必須 img 並沿 asset projector；text 為既有 text renderer／data-edit-kind=text，沿 geometry projector，新舊 text component 均保留 S1 不可直接編輯的現行邊界；新 node 明設 contentEditable=false，不能因祖先可編輯而繼承。role title/subtitle/keyPoint 的 sync／keyboard／typography 不改。component 仍可沿既有 layout selection／geometry 操作。
5. export／offline reopen 保留文字、ID、geometry與既有內容，清 editor transient；reopened 可再次插入及操作 geometry，text component 仍不可直接編輯。Node render 與 mounted／browser escaped text 一致。沿原 20 MiB export gate。

## 工作與驗收

Worker 先 RED 新 text payload，再 bounded implementation／scoped tests；Mainline 審實際 diff、full explicit non-browser、build ZIP lifecycle、host 雙 viewport、affected PGQ 串行。舊 S8 descriptor image-only assertion 可按新契約改成精確 image+text oneOf，保留所有 image validation assertions。
允許 product files：runtime/image-insertion.js、runtime/deck-editor.js；tests/edx-wp2-s13-insert-text.test.mjs；tests/edx-wp2-s8-insert-image.test.mjs（descriptor only）；tools/edx-wp2-s13-browser-cases.mjs、tools/edx-wp1-s4-browser-acceptance.mjs。若需其他檔案先附 measured gap 回 Mainline。Mainline owns task/evidence/ZIP/control。
Fresh scoped：S13＋S8 canonical/image regression＋S9 File adapter＋S1 direct text（按實體檔案清單）；full = S12 已驗 69 explicit non-browser files + S13。空 filtered file 不算具名 case。
Browser：新增 --insert-text-regression，1280×720／1600×900；base acceptance + existing S8 image insertion + S13 text cases。至少 API text insertion／escaping／跨頁／非法拒絕／geometry／edit/layout/play 模式不繼承 editable、layout 選取與幾何操作／export offline reopen。API-driven 插入，不宣稱文字 toolbar、OS clipboard、native IME；real pointer／keyboard 與 evaluate fixture 分清楚。screenshots 實際核對。
PGQ：既有 content-integrity／sample-approval／full-deck-qa／required-visibility 四支 --test-concurrency=1，一輪16具名 cases。任一 FAIL 保留並分析，不盲 retry。
Source／protected4 hashes、ZIP SHA／bytes、diff --check、managed readiness／Browser.close／supervisor／owned-root marker cleanup 全核對。無 host 則 checkpoint HOST_BROWSER_PENDING，不裸開／unset sandbox。

## 派工與停損

節省模式，一名 clean native Worker fork_context=false，shared sequential single product writer；Mainline 同時只準備 control／驗收腳本。標準 bounded extension，medium；工具僅提供 inherited lane 且禁止未指定的 model override，故不冒稱 Terra，無額外 Reviewer agent。Worker 不跑 browser／PGQ／full／ZIP、不 commit／push／merge、不開子 agent。同類兩次無進展停止回報；Repair 2 需 Owner 成本裁決。
收工停 Independent Review pending；本輪新 slice 禁 merge／push／deploy。回退可整段 revert S13 commits；S12 main 已整合不重寫。

## Mainline 契約裁決（Worker RED 後、runtime 尚未變更）

Worker 查得 S1 Node/browser 明確排除 text component direct editing；Mainline 原先「renderer 存在即有 direct-text 支援」假設錯誤。保留 /private/tmp/pptskill-s13-worker-red.log 及原 receipt，3/3 RED；S1 baseline6/6。此 Slice 只擴 insert-element，不擴 edit-text／directTextTarget authority；上述立即可編輯條款撤回，改鎖不可 editable、geometry 可操作及 offline reinsert。新 S13 tests 依裁決調整，不修改任何 S1 assertions。全 type=text direct editing 留後續候選，未開卡。此為開發初期契約修正，非驗收失敗後放寬通過門檻。

## Mainline 接續進度

Worker 因 usage limit 中断後已 close。Mainline fresh scoped 82/83抓到S9 hidden options regression，限縮text enumerable gate後83/83；full734/734、ZIP lifecycle PASS。Runtime product d4d83ac，harness-only candidate9b7767d。兩viewport各63records（10+40+13）PASS；PGQ進行中，不先宣稱完成。首輪I/O fail與第二輪Escape observer fail完整保留，詳host-triage.md。

## Final acceptance

Candidate 9b7767d88411e9e9a14e72d011726d67f74371a6；scoped83/full734、雙viewport各63（10+40+13）、PGQ單輪16、ZIP/source6/protected4/cleanup PASS。歷史FAIL完整保留；詳receipt／review handoff。S13未merge/push/deploy，未開S14，Independent Review pending。

## Owner 繼續後的獨立審查路由

2026-09-23，Owner續做S13 scope，Mainline裁決接唯一未完成gate。原「無額外Reviewer agent」限開發／驗收階段不疊加reviewer，現進入已列明的獨立review階段：一名未參與實作的clean native Reviewer，fork_context=false，medium inherited lane；非Claude/Gemini外部review，不冒稱跨provider獨立性。Mainline只核對integrity/control，不以自己author驗收取代Reviewer verdict。

Review plan：固定base18b1029→candidate9b7767d，API contract/regression中風險；單一Reviewer覆蓋correctness/security/regression/test-gap，沒有authority/部署/供應鏈變更，無需多視角fanout。fresh scoped83與explicit70檔nonbrowser、source6/protected4/ZIP、evidence-only browser/PGQ及截图；findings須severity/category/path:line/trigger/repro/risk/fix，輸出GO/NO-GO。沒有repo product write、build或browser launch；logs/report只在/private/tmp，Mainline收件後歸檔。禁止merge/push/deploy/開S14；本輪closure需真實Reviewer verdict。

## Closure

Clean native Independent Reviewer GO，reviewed9b7767d，P0–P3全0；fresh83、full兩批641＋93＝734、probe8；browser63+63／PGQ16為committed evidence核對。詳evidence/edx-wp2-s13/independent-review.md與原始報告。Mainline只control/evidence closure，reviewed code／ZIP／protected4不變。未merge/push/deploy，未開S14；main/origin-main18b1029。
