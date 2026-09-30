# Core4：本機草稿與恢復

Status: CORE4_GO / FINAL_CODE_GO / FINAL_HOST_GO / CORE_PROGRESS_4_OF_6

Owner「結案，就推上去，繼續」後，Core3 `59a2a65d37df077864ddbf4d3613cf8a91577189` 已推至遠端同 SHA；本卡從該 commit 建 `codex/edx-core-4-local-draft`。原六卡第4張 WP3-S2 是唯一 frontier：本機草稿存在才宣稱已保存、能恢復；能力缺失或寫入失敗須如實降級。第5張 Reset/Recompose、第6張 Final Closure 尚未啟動。原四個 untracked 保留。

## Objective／範圍

讓 portable HTML 編輯器在同一裝置、同一份來源下，能保存已提交的 DeckSpec 草稿，重新開啟後由使用者明確選擇恢復。沿 `runtime/deck-editor.js` 現有 canonical `spec`、`revision`、`mutate`／history authority 接入瀏覽器原生儲存；不得新增另一套 editor/document model、DB、持久化服務、背景程序、獨立 writer 或 runtime。不可用工作記憶中的 Undo history 代替持久化，亦不可把「另存 HTML」的成功文案當成本機草稿證據。

本卡只涵單份 deck 的本機草稿／恢復、必要 UI、測試、雙 viewport browser／匯出後離線重開及受管清理。既有產品 ZIP／四 protected 和 AI Core scanner／policy 不可無關改動；不跨第5張重排，也不處理第6張 migration。新 browser 儲存只在本機 profile；不傳外部服務，不在匯出 HTML 夾帶裝置草稿或儲存密鑰。

## 契約與驗收

1. 成功完成的 canonical 提交須在有界時間內自動保存，使非正常關頁後有草稿可恢復；不依賴另一次手動點擊。no-op、失敗、rollback、IME 未完成、gesture preview、未確認 dialog 不得被標成已保存。Undo／Redo 成功後的當前 canonical 也須可恢復。大型圖片或高頻 pointer 更新不得同步序列化整份 spec；儲存觸發須有界，且失敗不能破壞已提交的編輯交易。
2. 明確區分 `saved`、`pending`、`unavailable/failed`。本機儲存拒絕、quota、資料過大、讀取錯誤、格式不合時不得顯示成功；給出使用者可執行的「另存 HTML」路徑。不得靜默清除或覆寫舊草稿。
3. 僅同 deck／同初始來源的有效草稿可供恢復。重新開啟時先檢查結構、來源身分及產品契約；壞資料、其他 deck、過期版本不得寫入 canonical。恢復需要明確使用者動作；當前有未儲存編輯時不得靜默覆蓋。成功恢復後畫面、revision／history／選取狀態一致，後續編輯、Undo／Redo正常；匯出的 HTML 所嵌入 DeckSpec 必須是恢復後的 canonical。
4. 本機草稿只給本機 browser/profile 的能力保證；`file:`／storage 禁用／不同 profile 的情形以實測決定，不宣稱跨裝置、跨檔案、無痕模式或 hostile/compliance 保證。保存／恢復文案與實際 API 結果相符。
5. Focused tests 覆蓋正常保存→重開→明確恢復、no-op/失敗／回退不存、資料損壞／來源不符拒絕、quota／storage unavailable truthful degrade、已有編輯不被蓋、Undo／Redo、匯出／離線 reopen。正式 browser 1280×720／1600×900 檢查 UI 操作、errors、target close；affected PGQ 四支串行。產品／ZIP 身分按有無產品 delta 重新鎖定，原 protected 四檔 byte 保留；正式受管 root／marker／process cleanup。獨立 code/host/實圖 review 後才能判 Core4 GO。

## Mainline／交付邊界

Mainline 先鎖定既有儲存 seam、接受的能力保證與檔案身分，再交一名 Worker 作最小產品實作；Worker 不碰此卡、decision/receipt、browser host、ZIP／commit／push。Mainline 監督、驗收、review、收尾。Repair 同類兩次無進展即重判，第三次硬停；不得用新增持久化系統繞開。原 Core3 receipt I/O P2 與 Crop F2/P2 保留，不挪到本卡。不得 merge／push／deploy／production，除非 Owner 再明示。

## 候選與第一輪盲審（最新狀態）

Worker 首個候選只改 `runtime/deck-editor.js`、新增 `tests/edx-core-4-local-draft.test.mjs`；focused 9/9、相鄰回歸通過，但兩名盲 Reviewer 均 **NO-GO**，目前不得啟正式host／PGQ，也不得宣稱Core4完成。獨立原始收據：`evidence/edx-core-4-local-draft-recovery/review-a-code.md`、`review-b-code.md`。

- P1-A：同來源已有有效待恢復草稿時，重新開啟後直接編輯會靜默覆寫舊稿。Repair 1 須在使用者明示恢復／選擇取代之前保護既有有效草稿；加同來源重開反例。
- P1-B：quota使啟動 `setItem` 探針失敗時，仍可讀的舊稿被標不可用且恢復入口消失。Repair 1 須分開讀取與寫入能力；舊稿可恢復，新編輯的保存失敗如實提示；加滿額後重開反例。
- P2-A：`setItem` 成功但讀回失敗時，舊值可能已被取代，文案不得稱舊稿保留。針對實際能保證的 browser storage 契約做有界修復／如實標 unknown，不新增第二套持久化權威；補讀回異常反例。
- P2-B：恢復交易後段失敗時，恢復按鈕可能已隱藏。將按鈕隱藏移至交易整體成功後或納入既有回退，補故障注入。

以上是首個候選的同一輪 bounded Repair 1，非新產品卡、不擴產品模型。正式受管Chrome與四PGQ待新候選兩審GO後執行；browser腳本準備不算host證據。

## Repair 1 複審裁決與 Repair 2 成本核准範圍

原兩名獨立 Reviewer 對 Repair 1 的四個指定反例均判 PASS，fresh focused 13/13；但兩份複審仍判 **CODE NO-GO**。原始收據：`evidence/edx-core-4-local-draft-recovery/review-a-repair1.md`、`review-b-repair1.md`。未啟正式 Chrome／PGQ；進度仍為 3/6。依 Owner 的 AGENTS.md「Repair 2 需 Owner 成本核准」，下列第二輪產品修改須先獲明示核准；此段只鎖範圍，不代表已開工或驗收。

1. **P1：待恢復舊稿沒有明示捨棄路徑。** 在既有草稿 UI 提供清楚的「捨棄舊草稿，改存目前編輯」動作；只有使用者明示後才可取代已驗證的舊稿。驗證舊稿在選擇前位元組不變、選擇後當前 canonical revision 自動保存、重開能恢復新稿。失敗／取消不能假稱已保存或靜默刪稿。
2. **P2：舊稿確定消失仍保持待恢復鎖。** `getItem(key) === null` 可解除待恢復狀態並讓新提交重新排程保存；`getItem` 拋錯或結果不明仍封閉覆寫。驗證另一個 tab 清除 key 後按恢復，再編輯能保存；讀取故障不誤判為「已刪除」。
3. **P2：恢復交易已成功，通知故障卻報原稿未動。** 僅交易失敗可回報「原稿未改動」；將交易後 `markRestored()`／DOM 通知的 fault 與交易失敗分開，驗證 canonical、revision、畫面、按鈕及訊息不自相矛盾。用 status setter 故障注入重播原反例。

批准範圍限於 `runtime/deck-editor.js` 和 `tests/edx-core-4-local-draft.test.mjs` 的最小 delta、對應 browser 驗收腳本修正、兩名原 Reviewer 獨立複審；不新增持久化模型、writer、DB、程序或另一路 cleanup。複審未 GO 前不得啟正式 host／PGQ；取得 CODE GO 後再執行雙 viewport、受管 host／cleanup、affected PGQ 與產品／ZIP 身分驗證。若 Repair 2 同類問題仍 NO-GO，按第三次停損重新裁決，不自動開 Repair 3。此核准不包含 Core4 push、merge、deploy 或 production。

## 2026-09-30 Repair 2 最終實作與 code 裁決

Repair 2 依已核准範圍完成；沒有新增持久化模型、writer、DB、程序或另一套 cleanup。最終 delta 包含：明示「捨棄舊草稿，改存目前編輯」、`pendingRestore` 與 `replaceAuthorized` 分離、取代失敗後可由原入口重試、只有 exact readback 才宣告 saved、僅 `getItem(key) === null` 解除 pending，以及 restore canonical transaction 與 post-commit 通知 fault 分離。

最終產品身分：

- `runtime/deck-editor.js`：`a16fc058d15b2e1eb48c61960e7e653724be64ab602fc3a56ef663c21459d02a`
- `tests/edx-core-4-local-draft.test.mjs`：`90fe97848aedb2d67170a2ff3e97c81abcf8cbb0607357bb4aefa60c710c8dd2`
- `tools/edx-core-4-local-draft-browser-acceptance.mjs`：`000b1d3ecee801467cdd9e0df3e90301f7e06d38998e28a3d928ce48ebc43ed4`

Storage/state 契約的兩名 Reviewer 均回 **FINAL CODE GO**，收據為 `review-a-repair2-final.md`、`review-b-repair2-final.md`。正式 host 首輪揭露 play mode selector specificity 問題後，以只針對兩顆 recovery button 的 positive selector 做 bounded R2 修復；status span 仍隱藏、通用 `[hidden]` 契約不變。兩名 final host CSS Reviewer 亦均回 **FINAL CODE GO**：

- `evidence/edx-core-4-local-draft-recovery/review-a-host-css-r2-final.md`
- `evidence/edx-core-4-local-draft-recovery/review-b-host-css-r2-final.md`

相同工作樹的最終驗證：三個檔案 syntax PASS；`git diff --check` PASS；Core4 focused **18/18 PASS**，JUnit 為 `focused-hostfix-r2-final.junit.xml`；排除四支正式 host 串行 PGQ 後，non-browser **1083/1083 PASS、0 fail、0 skipped**，JUnit 為 `nonbrowser-hostfix-r2-final.junit.xml`。Distribution／install／rollback **26/26 PASS**。最終 `dist/PPTSKILL-0.1.0.zip` SHA-256 為 `5632dbf2f9c06e1762c3ba54f4873977a0e7b703e312663e190ae10b067aaad0`，包內 runtime 與工作樹 byte 相同。

## 正式 host admission 與修復歷程

最早的 canonical host admission 曾因 `CODEX_SANDBOX=seatbelt` 在 launch 前 fail-closed；該歷史紀錄保留於 `host-admission-blocked.md`，不再代表目前狀態。後續正式 host 的 `host-acceptance-02`、`host-acceptance-03` 揭露並驗證舊 CSS candidate 仍讓 recovery buttons computed `display:none`；兩輪只保留為失敗證據，不納入最終 verdict。

最終 candidate 保留 play mode 預設隱藏規則，僅以較高 specificity 顯示 `[data-action="restore-draft"]:not([hidden])` 與 `[data-action="replace-draft"]:not([hidden])`。Browser click helper 同時驗證尺寸、viewport 與 `elementFromPoint` hit-test；正式證據只採 `evidence/edx-core-4-local-draft-recovery/host-acceptance-04/`。

## 正式 host acceptance-04

- Controller：**PASS**，supervisor exit `0`，errors `[]`。
- Client：**PASS**，exit `0`，六個 commands 全部 exit `0`，無 timeout。
- 1280×720、1600×900 各 **12/12 checks PASS**；真 mouse click、recovery offered／restore／replace／reopen、Undo／Redo、export、offline reopen 全部通過。
- 兩個 viewport 均 `targetClosed=true`、`draftKeyRemoved=true`；console error、pageerror、network failure、HTTP error、remote request 全為 `0`。
- 四支 affected PGQ 串行完成，合計 **16/16 PASS**：`1 + 7 + 7 + 1`，四支 exit 均為 `0`。
- Browser/client 共用 outer PGID `80548`；browser、client return code 均為 `0`；owned root 與 isolation marker 已消失，process observation matches 為 `[]`。
- Before／after 共九個 identity 完全相同；四個 protected 檔案 hash 保持不變。

正式 receipt：

- `host-acceptance-04/controller-receipt.json`：`cb81c4172274b7cf47303dbfc87474bb5fb9f7e918e9073349e02ace9886fe44`
- `host-acceptance-04/client-receipt.json`：`19f49b86e113b42dca3d7350a3e58748e909334aeefd4f5cc5fb71e8d958ae40`
- `host-acceptance-04/browser/acceptance.json`：`5f3a02d69e0f3153af8a3f123a691ce1aed18da0d387c044fac9f15b1ed2f9a2`

## 獨立 host／實圖 review

- Host evidence Reviewer：**FINAL HOST GO**。未發現 P1／P2；Chrome stderr 的 display／GCM／Crashpad／Updater／GPU 背景診斷列為非阻塞 P3。收據：`review-host-final.md`。
- Visual Reviewer：**FINAL HOST VISUAL GO**。雙 viewport 的 recovery buttons 可見、完整、可點；restore 後正確消失且既有控制列正常。`1600-restore-offered.png` 的標題位於既有 motion 中間幀，stable 的 `1600-restored.png`、`1600-offline-reopen.png` 沒有持續裁切或 layout shift，因此列為低風險、非阻塞 P3。收據：`review-visual-final.md`。

## Core4 關卡裁決

Core4「本機草稿與恢復」已達成 code、正式 host、四支 PGQ、lifecycle cleanup、獨立 host review 與實圖 review 的完整驗收鏈，裁決為 **CORE4 GO**。核心進度由 **3/6 更新為 4/6**；第5張 Reset／Recompose 尚未啟動。

完整機器可讀收據：`evidence/edx-core-4-local-draft-recovery/verification-repair2-final.json`。本次沒有 commit、push、merge、deploy 或 production；既存 `tasks/edx-core-six-card-closure-plan.md` 修改未納入本次變更。

## 2026-09-30 Repair 2 後獨立複審：撤回 Core4 GO（最新有效裁決）

`verification-repair2-final.json` 與上文 CORE4 GO 僅記錄當時已測路徑；獨立複審發現並由 Mainline 用目前 `createLocalDraft` 重播新的 P1，故 **撤回 CODE GO／CORE4 GO，進度維持 3/6**。反例與主線重播收據見 `evidence/edx-core-4-local-draft-recovery/review-post-repair2-read-fault.md`。

有效舊稿已供恢復時，第一次 `getItem(key)` 暫時拋錯會使 `read()` 將 `blocked` 永久設為 true。第二次讀取成功、`markRestored()` 顯示「本機草稿已保存」後，新 revision 的 `commit()` 因 `blocked` 直接返回：保存工作數為 0，storage 仍是舊稿。這是可造成關頁後資料遺失的狀態與保存契約違反。現有 focused 18/18 只驗證讀取故障時不覆寫，沒有涵蓋故障解除→重試恢復→再編輯。

修復方向只限於區分可在後續精確合法讀取後解除的暫時 read fault，與必須永久 fail-closed 的無效草稿／寫入後讀回結果不明；並補上述完整回歸。但本卡 Repair 2 後仍出現同類狀態契約缺口，依既定停損 **不自動開 Repair 3、不改產品或 ZIP、不啟新 host／PGQ、不開 Core5**。須重新裁決觀察／狀態契約與成本後才能另行授權。既有 host 24/24、PGQ 16/16、cleanup 與身分證據仍為當時測試結果，不能作為本次 P1 的通過證據。尚無 Core4 commit、push、merge、deploy。

## Owner 明示修復後的 Repair 3 候選（最新狀態）

Owner 直接指示「啊你修啊」，因此本輪在上段停損後，僅針對已重播的 P1 開有界 Repair 3；這不是自動續修，也不撤銷先前 NO-GO 證據。`read()` 現把暫時 `getItem` 故障、無效草稿、寫入後讀回不明分開封鎖：只有後續精確讀到合法同來源草稿，才解除暫時讀取封鎖；其餘兩類仍 fail-closed。`markRestored()` 在封鎖仍在時不再聲稱「已保存」。

新增 mounted 回歸驗證「舊稿→一次讀取故障→重試恢復→新編輯→pending/saved→storage 寫入新 canonical」，另驗無效草稿與寫入不明不會被後續合法讀取解鎖；browser harness 也增加同一路徑的一次性 `getItem` 故障情境。RED 反例在修改前失敗，修後 focused **20/20**、相鄰 86/86、非瀏覽器 **1085/1085**、distribution **14/14**、syntax 與 `git diff --check` 通過。ZIP 重建 SHA-256 `4afe034f3f52a31185b5193cfd68714e97475a5932a65f02698027556d8c0cf3`，包內 editor runtime 與工作樹 hash 相同。

這只是 CODE CANDIDATE：獨立複審與新候選的正式 managed host／雙 viewport／affected PGQ 尚未執行；舊 host 24/24、PGQ 16/16 不可借用。維持 **3/6**，不開 Core5；本輪無 Core4 commit、push、merge、deploy。詳 `evidence/edx-core-4-local-draft-recovery/repair3-local-result.md`。

### 新候選正式 host-acceptance-05（最新證據）

以上「host 尚未執行」是執行前狀態，已由新收據取代。受管 controller **PASS／supervisor exit 0／errors 空**；雙 viewport 各 **13/13**，包含新增的一次讀取故障→重試恢復→後續自動保存，console/pageerror/network/HTTP/remote request 均為 0；兩個 target 關閉、測試草稿 key 清除。四支 affected PGQ 串行 **1+7+7+1＝16/16 PASS**，browser、PGQ、Browser.close 均 exit 0。before/after 九檔身分相同，owned root 與 marker 消失、PGID 程序觀察為空。原始收據在 `evidence/edx-core-4-local-draft-recovery/host-acceptance-05/`。

目前是 **HOST PASS／獨立複審待決**，不能單靠本機與 host PASS 恢復 Core4 GO；整體仍 **3/6**，不開 Core5、不推送。需針對 read-fault 解鎖、invalid／write-unknown 永久封鎖、狀態訊息和新 browser 情境做 fresh 獨立 review。

## 2026-09-30 Repair 3 獨立複審與最終關卡（最新有效裁決）

Owner 轉達 Repair 3 fresh independent review：**FINAL CODE GO／FINAL HOST GO，未發現阻塞問題**。複審核對暫時 read-fault 僅在合法、同來源、同 deckId 且通過 canonical 驗證的草稿讀取成功後解除；invalid 與 write-unknown 保持 fail-closed，`markRestored()` 在仍封鎖時不誤報 saved。這輪 Repair 3 的修復範圍沒有另設兩名 Reviewer 條件；前述雙審為 Repair 2 條件，不借用來宣稱 Repair 3 已雙審。

最終測試引用 fresh focused **20/20**、83 個檔案的非瀏覽器集合 **1085/1085**、新候選 `host-acceptance-05` 雙 viewport 各 **13/13** 與四支 affected PGQ **16/16**。舊候選 JUnit 的 **18／1083** 和 hash 不作本輪完成證據。新 ZIP 包內 editor runtime hash 與工作樹相同，正式 controller 記錄九檔 before/after 一致、root／marker 清除與 PGID observation matches 空；複審現場重查舊 PGID 遇 sandbox `operation not permitted`，故程序收斂以正式 controller 收據為證，這項觀察限制保留。

裁決恢復 **CORE4 GO，六卡進度 4/6**。Core5 Reset／Recompose 尚未啟動；Core4 本輪未 commit、push、merge、deploy 或 production。最終機器可讀收據：`evidence/edx-core-4-local-draft-recovery/verification-repair3-final.json`，保留先前 Repair 2 NO-GO 與 Repair 3 候選收據作歷史證據。
