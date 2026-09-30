# Core4 Reviewer B：盲、唯讀 Code Review

基準：HEAD `59a2a65d37df077864ddbf4d3613cf8a91577189`。審查產品候選僅 `runtime/deck-editor.js` 與 `tests/edx-core-4-local-draft.test.mjs`；參照 `tasks/edx-core-4-local-draft-recovery.md` 與現有 mounted harness。未讀另一位 reviewer 本輪結果，未改產品／manifest。

## Verdict

**NO-GO**。Spec axis：滿額儲存但舊草稿仍可讀時，恢復入口被關閉，未滿足「本機草稿存在才宣稱能恢復」及 quota 下 truthful degrade 的驗收。Standards axis：除下列問題，未見新增第二 writer／DB；成功恢復會在既有 canonical `spec`、revision、history seam 內處理，export 讀取同一 canonical。mounted PASS 不代表 browser host 能力已驗證。

## Finding

- **[P1] 滿額儲存會使可讀舊草稿無法恢復 — `runtime/deck-editor.js:36-45`、`:606-607`。** 啟動時先以 `setItem(key + ':probe')` 測寫；若 localStorage 已滿，這一步可因 quota 拋錯，`state` 變 `unavailable`。`read()` 隨即因 `state === 'unavailable'` 直接返回 `null`，未嘗試 `getItem(key)`；UI 不顯示恢復按鈕。以 Map storage 模擬「舊 key 已有有效 record、後續所有 setItem 拋 QuotaExceededError、getItem 正常」重現：`{state:"unavailable",read:null,stored:true}`。應將讀取既有草稿與寫入能力分開判定；即使新寫入失敗，仍允許驗證後明示恢復舊草稿，並如實提示目前不能保存新編輯。`tests/edx-core-4-local-draft.test.mjs:53-63` 只測同一執行期寫入失敗，未測滿額後重開。

## 驗證與界線

- Fresh focused：`node --test tests/edx-core-4-local-draft.test.mjs`，9/9 PASS。
- Fresh 相關回歸：Core3 transaction、Undo/Redo、export cleanup、S18 delete、crop UI，150/150 PASS。
- `git diff --check -- runtime/deck-editor.js` PASS。
- 現有 `tools/edx-wp1-s4-perf-mounted.mjs` 明示為最小 DOM double；Core4 測試在其上手動補 `deck.replaceChildren`，且 `PPTSKILLSizeGuard.prepare` stub 直接回 pass。這些測試支持 canonical／DOM／export 邏輯檢查，不能證明正式瀏覽器雙 viewport、file: storage、下載後離線重開或真實 size guard 行為。這些 host 驗收仍須獨立 browser 證據；本輪依指示未啟 Chrome。
- 未發現 preview 寫入、nested mutate 失敗寫入或恢復不經明示 click 的具體反例；現有測試通過不等於覆蓋所有 fault injection。
