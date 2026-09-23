# WP2-S18 Mainline review 與 closure

Status: CLOSED / MAINLINE_CODE_REVIEW_GO / HOST_ACCEPTANCE_PASS
Reviewed product: 84ea9381cb438491449b6d871fbaeedea5e55b98
Mainline依Owner「先review 18，再繼續」負責全產品審查與最終驗收。本輪只修evidence診斷脚本，產品／ZIP未改。

## 裁決及責任範圍

產品CODE_REVIEW：GO；P0/P1/P2/P3 actionable findings均0。Mainline核對exact payload、confirm、引用／stable identity、candidate/sanitizer、DOM uniqueness、remove前後throw rollback、一次revision、重入patch/export、async asset ownership與selection/gesture/dialog/export。
獨立native Reviewer產品抽查仍為PARTIAL（13/13 rollback/reentry）；不得改写成其全產品Independent GO。其診斷方案初審NO_GO，F1 P1／F2 P2／F3 P2有實測，Mainline撤回原診斷初判，Repair1後原Reviewer targeted GO，三項CLOSED。Mainline與native原盲判均完整保存，未互讀後才聲稱盲審。
最終主線裁決：S18的產品review與必要host gate均完成，可回六張主卡；不把native局部審查擴張成全產品review。

## Fresh與既有證據

- Mainline本輪fresh focused71/71、scoped449/449、full nonbrowser945/945，無skip/cancel/todo；原logs及verification.json在mainline-review/。
- Mainline診斷Repair1 probe26/26；Reviewer fresh重播26/26，另獨立probe26/26。這些並非52個互不重疊的host場景。
- 本輪正式host-acceptance-02：1280×720、1600×900各21/21；console/page/network/http/remote全0、targetClosed=true；四張before/afterPNG本輪直接核對。
- PGQ本輪單輪16個unique named cases全PASS，不混算第一輪。readiness、Browser.close、supervisor皆exit0，owned root／isolation marker實查不存在。
- 診斷完整：699次scanner、0個OSError事件、scanner前後hash一致。原readiness／capacity／monitor／teardown不放寬，AI Core未改；CODEX_SANDBOX為null，未unset旗標。
- source8/protected4、ZIP bytes/hash全MATCH；ZIP仍2301572 bytes，5ccedbc43af3f23f9582ed989c635479be10065752d231fefa4bf2104ff3ec74。ZIP lifecycle為既有已核對證據，本review未build/替換ZIP。

## 保留限制與歷史

首輪host targeted21+21 PASS，但PGQ7/10、supervisor2、I/O failure且無成功Browser.close仍為NOT_PASS。第二輪無重現不能證明首輪I/O根因或環境已修復。Worker stream disconnected仍是另一未明事件。
初始診斷F1/F2/F3、產品開發reentry RED、945中間兩失敗及delegation preflight誤spawn後立即STOP均保留於原receipt、repair.md與原logs，不洗歷史。
S18仍是API delete-element，不是新刪除UI或Undo；故障DOM hook／Promise seam為synthetic，無OS IME claim。

## 下一步

六張主卡第一張：Crop＋Evidence圖片安全裁切；S18既有能力歸入第二張asset邊界。不開S19，不重做S16/S17/S18。此次未merge/push/deploy；main/origin-main仍e3b90a8。

證據入口：mainline-review/final-acceptance.json、mainline-review/verdict.md、mainline-review/independent-review-initial.md、mainline-review/independent-targeted-rereview.md、host-acceptance-02/controller-receipt.json、host-acceptance-02/resource-observation.json。
