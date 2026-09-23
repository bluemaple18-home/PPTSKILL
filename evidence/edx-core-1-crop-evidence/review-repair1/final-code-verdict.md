# Repair1 final code verdict：GO with residual

固定 candidate **2db6185d13a6713700d0186758b1261ff23b9d85**；base **b364cd8923dcb6382e7a60432c7849dc5071af30**。

**Final CODE verdict：GO with residual。** 這是 bounded targeted code re-review 的結論，不是尚未收齊的整卡最終驗收 GO。

依 Owner 本輪明確指示，並已實讀 `/Users/matt/.codex/skills/model-role-routing/SKILL.md:81–82`：「只有 P0/P1 可 NO_GO；P2/P3 記為 residual risk／backlog」。目前 **P0=0、P1=0、P2=1、P3=0**；F2未關閉，保留為現有FinalClosure的OPEN residual。本Reviewer不啟Repair2、不另開主卡、不改產品或固定SHA。

本檔更新判定政策，**取代 code-targeted-verdict.md 的 CHANGES_REQUESTED 狀態，但不刪除其 finding 或原始證據**。b364cd8初始5個P2／CHANGES_REQUESTED與Repair1歷史完整保留。沒有降低F2的嚴重度或宣稱它已修好。

## Findings 與逐項狀態

| Finding | 最終code狀態 | 證據 |
|---|---|---|
| F1 persisted投影恢復 | CLOSED | Reviewer fresh 3次synthetic事件→原投影／單一ownership恢復，後續resize/load及S18成功；host04亦有synthetic＋pixel驗證。沒有真BFCache命中claim。 |
| F2 raw patch／舊teardown rollback | **OPEN／P2 residual** | 原observe、partial listener setup、舊style teardown throw已修；舊disconnect及remove-load先副作用再throw仍重現ownership未恢復。兩種同根因fault，不另開新finding。 |
| F3 reset尾段失敗恢復 | CLOSED | 原fault修後恢復canonical/revision/CSS/observer/load/error，後續resize/load及S18成功；host04支持原faultcase。 |
| F4 standalone授權文字 | CLOSED | normal render/export/reopen三份全文及SHA256一致，各1個license節點。 |
| F5 mounted preview比例 | CLOSED | 250×400與500×200真mounted dialog CSS尺寸／可見區域和commit一致；host04兩端pixel＋截圖佐證。 |

F2位置：**runtime/image-crop.js:117**，關聯`:115–116`、`:124`及`runtime/deck-editor.js:529`。

- `disconnect()`先斷開再one-shot throw：rollback把舊node/spec/revision/CSS恢復，但observing旗標仍true，active projection observer=0。
- `removeEventListener('load')`先移除再one-shot throw：listening仍true，rollback後load callbacks=0，error callbacks=1。
- 影響：上述注入失敗狀態下，下一次resize或load不會更新裁切。candidate的node／listener／observer均已清理；主要canonical與DOM位置已恢復。
- **沒有普通browser自然觸發證據，也沒有P0/P1。** 這是使用者指定的舊teardown after-side-effect throw故障模型下的真實重現，不冒稱通常原生API會throw。
- 修法方向留作residual：確定teardown中途throw後的ownership狀態，rollback不要依賴可能stale的flags；維持原錯誤及其他清理。Reviewer不實作。

## 證據界線

Fresh Reviewer：focused **27/27**、17-file scoped **339/339**（focused包含在scoped，獨立test cases仍339）；11組自有probes **9 PASS／2 FAIL**，兩個FAIL都是F2 residual。diff check通過。命令、TAP及修後expectation腳本完整在同tmp。

Existing host04 browser evidence freshly verified：兩viewport各45 records／24 pixel cases，1235／1240有效checks；80 artifacts實體bytes/hash全部相符，source hash與固定candidate產生的完整editor runtime相符，errors=0、targetClosed=true。Reviewer僅重算receipt內RGBA容差並檢視既有截圖，沒有自己執行browser。詳見host04-evidence-addendum.md與host04-evidence-check.json。這些PASS不覆蓋／抹除F2 after-effect teardown residual。

20 source＋4 protected hashes、8個diff paths的candidate git blob均一致。ZIP **2,316,286 bytes**，SHA256 **82eb4f571ba4283572bafa404dda6888d90dae292ccb06ac536eafe3fcba3880**。未重建／解壓／安裝ZIP、未執行full suite／PGQ／browser。Mainline的972不是Reviewer fresh count。

**整卡最終驗收仍PENDING正式host04 lifecycle／PGQ16／Evidence分類雙viewport visual supplement核對。** 此pending是證據未到齊，不是把P2升格為NO_GO。正式gate若全部pass，依Owner政策可記整卡GO with residual並納入既有FinalClosure。host01/02歷史NOT_PASS保留；host03不作修後證據。

所有Reviewer writes只在 `/private/tmp/pptskill-core-crop-review-2db6185/`；Mainline verdict維持未讀。
