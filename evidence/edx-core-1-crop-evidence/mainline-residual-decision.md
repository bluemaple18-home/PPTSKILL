# Repair1 後剩餘 P2 的主線裁決

固定 candidate：2db6185d13a6713700d0186758b1261ff23b9d85。

原 Reviewer 的 fresh repair-probes 新增 old-disconnect-after／old-remove-load-after 故障注入：teardown API 先完成副作用再throw時，reconcile內observing/listening旗標尚未更新，rollback可能誤以為仍持有資源而未重新註冊。canonical/DOM/revision可回復，但observer或load listener仍缺。這屬F2剩餘原子回退邊界，不能宣稱五項完全關閉。完整final severity/IDs以原Reviewer交回為準。

當前只有P2證據，未有普通使用者操作或原生API正常行為觸發的P0/P1證據；不把故障注入結果冒稱真browser fault。正常路徑與修後synthetic測試／browser45+45已PASS，PGQ仍進行中。

依/Users/matt/ai-core/skills/model-role-routing/SKILL.md:81–82：預設Repair ceiling1，第二代須Owner成本核准；只有P0/P1可NO_GO，P2/P3記residual/backlog。主線不啟Repair2、不偷改代次、不新增卡，也不抹去finding；待正式gate完整且原Reviewer結論交回後，以GO with residual或實際blocking verdict記錄。本P2納入原六卡第6張Final Closure作已知限制/風險裁決，不因此承諾未授權的第二代repair。

S18 closure不受此Crop剩餘故障注入邊界影響；未merge/push/deploy。原主線先行GO、初次CHANGES_REQUESTED及所有修復/FAIL證據照實保留。
