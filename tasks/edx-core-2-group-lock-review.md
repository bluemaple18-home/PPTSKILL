# Core2 群組／鎖定獨立產品審查

Status: CLOSED / WHOLE_CARD_GO
Initial candidate: 2bb1aafcc12694fa64a972e3bb76c9b3618d1cdd
Final reviewed product: 88f401c7798976babfd28df991a6ba5b6b784e4e
Base: a3fd195a4a4c5b33ccbe4cccd3c2a8f121c93889

只審本張tasks/edx-core-2-group-lock.md差異，禁止修改repo/ZIP/protected、啟browser、merge/push。fresh focused＋bounded scoped及必要故障注入寫reviewer owned tmp；只讀既有evidence，browser尚待新一輪正式驗收，不給whole-card GO。

檢查canonical group/lock metadata、所有mutation guard、raw patch bypass、same-slide identity、Moveable原生group事件、selection/lock/async/export原子與rollback/reentry。原Crop F2 P2已知保留，不偷偷修、不把它升格為本卡新finding。群組不宣稱8px吸附，toolbar明示disabled；普通單元件snap沿舊契約。

輸出P0–P3與replay，code verdict及證據限制分開；同一Reviewer最多同一卡Repair1 targeted re-review。若需修復由主線裁決，不直接改candidate。主線不以自己的實作／自驗替代獨立GO。

初審 REQUEST_CHANGES 與 Replay 保存在 `evidence/edx-core-2-group-lock/review-initial/`；同 Reviewer Repair1 targeted CODE GO 在 `review-repair1/`；host06／PGQ／cleanup 最終核對後的 whole-card GO 在 `review-final/`。三階段證據不互相覆蓋。Core2 P0–P3 全 0；繼承 Crop F2 OPEN／P2 另列。
