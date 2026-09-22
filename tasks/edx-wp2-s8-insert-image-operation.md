# WP2-S8 — image-only Safe Insert operation

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Base: `74d63cc99e745b373adbcc3a56e9228576e74b22`（S7 closure／merge／push、remote main及branch MATCH）
Branch: codex/edx-wp2-s8-insert-image-operation
traces_to: BACKLOG §10.1 decisions3/7/8、§10.3 WP2、§10.4 insert-element。
Dependencies: S2 stable identity、S3 geometry、WP2-S4 asset policy／operation、S7圖片fit均GO。Frontier選image insertion canonical→live DOM→export/reopen，File picker/drop/clipboard/auto-ID/UI另卡。

## Objective / minimum

現有DeckSpec可存image，renderer已把有geometry的非slot component補為唯一root；沒有editor atomic insert path。只加image-only `insert-element` 到既有registry／Node editor／portable executeOperation。不建第二套writer/model/registry。
Prior Art: DIRECT_REUSE現有assetReplacement validation/project、component geometry、identity resolver、renderer及native DOM。Classification: bounded glue，非通用editor primitive。License/Pin: 沿base既有vendor，新增dependency0。Bundle+Portable Cost由主線量測ZIP delta。Why custom: PPTSKILL stable ID／canonical與DOM原子性domain seam。Why not less: 光content.push沒有live/export/identity一致性。Why not more: File/拖入UI與crop/group/lock皆無此卡必要。無取代。

## Input / invariants

`{operation:'insert-element',target:{slideId},value:{component:{id,type:'image',dataUri,alt,fit?},geometry:{x,y,width,height}}}`。
所有record採own data properties、exact required/optional keys；拒絕array/null/未知欄位/symbol/getter/非法prototype；讀getter前拒絕。component.id沿既有1..80 lowercase ID規則；type只image，alt必須string，fit optional contain/cover。dataUri沿S4既有asset policy驗證（勿複製MIME/bytes/SVG政策），geometry沿既有finite integer/min80/safeInset80/1600×900驗證，無clamp/default box。

1. 新增component到target slide尾端＋唯一geometryOverrides entry；components原順序／composition.slots/order／其他geometry/typography/motion/background/style/content/其他slides保持不變。無auto-ID allocator。重複id必須fail，連續送同id不是再次追加；不同slide可同component id。
2. 以既有resolveSlideElementIdentities核對插入前後所有既有role/keyPoint/component identity保持一致；若long-ID collision會使既有identity改名，拒絕而非重命名／改resolver。既有測試tests/edx-wp1-s2-stable-identity-operation-path.test.mjs有long-id/collision fixture可用。新identity須唯一、bounded、由同resolver取得。
3. Node createDeckEditor.executeOperation與portable共用一份bounded validation/update contract；可新增runtime/image-insertion.js閉包序列化，比照asset-replacement.js。不能Node一套/browser另一套。descriptor標image-only target為slide、mutates components membership＋新geometry、preserves既有內容與identity、destructive false／confirmation none／undoable false（history未實作）、QA content/assets/geometry/overflow/portableSize，不宣稱history。
4. Node沿既有candidate→sanitize/validate/capability→commit。Portable先完整validate／prepare candidate和detached DOM，再提交；沿既有renderComponent(component,candidateSlide)＋projector，不以append HTML字串直接繞operation。新DOM是target slide的唯一component root，包含正確edit-target/element-id/geometry/fit/alt/dataUri/treatment。不得整頁重render或重建現有roots（保留既有node identity/focus/inline狀態）。
5. invalid payload、unknown slide／missing DOM、collision、DOM append throw（含append後再throw）都不得留下component/geometry/new DOM/revision變動；新增節點要可rollback。invalid不得清selection或取消原gesture。成功插入才取消gesture/preview並clear selection，revision只加1；currentId與mode不跳到target slide。跨slide明示target支援，不能fallback當前頁。
6. 插入後既有selection/fit/replace-asset/move-resize可以使用新element ID；renderer export/re-render/offline reopen出現且恰一root，dataUri/alt/fit/geometry保留。無插入UI／File optimizer API，不宣稱native chooser。20MiB沿既有export guard，不放寬、不另造aggregate admission，也不宣稱每次insert前已驗整份HTML大小。

## Acceptance

Node＋mounted true RED→GREEN：合法image/default/explicit fit、兩張不同ID/跨頁、exact-schema/getter calls0/非法MIME及policy/geometry、duplicate/replay、long-ID不改既有identity、原字級/motion/slot/geometry保留、missing DOM、append前/後throw rollback、新DOM單一root及原node references、active gesture成功cancel vs invalid保持、revision一次、export再parse/renderer/reopen。至少一張非正方形有效小PNG作browserfixture，驗natural size＋computed fit，不宣稱Evidence crop像素驗收。
Worker明列scoped tests：新S8、S2 identity、S3 geometry、WP2-S4 asset、S5 File、S6 selected UI、S7 fit、S1 export及必要相鄰operation tests。禁止tests glob/full/browser/ZIP。若descriptor snapshots需更新只反映新增descriptor，不能弱化舊assertions。

新增--insert-image-regression與tools/edx-wp2-s8-browser-cases.mjs，既有runner base10、listener/navigation/target cleanup不變。API-driven insert明標；真pointer選新image→fit／drag/resize，canonical及DOM同步、first／other保留；invalid insert零副作用；export/offline reopen新圖存在可操作，雙viewport1280×720→1600×900。保留新圖+editor controls screenshot、rect/hit、decoded尺寸、errors/HTTP/remote0、targetClosed。不要為了假裝UI直接新增picker。
主線負責full明列nonbrowser、build/probe ZIP、source/protected4/hash、正式host雙viewport、四支affected PGQ串行與managed cleanup；全部通過才交Independent Review，FAIL完整保留。

## Worker / boundaries

strict/core-bounded：新mutation API與atomic性規格已固定；一個clean Worker/high/shared sequential product writer，runtime要求繼承model（未另指定）。主線只control，Worker停寫後讀diff驗收；strict預留1條Independent Review責任線，沿Owner既有外部review交付流程，Worker不自啟Reviewer／Repair。主線acceptance後停候選等待該review，不以自驗代替GO。
允許runtime/image-insertion.js（新）、runtime/deck-editor.js、新tests/edx-wp2-s8-insert-image.test.mjs、必要mounted helper／browser runner／新browser cases、既有descriptor snapshot test。原schema／identity resolver／asset-policy／renderer功能不改；若發現必要缺口先附證據回Mainline，不能順手擴scope。
禁browser/Chrome/attach/fixture runner、full glob、ZIP/build/probe、commit/branch/control/evidence/protected/AI Core、dependency/schema/一般text/chart insertion、merge/push/deploy。Node /opt/homebrew/bin/node，先CodeGraph query，無相關結果限域rg，不自行index。讀Owner bootstrap與rules05/11/24。
log/report寫/private/tmp/pptskill-wp2-s8-*，保留RED／中間FAIL及逐命令counts。最多一個bounded實作循環；同類兩次無進展／contract fork即回主線裁決。完成stop writing，交changed paths、source SHA、tests、未驗範圍；不宣稱candidate或GO。

## Mainline acceptance

Candidate `0b4c7bdf95211d0bb0587034cb899593e6b64d90`；Worker scoped150/150、Mainline full551/551、browser50+50、PGQ-only retry單輪16/16、ZIP/source9/protected4/cleanup PASS。Mainline同步一條motion變數名斷言（原FAIL保留），runtime未因該FAIL更改。首輪PGQ I/O fail-closed與retry依據完整保留；限制見receipt。handoff_20260922_edx_wp2_s8_review.md待Independent Review；S8未merge/push/deploy。

## Closure

Owner交回Independent GO；reviewer fresh70/551，browser50+50與PGQ retry16為committed evidence核對。主線接受，詳evidence/edx-wp2-s8/independent-review.md。Reviewed code/ZIP未改；本輪未merge/push/deploy。
