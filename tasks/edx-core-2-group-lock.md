# 核心完整版 2/6：Group/Ungroup＋Lock/Unlock

Status: CLOSED / INDEPENDENT_REVIEW_GO / INTEGRATION_PENDING
Base: a3fd195a4a4c5b33ccbe4cccd3c2a8f121c93889
Branch: codex/edx-core-2-group-lock
Parent: tasks/edx-core-six-card-closure-plan.md 第2項

## 目標與裁決

完成同一張主卡的群組／解組、鎖定／解鎖、操作介面、匯出／重開與回歸驗收。既有S18刪除、插入／替換、Crop/Evidence直接復用。第1張已合併main；原F2 OPEN/P2保留給第6張Final Closure，不開Repair2或第七張，不開S19。

Measured gap：既有multi-selection、align/distribute、Moveable/Selecto可操作獨立元件，但composition沒有group/lock authority，沒有可攜群組或鎖定契約。CodeGraph於開工前查deck-editor/executeOperation/selection/group/lock，只回無關symbols；已限域讀deck-spec sanitizer、component-interaction與multi-selection。

Prior Art：既有Moveable 0.53.0／Selecto 1.26.3（repo已固定MIT）、Operation Registry、composition.geometryOverrides、Node/portable共同pure contract、現有操作工具列與host controller。Classification：DIRECT_REUSE既有vendor/runtime、ADAPT group事件、CUSTOM_DELTA canonical group/lock policy。無新vendor／下載。Bundle/portable cost以fresh ZIP實測，保留既有20MiB上限。Why not less：僅API或僅隱藏handles無法交付可操作且不被patch繞過的鎖定。Why not more：不造巢狀scene graph、layer tree、任意旋轉、第二writer、history／draft／recompose。

## 固定契約

1. 唯一持久authority仍是DeckSpec composition。新增可選elementGroups（互不重疊的elementId陣列，每組至少2個）與lockedElementIds（唯一elementId陣列）；無巢狀／跨頁group，不改元件ID、不包裝或重排canonical DOM。缺少欄位的舊deck維持舊行為；不存在、重複、重疊、錯型別、保留role／identity collision的metadata必須拒絕，不得靜默解除鎖定。
2. 群組限同頁獨立text/image、stable identity不重映射，所有成員已有合法manual geometry；無geometry時明示先套用手動版面，不在群組時搬動內容。組合引用或不支援元件拒絕。group/ungroup只改metadata，其他content/style/motion/crop/geometry/slide不變；group與locked互斥修改，先解鎖再解組。
3. 沿既有executeOperation新增group-elements、ungroup-elements、lock-elements、unlock-elements；target為exact {slideId,elementIds}，value為exact空record。不得invoke getter；symbol／hidden／prototype extras與重複ID拒絕。group至少2個；ungroup必須指定單一完整既有group。lock/unlock可為1個以上獨立元件或完整group，部分group拒絕，UI自動展開group再送入。無變更操作revision不增加，成功一次revision。
4. 群組選取以整組為單位，Shift／框選沿Selecto；真Moveable group drag/resize與方向鍵須有產品路徑。move-group使用同一target及value {x,y}（group bounding box位置）；resize-group使用value {width,height}（保持group左上、按bounding box比例縮放與round成員rect）。每次只提交一個operation／revision；越界、任何成員太小、stale／cancel／throw整組不提交。孤立move-element/resize-element與align/distribute不得拆散群組，明示先解組；不手刻另一套pointer engine。
5. 鎖定是編輯保護：element target的move/resize/align/distribute/edit-text/replace/delete/crop/evidence與applyLocalPatch不能繞過；涉及任一locked成員的多目標mutation整批拒絕。鎖定元件仍可被選取以解鎖，但不出可用transform handle或可提交文字／圖片dialog。pending optimizer/picker/IME/dialog與gesture採既有busy/stale/取消機制，late submit不得復活／解鎖／寫入；API及portable一致。鎖定不禁止明確的整張slide複製／刪除，複製須保留該slide metadata並隔離引用。
6. group中刪除單一元件拒絕並提示先解組；解組後直接使用既有delete-element，不另造刪除authority。未鎖group的個別replace/edit/crop可沿既有明確target API，group membership不變；透過UI時保留多選／单一選取的明確可用性。Evidence原圖、crop pending/review、離線授權不因group/lock繞過。
7. 匯出與offline reopen保留group／lock及geometry，清除selection/handle/preview/editor chrome；解鎖／解組後仍可繼續編輯。Node與portable sanitizer/schema、operationDescriptors、clone返回值同步。legacy deck、content/visual patch、duplicate-slide與portable recipient路徑必須回歸，不以Node pass代替真browser。

## 執行與驗收

Strict/core-bounded；model-role-routing與task-slice-planning適用。目前native模型catalog不含舊Luna/Terra/GPT-5.5，使用native預設繼承模型，未更改主對話設定；clean fork_context=false。單一shared Worker寫delivery與本卡worker/browser測試產物；Mainline同時只讀並規劃驗收，禁止兩名product writer。Worker不改control卡、不commit/merge/push/deploy、不啟動unmanaged browser；所有證據限定本卡目錄或本次owned tmp。

先RED→GREEN行為測試，保留FAIL；涵schema/metadata/own-data payload、群組transform、all-or-none/rollback/reentry、lock所有mutation入口、selection／pending操作、export/reopen與舊deck。更新既有exact operation期待值時只增加合法literal，不放寬assertions。全nonbrowser列實體唯一檔案與test count，不誤把browser gate當nonbrowser。

Browser新增單一--group-lock-regression，base＋本卡，拒絕混合flags。1280×720／1600×900：真click/Shift或marquee建group、drag/resize/nudge、lock擋編輯、選取unlock、ungroup後既有刪除、export/offline reopen再操作；before/after截圖與errors/targetClosed。fault注入明示synthetic。沿受管host容量／admission／readiness／cleanup，禁止unset CODEX_SANDBOX、修改AI Core或清他人root。PGQ四個affected檔案單輪串行、預期16 unique；任何部分重播須保留原FAIL、明示covered/未覆蓋，不隱藏監控中斷。

Mainline fresh scoped/full nonbrowser、build:dist／distribution lifecycle、ZIP source-byte-match、雙viewport與PGQ／cleanup；source/ZIP／protected4凍結前後核對。Strict獨立Reviewer全卡審查，最多Repair1及同Reviewer re-review；P2/P3保留residual，不宣稱零風險。

停止點：本張驗收與可重現review交接；只有所需驗收及verdict到齊才標第2張完成。未到齊寫PARTIAL與明確缺口，核心進度維持1/6；不開第3張、不merge/push/deploy。

## 執行接續

唯一Worker Turing回報前置讀取19次但未進RED，無權限或模型錯誤。原線resume後留下初始tests/edx-core-2-group-lock.test.mjs；Mainline原生close_agent後wait回not_found，已無第二writer。主線接續同一卡的必要bounded實作與驗收，不再增開Worker。初始test錯把Node editor當成有getRevision，且錯讀composition schema的ref wrapper；依既有公開API改為portable-only revision斷言與正確$defs來源，不新增虛構API。仍需獨立Reviewer，不把主線實作當獨立GO。

## 本次接手的已量測狀態

2026-09-24：本地focused已10/10，8/10為舊handoff；不新增revision API。續補UI後mounted group/lock16/16；完整非browser第一輪988中985PASS，3FAIL均為既有exact operation-name清單未加入本卡6項，僅增literal，不放寬assertion。原logs保留。

群組transform沿既有gesture controller與Moveable原生dragGroup/resizeGroup；不採用含motion transform的vendor dimensions作canonical。此卡群組不提供8px吸附，群組選取时snap按鈕disabled並有可見狀態／title，單一元件既有snap不變。不新增snap algorithm或第二pointer engine。UI authority仍單一selection state＋DeckSpec。

## 關閉裁決（2026-09-24）

最終產品與 ZIP commit：`88f401c7798976babfd28df991a6ba5b6b784e4e`。同一 Repair 1 修復 GL-R1 群組 SE 命中與 GL-R2 回退互動投影；host05 退件的 minimum release 全組拒絕也在此 Repair 1 收斂。原 Reviewer targeted re-review 與 final addendum 均 GO；Core2 新／未解 findings P0–P3 全 0。原 Crop F2 OPEN／P2 繼續留在第6張，不計入本卡缺陷。

Mainline fresh full non-browser 79 個唯一檔案、995/995 PASS；固定 candidate 的受管 host06 1280×720／1600×900 各 27 check records PASS、錯誤全 0，PGQ 四個 affected 檔案單輪 16/16 PASS；Browser.close、supervisor、owned root／isolation cleanup 均 PASS。ZIP 2,322,437 bytes，SHA-256 `1f8ed872504a5a9f655a52dad2adda52d065e78288eb3d34d698475858dfa2b9`；11 source、4 protected 前後一致。Reviewer fresh targeted 76/76 PASS；本輪 browser／PGQ 屬其獨立核對的 Mainline committed evidence，未冒稱 Reviewer fresh rerun。

完整結果：`evidence/edx-core-2-group-lock/mainline-closure.md`。host01–05 NOT_PASS 與初審 GL-R1/GL-R2 FAIL 均保留。完成進度 2/6、剩4張；停止在獨立候選，未 merge／push／deploy，未開第3張。
