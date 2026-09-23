# EDX-WP2-S18 — 安全刪除獨立文字／圖片元件

Status: CLOSED / MAINLINE_CODE_REVIEW_GO / HOST_ACCEPTANCE_PASS
Base/main/origin-main: e3b90a8969f6d25416e746feefecba718d8d8931
Branch: codex/edx-wp2-s18-delete-element
traces_to: BACKLOG §10.1 decisions3/7/8、§10.3 WP2、§10.4 delete-element。
Blocking edges: S8/S13 插入、S14/S16/S17 編輯均已結案整合；無阻斷。Jira: not-applicable，本機開發切片。

## 目標與最小裁決

Measured gap：既有 Operation Registry 已可插入／編輯文字與圖片，但沒有 delete-element；現有「刪除」按鈕是刪除整張 slide。承接同一 Content/Asset Editing scope，先補可重現 API 閉環。CodeGraph query 未返回相關 symbols，已限域 rg/read 確認 deck-editor、image-insertion 與 descriptors。無取代；現有刪除 slide 行為不變。
Prior Art: repo 已驗收 createDeckEditor/executeOperation、imageInsertion shared pure contract、stable identity、export cleanup。Classification: DIRECT_REUSE 既有 authority + bounded CUSTOM_DELTA membership removal；License/Version: repo 自有 code，固定本卡 base，無新增 vendor。Bundle/Portable Cost: 新增 first-party runtime bytes，以 fresh ZIP 實測；20 MiB 不放寬。Why Custom: DeckSpec membership／引用政策屬產品資料契約，無需重造 editor primitive。Why not less: 只有插入沒有移除；why not more: toolbar/keyboard delete、history、crop、group/lock、影片、typography schema 及新 persistence 均不納入。

## 契約與驗收

1. 唯一 public 入口為既有 executeOperation：operation=delete-element，target 恰為 slideId/elementId，value 恰為 confirm=true。缺少／false／非 boolean 確認拒絕。request/target/value 必須 plain data objects、own enumerable exact keys；拒絕 getter、symbol、hidden extra、prototype payload，且不得執行 getter。descriptor 明示 destructive、需要 confirmation、undoable=false；本輪無 Undo/Redo claim。
2. canonical target 僅獨立 type=text 或 image component；role/keyPoint/table/chart/citation/缺 target/另一 slide 錯 target 拒絕。若 composition.slots、composition.order 或 composition.motion 仍引用 target（依現有實體格式識別），fail loud，不自行重編 layout 或拆掉引用。不得新增 origin/provenance 欄位來猜測是否由插入產生。
3. 只移除該 component membership 與其 component-ID geometryOverrides entry，空 geometry map 依既有 sanitizer 正規化；其餘 content、component 順序／identity、slots/order、typography、motion、background、style、其他 slides 保留。先比較刪除前後所有 surviving stable element IDs，任何 remap/collision 均拒絕。Node 及 portable 共用同一 pure contract，不新增 registry/writer/schema。
4. Node canonical 更新沿 candidate→validation→commit。Portable mounted 先檢查唯一 canonical slide/root/connected target node/data-edit-target/type 與內容一致；DOM 缺失、duplicate、detached、偽造／stale 一律原子拒絕，不拿其他 node 頂替。成功才移除正確 live node、提交一次 canonical/revision，其他 nodes 保持 object identity。DOM removal throw（before/after effect）須保住 canonical 並還原原位置，不留下半完成。同步 reentry 不可重複提交。重複刪除應明確拒絕且不改任何資料。
5. 沿既有 gesture／selection／pending ownership；成功取消 active preview、不誤提交 geometry，清除失效 selection/context UI，若 S16 正編輯被刪除 target，清 draft 且不得復活已刪內容。image async／picker 與 text submit busy 必須 fail closed 或沿現有無競態 seam；不得讓 async continuation 復活 target。驗 snap on/off、gesture、dialog、其他 component 的 geometry 保留、API-only VM 相容。被拒絕操作不得偷偷提交 draft 或破壞 live state。
6. fresh export 不含刪除 component／stale geometry／editor-only transient；extract/sanitize/render round-trip 無 dangling refs。離線重開後仍可插入、編輯與再次刪除。可重新插入已空缺 ID，但這是新 operation，不稱 Undo。UI/keyboard deletion 與 OS IME 不在此 API slice。

## Worker 範圍與 routing

standard：既有 schema 上的 bounded operation，無新 authority 或外部 dependency；一名 clean native Worker，fork_context=false，繼承 Owner model/effort（上一輪 native 已證明 pro 只接受 ultra，不自行改 lane）。shared workspace sequential single product writer；Mainline 同時僅讀 evidence／準備驗收 control。
可改 runtime/deck-editor.js；必要新增 runtime/component-deletion.js 作同一 pure contract 的 Node/portable 序列化；tests/edx-wp2-s18-delete-element.test.mjs；tools/edx-wp2-s18-browser-cases.mjs；tools/edx-wp1-s4-browser-acceptance.mjs。mounted double 只有不可避免的薄補且附原因；不得弱化既有 assertions。禁止改其他 runtime/schema/vendor、control/tasks/BACKLOG/evidence、ZIP、protected4、AI Core；不 commit/build/full/browser/Chrome。
先真 RED→GREEN，再 scoped：S18/S17/S16/S14/S13/S8/S9/S10/S12/WP1S7 與 operation/identity 相關既有測試（列明實體檔案）。涵有效text/image、所有拒絕、confirmation/property descriptor、引用/identity、atomic DOM/throw/reentry、mode/selection/gesture/dialog、export/offline VM。raw logs 放 /private/tmp/pptskill-s18-worker-*.log，不覆寫歷史 FAIL。
Browser 增 --delete-element-regression，只 base10+S18，不 fanout 無關舊ケース。沿既有 asset fixture，新增 S13 text + S8 image standalone components；真 host API mutation、export/離線重開、live DOM/selection/dialog/gesture/失敗 rollback 取證；正向使用真 click 開 S16／selection，故障注入明示 synthetic。雙viewport 1280×720、1600×900；before/after 各 screenshot，確認移除目標且其他內容不變。不要新增 toolbar。

## Mainline 驗收與停止點

沿 task-slice-planning、evidence-first-acceptance、browser-acceptance-flow。Mainline 驗 diff、explicit full nonbrowser、fresh build/probe ZIP、managed host 雙viewport、四支 affected PGQ 單輪串行16、source/protected4/hash/cleanup。sandbox 只 attach，host 走原生權限流程；禁止 unset CODEX_SANDBOX／改資源閘門。歷史 FAIL 保留，同類兩次無進展重判，同一 blocker 第三次停止。
停止於 MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING 及可重現 handoff，不 merge/push/deploy，不開 S19。獨立審查另由 Owner 交回，不把 Mainline 自驗說成 Independent GO。

## Mainline 接續裁決

唯一 Worker Goodall 已由原生 close_agent 關閉；工具回報先前狀態為 stream disconnected，並非完整交回或產品驗收失敗。保留既有檔案與所有 raw logs，不再建立 Worker。Mainline 接續原卡驗收及必要的 bounded 修正。
S2 的 exact operations 清單必須包含本卡新增 delete-element；核對實體 tests/edx-wp1-s2-stable-identity-operation-path.test.mjs 後，允許僅加這一個 literal，維持 exact deepEqual 及其餘 assertions。這是 API 擴充的預期清單更新，沒有放寬檢查；原 scoped447/449 FAIL 保留。executeOperation 的既有前綴已由 Worker 保留，重入 guard 位於 validator、applyPatch 與 serializeHtml。

Mainline 首輪 scoped449/449 PASS；full943/945 的兩個 FAIL 均為 S3 Node/browser API VM 共用的舊 exact operations 清單。CodeGraph 未命中該測試後，以實體 source 核對；允許 tests/edx-wp1-s3-bounded-geometry.test.mjs 僅加 delete-element literal，保留 immutable/allowlist/assert.throws 及所有精確 assertions。原 nonbrowser-mainline.tap 與 summary 保留；新一輪使用獨立 log，不重算舊 FAIL。

## 獨立審查交接

Product candidate固定84ea9381cb438491449b6d871fbaeedea5e55b98。最終scoped449/full945及targeted雙viewport21+21已有PASS證據；第一輪完整host因resource observation I/O failure結束NOT_PASS，PGQ僅7/10且缺成功Browser.close／supervisor exit0。第二輪診斷僅synthetic selftest通過，正式host尚未重跑。review卡為handoff_20260924_edx_wp2_s18_review.md，要求分列產品、診斷方案與Mainline驗收狀態；本卡尚未closure。

## 2026-09-24 主線收尾

本次review／Repair1與第二輪host均完成；以evidence/edx-wp2-s18/mainline-closure.md為最新裁決。上文首輪失敗及「尚未執行」敘述保留作當時紀錄，不代表當前仍pending。產品84ea938／ZIP未改；native Reviewer的產品範圍為PARTIAL抽查，診斷targeted GO，不冒稱全產品Independent GO。
