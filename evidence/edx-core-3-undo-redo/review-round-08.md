# Core3 取消投影 targeted re-review：CODE GO

Reviewed packaged SHA：`9ce7396a481621960f6f2c89ff7fcf352c0e515a`。
Reviewed code SHA：`f3d8a11865a5af25f34a08a5b65dccb3fed6914f`。
Mainline：`CODE_GO / HOST_OBSERVER_BLOCKED / WHOLE_CARD_NOT_CLOSED`。本次範圍 P0/P1/P2/P3 均0；專案既有Crop F2/P2不在本輪，仍OPEN。

## 獨立裁決

- A（Lovelace）：CODE GO。新targeted5/5、獨立取消與fallback probe5/5、有界原mode/group/reorder/double projection/hotpath11/11；原兩項closure probe通過。明確關閉原提出的round07取消P1。
- B（Euclid）：CODE GO。新targeted5/5、9檔focused160/160；前輪custom10/10及5/5、本轮獨立cancel/fallback3/3。原mode/group、checkpoint、late-end、nested拒絕、hotpath無退化。
- 兩人均固定同SHA、唯讀，未互看本輪verdict、未改candidate／ZIP、未跑browser／PGQ。A首次final抄短SHA，後以git rev-parse唯讀更正為上列完整SHA；未因此重跑測試。

新四組snap off/on × API/click原反例均確認取消後DOM canonical、revision/history不變、gesture不復活。投影恢復成功仍回原error，之後操作可用；attribute fallback被阻斷時保留cause並fail-closed，拒絕後續operation/setMode/Undo，payload getter不被讀取。Mainline將A/B scripts僅改repo-relative import，另fresh5/5、3/3驗證副本可重播，沒有改斷言。

## Raw evidence與重播

本目錄 `review-round-08-evidence.json` 保存每份原始來源、bytes、SHA256和實際summary；TAP以byte-preserving gzip保留。Reviewer A/B的raw output與Mainline副本重播分開，不把Writer full稱為Reviewer fresh。

- A：`review-round-08-a-targeted.tap.gz`、`review-round-08-a-independent-v2.tap.gz`、`review-round-08-a-bounded.tap.gz`、`review-round-08-a-prior-closure.log`。
- B：`review-round-08-b-targeted.tap.gz`、`review-round-08-b-focused.tap.gz`、`review-round-08-b-cancel.log`與prior10/prior5 logs。
- Mainline：`review-round-08-mainline-a-copy.tap.gz`／`review-round-08-mainline-b-copy.log`；腳本 `review-round-08-a-independent.test.mjs`／`review-round-08-b-cancel.mjs`。
- A獨立probe初版第33行多一個右括號，parse時SyntaxError，尚未執行case；`review-round-08-a-independent-first.tap.gz`保留其0/1檔案失敗，不計為產品RED。錯誤probe原檔未另存、已被A原位修正；不能宣稱原script完整保存。修正後5/5，無runtime/test/ZIP變更。
- Round07 reviewers的153/153原raw TAP未保存，只留當時終端摘要與custom probe；本輪以上raw均已保存，不倒填前輪證據。

Repo root重播：`node --test --test-reporter=tap evidence/edx-core-3-undo-redo/review-round-08-a-independent.test.mjs`、`node evidence/edx-core-3-undo-redo/review-round-08-b-cancel.mjs`。
A新targeted：`node --test --test-reporter=tap --test-name-pattern='R07' tests/edx-core-3-transaction-boundary.test.mjs`。
A有界：`node --test --test-reporter=tap --test-name-pattern='R06 public setMode|R06 group-elements|大 payload|reorder pending text|double projection|pointer update/preview' tests/edx-core-3-transaction-boundary.test.mjs tests/edx-wp1-s4-perf.test.mjs`。
B focused的確切9檔清單與Writer core-01一致（包含正確 `edx-wp1-s9-mounted-align.test.mjs`），見 `transaction-boundary-r07-core-01.json`。Runner歷史錯路徑已單獨保留，不改歷史數量。

## Whole-card gate

Writer full81檔1061/1061、0 skipped；主線核對來源與rawTAP。主線fresh ZIP lifecycle、75/75 source byte-match、protected4/4與historical hashes MATCH，詳 `transaction-boundary-r07-mainline-hashes.json`。
ZIP 2,329,758 bytes；SHA256 `862bb19f82b10fab9a244a1c334fed1f39b6edc1ad5c5ff95aebe3cc04daf290`。

AI Core scanner仍是Host04失敗版本，尚無適用修復receipt；本candidate尚無fresh browser／PGQ。只關閉已重現產品P1與本次code review，不做Core3 closure／integration。下一步按 `observer-zoom-out-20260924.md` 交AI Core處置，再用固定candidate走原受管host controller與四支串行PGQ。維持核心2/6已收、Core3待host gate；不開Core4，未merge/push/deploy。
