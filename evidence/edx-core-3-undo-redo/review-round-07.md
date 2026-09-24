# Core3 round-06 修復 targeted re-review

Packaged SHA：`2f134de69845d3839be5091d3fa8a9635a550d70`；code SHA：`8ad5d6fbaca45027cf73da70432787e1413b7502`。

Mainline verdict：`CODE_NO_GO / P1_1_NEW / ORIGINAL_P1_2_CLOSED`。

Reviewer A（Lovelace）fresh affected 153/153，獨立 closure probe 證實原 public mode／group terminal notify 兩項 P1 已關閉。但發現取消投影的新 P1；B（Euclid）fresh affected 153/153、前輪10 probes、本輪5 probes均PASS、CODE GO。不可用B的GO抵銷A可重現finding。

**P1：active gesture 取消投影 after-effect throw 留下 preview DOM。** public setMode(false)／layout click 在建立mode checkpoint前取消gesture。left setter寫入後throw，canonical/revision未變，DOM top仍為290px（canonical 280px），新的public mutation仍可成功。snap off/on與API/click四組皆重現。位置 runtime/deck-editor.js:815、runtime/component-interaction.js:504。Mainline fresh重播A原腳本四組皆成立；另重播原兩項closure皆PASS。

腳本保存為本目錄 review-round-07-a-cancel-projection-repro.mjs（刻意assert bug存在）、review-round-07-a-closure-probes.mjs。B腳本保存review-round-07-b-probe.mjs與review-round-07-b-prior-probe.mjs。僅改repo絕對import為相對路徑；Mainline再次執行驗證可重播，log分別保存。新反例與舊FAIL保留，不冒稱fresh browser／PGQ。

主線處置：沿已授權的交易取消／可驗證回退範圍，針對此單一failure做bounded follow-up；原兩項已證實關閉，不重開功能鏈。須先以正確契約RED固定四組，再使用既有gesture checkpoint／projection fallback使取消後DOM canonical，或明確阻止後續寫入。不得新增authority或修改AI Core；若需擴其他runtime或同一失敗兩次修正無進展，停止回主線。ZIP與固定candidate由新code後重建，不沿用當前ZIP claim。

Writer全量1056/1056與Mainline lifecycle/75-source/protected結果仍有效於本候選，但不足以判CODE GO。整卡HOST_OBSERVER_BLOCKED，Crop F2/P2 residual保留；不merge/push/deploy、不browser/PGQ、不開Core4。
