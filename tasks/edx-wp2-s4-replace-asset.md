# EDX-WP2-S4 — image-only replace-asset operation

Status: READY_FOR_INDEPENDENT_REVIEW
Base: `28c1b373476ddf8fb6680cf883711f586ef08486`（WP2-S3已合併push main）
Branch: `codex/edx-wp2-s4-replace-asset`
traces_to: BACKLOG.md §10.1 decisions3/7/8、§10.3 WP2、§10.4 unified operation registry。

## Measured gap / scope

既有 Node replaceImage 直接 editComponent、alt/fit缺省重設；portable replaceImageFile另寫setValue/img.src，沒有registry descriptor。整合一個image-only operation，允許明確stable component target，既有first-image file convenience保留。無新UI/selection/crop/insert/drop/clipboard/group/lock/history/AI bridge/schema/dependency。

Prior Art: research/editor-prior-art.md；既有asset policy/optimizer、Node replaceImage、portable replaceImageFile。Classification DIRECT_REUSE + CUSTOM_DELTA（canonical operation glue），無取代generic primitive；舊兩路 mutation退出，compat wrappers保留。License與Pinned Version：沿repo既有版本28c1b37，無vendor引入；Bundle Cost只量測本次ZIP差額。Why not less：僅新增API仍留下兩套mutation/default破壞。Why not more：crop/新asset導入未本卡需求，不吸收Cropper/新schema。Why Custom：stable identity/atomic commit/preservation為PPTSKILL domain glue。

## Contract

1. registry新增 `replace-asset`，exact request `{operation,target:{slideId,elementId},value:{dataUri,alt?,fit?}}`。只image component stable elementId；dataUri必填、alt/fit選填；沿既有image dataURI/policy allowlist，拒絕remote/local unsafe source、extra/proto/inherited/getter/symbol。驗證不能先執行getter。非法target/value原子拒絕，不部分commit。
2. Node/portable同語意；若需可共用serializable helper，但不可新registry/authority。值缺省保留原alt/fit，明示合法alt/fit可變；content非目標、component id/type、geometry、motion、typography、style與其他metadata保留。使用既有sanitizer/validation、renderer/DOM projector；不得放寬schema或size policy。executeOperation仍回spec；descriptor誠實標示mutates/preserves/qaInvalidation/undoable:false。
3. Node replaceImage改為compat wrapper呼叫operation。既有localPath等非canonicallegacy輸入依原wrapper只取dataUri/alt/fit，不能寫入；不要破壞現有test期待。Registry strict payload仍拒extra。
4. portable replaceImageFile保持現有first-image convenience與optimizer，不新增選擇UI；async完成仍鎖原slide/component stable target，不可寫到後切頁first image。原有readonly export換object、removed target、same-value/no-op revision及gesture stale契約不退步；失敗不局部更新DOM/spec。保留optimizer warnings/result return。Canonical修改統一executeOperation，禁止wrapper再setValue第二條mutation。
5. public registry可指定非first image；portable DOM須與canonical一致（src、alt、fit），export/offline reopen保留；只更新受影響image node，不清整頁/其他元件或motion/geometry。No-op不增加revision，true mutation讓舊gesture stale。
6. UI file入口不得另存local file path。既有20MiB/asset policy照舊；本卡不聲稱新增file picker UX或真OS clipboard coverage。

## Acceptance / work split

先一個真正RED再最小實作；targeted Node/portable multi-image stable-target、preservation/default/explicit overrides、invalid atomic/getter、compat wrappers、async lifecycle、noop/stale、export/reparse。
Scoped現有editor/perf/registry tests；full nonbrowser；ZIPbuild/probe/bytes/hash/source/protected/diff check。
正式host `--asset-replacement-regression`：1280×720→1600×900，同一runner hooks/errors/targetClosed；real decoded小圖fixture、public operation第二image/live DOM src alt fit canonical、wrapper async preservation/export/offline；API-driven operation evidence，不能宣稱new pointer image UI。保留既有10base pointer cases。後跑四支affected PGQ串行與managed cleanup。
Worker只寫runtime/tests/tools，單一shared writer，無commit/branch/browser/ZIP/evidence/control。Mainline可同期寫control（不同檔），worker停寫後才整合測試/dist。native clean context，standard worker1/review0/repair0；節省模式medium，工具不提供Luna/Terra，依runtime規定繼承模型不自行指定。Mainline最終freeze candidate後交Owner獨立Review，未GO不合併。禁止push/merge/deploy/下一Slice。

## Rule refs

Owner bootstrap與config/devflow_context_map.tsv；rules05 coding；source decision先CodeGraph無關則rg；browser遵rules11/24與正式tmp_session入口，sandbox不unset、不裸launch。保護原4 untracked，依S3 source-hashes.json。遇同類兩次無進展停損；所有FAIL保留。

Mainline結果：candidate ebc4dc2；worker targeted111/111、full457/457、雙viewport各12、PGQ單輪16/16、ZIP lifecycle/hash/cleanup PASS。Worker執行偏差與歷史FAIL詳receipt，不隱藏。未merge/push/deploy。
