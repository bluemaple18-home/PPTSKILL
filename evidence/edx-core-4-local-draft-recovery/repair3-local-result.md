# Core4 Owner 授權後有界 Repair 3：本機候選收據

Date: 2026-09-30
Status: CODE CANDIDATE / HOST PASS / INDEPENDENT REVIEW PENDING / 3 OF 6
Base HEAD: `59a2a65d37df077864ddbf4d3613cf8a91577189`
Branch: `codex/edx-core-4-local-draft`

Owner 在 Repair 2 後的 NO-GO／停損收據上直接指示「啊你修啊」，授權此次有界修復。僅處理 `createLocalDraft` 的暫時讀取故障封鎖。`getItem` 拋錯標為 `read-fault`，後續精確讀到合法、同來源草稿才解除；格式／來源無效與寫入後讀回不明仍保持封鎖。封鎖未解除時 `markRestored()` 不得報 `saved`。沒有新增持久化權威、writer、DB 或 runtime 程序。

驗收反例先加測並在修復前 RED：mounted 恢復重試後新編輯的狀態仍為「本機草稿已保存」而非 pending，保存工作沒有排程。修後 GREEN：一次 `getItem` 故障→重試恢復→新編輯→pending/saved→localStorage 與新 canonical 相等。另測無效草稿與寫入結果不明在後續合法讀取後仍不可解鎖。Browser harness 增加相同真滑鼠點擊／儲存讀回情境，尚未在正式 host 執行。

本機驗證：focused 20/20；Core3 transaction／Undo-Redo 加 focused 86/86；排除四支正式 host PGQ 的非瀏覽器集合 1085/1085，0 fail／skip；distribution 14/14；runtime／browser script syntax 與 `git diff --check` PASS。新 ZIP 已由 `pnpm run build:dist` 重建，包內 editor runtime SHA-256 與工作樹一致。

身分：

- `runtime/deck-editor.js`：`95d027a6ba8723f7a18bad27e5f072d51efdbf301ed798d6b538f74fa8c66790`
- `tests/edx-core-4-local-draft.test.mjs`：`a8349e2e1a7d363b21a57aaec72e79f1ac5a7eba25efee0e687c240df9ceef2a`
- `tools/edx-core-4-local-draft-browser-acceptance.mjs`：`2cdd36d5415d8ca6d07f2aa2678743a91bbe0c8f3978b05158640baecdc3cae8`
- `dist/PPTSKILL-0.1.0.zip`：`4afe034f3f52a31185b5193cfd68714e97475a5932a65f02698027556d8c0cf3`

先前 `verification-repair2-final.json` 與 host-acceptance-04 屬舊候選，不作此新產品／ZIP 的 host 或 PGQ 結論。仍需獨立 code review、新候選的 managed browser 雙 viewport、affected PGQ、cleanup 與身分驗證；未宣告 Core4 GO、未開 Core5。本輪未 commit、push、merge、deploy。

## 後續正式 host-acceptance-05 收據

上段 host pending 是正式執行前狀態。現已使用既有 AI Core canonical `tmp_session browser` 受管 controller，以新候選產品／ZIP 執行：controller PASS、supervisor exit 0、errors []；client PASS，browser、四支 PGQ、Browser.close 六個命令均 exit 0。雙 viewport 各 13/13 checks PASS，含新增 read-fault retry-save 真 Chrome 情境；兩個 target 均已關閉、草稿 key 清除，console/pageerror/network failure/HTTP error/remote request 全為 0。四支 PGQ 原始 TAP 為 1+7+7+1＝16/16 PASS，0 fail／skip。before/after 九檔身分相等；owned root、isolation marker 不存在，受管 PGID 程序觀察 matches=[]。

原始證據位於 `host-acceptance-05/`，其三個主收據 SHA-256：

- `controller-receipt.json`：`c117495cf765c7bec24bf148939ba0ed20b90114d9ed227505d430c9b28fca22`
- `client-receipt.json`：`8c22510f5f9e77caf448fd345daf626f83e39c93b2cf7b6625e896d82e0b5416`
- `browser/acceptance.json`：`aaa278d6ad4e22d3f11700b842421c825d4d828894afc128e10542cb028a4437`

此證據將 host 狀態更新為 PASS，但仍須 fresh 獨立 code／host review 後才可裁決 Core4 GO。產品／ZIP、four protected 與 Core5 未在 host 期間被改動；未 commit、push、merge、deploy。
