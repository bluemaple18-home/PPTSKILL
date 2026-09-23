# Crop＋Evidence：主線收尾

Status: CLOSED_WITH_P2_RESIDUAL / INDEPENDENT_GO_WITH_RESIDUAL
Date: 2026-09-24
Branch: codex/edx-core-crop-evidence
Product: 2db6185d13a6713700d0186758b1261ff23b9d85

## 範圍與成果

Owner 要求先 review S18，再接回原六張核心主卡。S18 已由 `evidence/edx-wp2-s18/mainline-closure.md` 收尾；本張是原六卡的第1張，不是S19。產品提供單一圖片裁切／完整原圖預覽／取消確認／重設／保存離線重開；Evidence 用人手分類、保護範圍、明確確認與 stale digest 管理重要上下文，仍保留完整 dataUri，不把裁切結果覆寫原圖。沿共用 Node/portable operation authority，沒有第二份 document model。沒有採用 Cropper；唯一新增 hash vendor 為 exact-pinned @noble/hashes 2.0.1 MIT。

本地產品已固定；本收尾只增加 control/evidence，不修改產品或 ZIP。main/origin-main 仍為 e3b90a8969f6d25416e746feefecba718d8d8931；未merge、push、deploy。

## 驗證與證據分層

- Mainline fresh：focused 27/27、scoped 339/339、full non-browser 972/972，全部0 skip/0 fail。實際files與命令見 focused/scoped/nonbrowser-files.txt、*-02.tap、mainline-test-results-02.json。
- Reviewer fresh：focused 27/27、scoped 339/339（focused包含其中，不相加）；自有11 probes為9 PASS／2 FAIL，兩個FAIL是同一F2 P2 residual。未把Mainline的972冒充Reviewer fresh。
- 修後host04 browser：1280×720／1600×900各45 records、24 pixel cases；1235＋1240=2475有效pixel checks PASS，80 artifacts bytes/hash核對，errors/HTTP/remote全0、targetClosed。詳browser-repair1-artifact-verification.json及host04/crop證據。Reviewer獨立核對已提交實檔／像素紀錄與截圖，沒有fresh browser rerun。
- PGQ修後為host04 **15 PASS＋host05 1 PASS＝16 unique named PASS**；不是單輪16/16。四個實際輸入與具名集合見pgq-reconciled-coverage.json。
- host05另補Evidence dialog雙viewport：focus/open/無橫向溢出/21controls PASS，四張截圖hash一致；Mainline已直接檢視Evidence範圍欄位與底部actions，詳mainline-visual-check.md。
- ZIP fresh lifecycle PASS（hostCapability partial只因Gemini CLI缺少，不是lifecycle FAIL）；ZIP內9個runtime/schema entries與候選bytes MATCH。20 source／4 protected／ZIP全MATCH，詳preclosure-integrity.json。
- ZIP 2,316,286 bytes；SHA256 `82eb4f571ba4283572bafa404dda6888d90dae292ccb06ac536eafe3fcba3880`。

## Review 與剩餘 P2

初次clean Reviewer發現5個P2，推翻Mainline先行code GO；同一Worker僅做Repair1，同一Reviewer複審。F1 persisted恢復、F3 reset rollback、F4離線授權、F5 preview比例已關閉。F2主要rollback修復，但仍有一項after-side-effect throw邊界：舊ResizeObserver.disconnect或load removeEventListener先完成副作用再throw時，旗標未更新，canonical/DOM/revision回復後仍可能缺observer/listener。

此故障注入可重現，不能宣稱五項全修好；目前没有普通原生browser操作觸發證據。CODE verdict GO with residual，P0=0/P1=0/P2=1/P3=0。依Owner常設規範及model-role-routing的「只有 P0/P1 可 NO_GO；P2/P3 記為 residual risk／backlog」，保留至原第6張Final Closure，不擴充主卡數目、不偷做Repair2。這不是本輪另獲Owner第二代repair成本核准。

## 歷史失敗與控制器摘要補正

- Worker初始及Repair1 RED／中間FAIL原logs與SHA保留；Mainline先行GO、首次5P2、targeted中間CHANGES_REQUESTED、最終CODE GO with residual全保留。
- host01／02為fixture重疊pixel FAIL，修fixture後host03 PASS；host03只證明修前產品，不冒算修後2db6185。所有原圖與FAIL保留。
- host04 browser完成PASS，但PGQ第16案遭scanner ENOENT中斷；supervisor2、Browser.close3，整輪NOT_PASS。owned root／marker已清。新捕獲profile transient path ENOENT，不代表歷史S8/S18 I/O未知原因已解，也沒有改AI Core。
- host05實際readiness／pgqFailed／dialogVisual／Browser.close／supervisor全0；136 scans無I/O，root/marker不存在。然而Mainline controller最終仍讀舊cropBrowserExit/pgqExit欄位，原摘要NOT_PASS／exit1。**原controller及receipt未修改**。
- 另以host05-offline-verification.py唯讀重核既有實檔與34文字fixtures，確認false-negative與實際步驟／cleanup／integrity；host04仍被拒絕，沒有再啟browser。詳host05-controller-summary-reconciliation.md與host05-offline-verification.json。同一Reviewer另寫獨立verifier，34 fixtures與實體evidence核對通過，最終整卡 **GO with residual**；詳review-repair1/final-whole-card-addendum.md、final-evidence-verification.json。

## 能力界線與接續

正式像素fixture為PNG，不宣稱所有圖片格式／GIF；persisted lifecycle是synthetic，不代表真BFCache命中。Evidence保護是幾何與人工確認，不是OCR／語意／來源真偽認證；reviewDigest不是權限憑證。固定geometry不代表自動避障。原圖保留針對crop，不新增replace來源history。F2已知P2不被正常路徑PASS覆蓋。

本卡正式收尾，六張核心主卡剩五張：Group/Ungroup＋Lock/Unlock、Undo/Redo、Local draft/recovery、Reset/Recompose、Final Closure。Group尚未開工，不開S19／S20。主線下一個工作點為第2張；需要先鎖定最小group/lock contract與既有operation邊界，不把asset零碎缺口再拆成新主卡。

## 最終主線裁決

獨立整卡GO with residual已交回；Mainline接受固定產品2db6185的本卡closure，P0=0/P1=0/P2=1/P3=0。Final addendum更正規範歸屬並保留所有原始FAIL／NOT_PASS。四個protected未動，候選後只提交control/evidence；驗收完成不等於已整合main或已推送。
