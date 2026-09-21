# S10 host-runtime acceptance evidence

狀態：**BROWSER_PASS / PGQ_BLOCKED / STOP_LOCAL_CONTINUATION**。交回原 Mainline 裁決，不能標 Independent Review candidate。

Product SHA：`902671238980941b321179a4df37e4d867733f14`。接手 checkpoint：`209ee3bcf8491d9db5a11d7b51f52c1879bad296`。Branch：`codex/edx-wp1-s10-distribute-selection`。本輪只新增 evidence，不改產品／測試／ZIP／task contract，不 merge／push／deploy、不開 S11。

## 雙 viewport fresh PASS

`host-acceptance/distribution/acceptance.json`：1280×720、1600×900 各 **13 checks PASS**（10 個 base interaction + 3 個 S10 aggregated checks）。真 multi-select 三個 components、context controls、horizontal-centers、vertical-centers、selection retained、export/offline reopen 均通過。每個 viewport console/page/network/HTTP/remote 全 0、targetClosed=true。這是 harness 結果，不代表後續 supervisor 也 PASS。

## 四支 PGQ：兩輪受相同停損阻斷

兩輪均使用 `node --test --test-concurrency=1` 串行執行 content-integrity、sample-approval、full-deck-qa、required-visibility。正式 host execution 的 `CODEX_SANDBOX=None`，沿 AI Core `tmp_session.py browser`，readiness exit 0；未 unset sandbox、未裸啟 Chrome、未更改容量或 scan gate。

1. `host-acceptance/`：distributionExit=0；PGQ reporter 0 pass / 4 fail；supervisor stderr 為 `NO_GO: resource observation unknown (scan limit)`，supervisor exit 2。Browser 消失後出現空 JSON／DevTools port 未就緒／top-level producer failure。沒有任何 PGQ named PASS。
2. `pgq-only-retry/`：不重跑 distribution，只補四支 PGQ；同一 supervisor scan-limit 再現，exit 2。**content-integrity 1 named case PASS**，其餘三支未完成，reporter 1 pass / 3 fail；其中 sample-approval/full-deck-qa 是 file-level loading failure，不冒算成所有 named cases 都有跑過。

兩輪 PGQ exit 1；沒有 Browser.close 成功紀錄，因 supervisor 已先停 browser。這不能判產品 regression，也不能當 PGQ PASS。Console/remote 的零錯誤只屬 distribution acceptance，不掩蓋 supervisor failure。

## Cleanup / integrity

兩輪 controller receipts 均確認 source/protected hashes 未變、isolation marker absent；owned roots 已回收，收尾又 fresh 核對實檔不存在：

- `/private/tmp/aic-b-69490469cac04bf6b21dc0a5067cbe17`
- `/private/tmp/aic-b-7df3361d88464b448b78830db1fd46b5`

`host-verification.json`：source **11/11 MATCH**、protected **4/4 MATCH**、browser artifacts hashes 核對並保存。ZIP **2,282,450 bytes**，SHA-256 **`664bc72f696e21d1d5ca891506411c737ff7f114c891658d7d5670e8b06ebd64`**，未重建。

## Mainline 裁決所需事實

Root question：受管 resource observation 為何反覆回 scan limit，導致 PGQ producer 的 Chrome 消失？目前證據只能確認停損原因，不能證明內部根因或產品缺陷。

本輪兩次相同停損，加上 S9 已保存的同原因失敗，不以新 Slice／新 profile 重置 blocker 計數。依既有 `rules/01-pm-protocol.md` 停止局部 continuation，不做第三次 S10 browser launch，不放寬 gate。

有進展：雙 viewport PASS、PGQ content-integrity 1 named PASS。未完成：sample-approval、full-deck-qa、required-visibility；整體四支 PGQ gate 仍未過。需要由 Mainline／AI Core owner 先處理 resource-observation seam，再裁決後續 targeted run；本 host evidence 任務不自行修 AI Core。

更正先前即時訊息的「沒有新增 PGQ PASS」：完整 log 證實 retry 有上述 1 named PASS；以本 receipt 與 raw log 為準。停止裁決不變。
