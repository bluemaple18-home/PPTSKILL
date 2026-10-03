# Core5：Reset／Recompose 與人工 override 保留

Status: CORE5_ACCEPTED / FUNCTIONAL_PASS / VISUAL_PASS / INDEPENDENT_CODE_HOST_GO / MAINLINE_INTEGRATED / TOTAL_ACCEPTANCE_GO

基準：Core4 本機 closure `098177a`，分支 `codex/edx-core-5-reset-recompose`。Core4 已依 Repair 3 fresh review 與 host-acceptance-05 裁決 GO，產品、ZIP、證據形成可回退 checkpoint；第6張 Final Closure 尚未開始。既有 `tasks/edx-core-six-card-closure-plan.md` 修改與四個 protected untracked 保留，不納入本卡。

## 目標與決策邊界

交付 WP4-S1：使用者能明確重設目前 slide，也能對目前 slide 明確採用新的有界 CompositionSpec；普通 content patch 保留人工 geometry／typography／motion 等 overrides。沿既有 `DeckSpec`／CompositionSpec、operation descriptor、canonical `spec`／revision／history、renderer／sanitizer、local draft 與 export，不加第二套 layout DB、writer、host runtime、AI 服務或任意 HTML/CSS patch。

三種語義必須區分：`reset-slide` 只將指定 slide 回到**本次開啟編輯時**的基準（保留 slide ID、其他 slides 與 deck setting）；`restore-edit-start-deck` 是整份 deck 的另一種破壞性操作，本卡不以單頁 Reset 冒充；`recompose-slide` 僅在使用者明示且候選 composition 通過既有 schema／primitive／content identity 驗證時替換指定 slide 的視覺 composition，不接 AI bridge。若 portable runtime 無法如實投影某類候選，須 fail-loud 限縮到確實可投影的 approved subset，不可 canonical 已改而畫面不變。

Reset 可能清除指定 slide 在本次編輯期間的內容、元件、人工 layout 與 style 更動，操作前須明確顯示影響範圍並要求確認；取消／驗證失敗／rollback 不得改 canonical、DOM、revision、history、draft 或匯出。Recompose 預設只改指定 slide 的 composition，保留 content、stable IDs、assets、其他 slides、group/lock 與既有人工 overrides；僅 payload 明示列出的 override scope 可被取代／清除，UI 必須展示該 destructive scope。所有成功操作是一筆可 Undo／Redo 的 canonical 交易，後續 draft 保存與 export/reopen 一致。

## Prior art／最小吸收

- Prior Art／Classification：直接重用 repo 的 Operation Registry、CompositionSpec sanitizer／primitive validation、editor transaction/history、renderer 與受管 browser harness；Excalidraw／donor 只作既有 UX 參考，不導入依賴。
- License／Pinned Version／Bundle Cost：沒有新套件、下載或 runtime；現有 ZIP 20 MiB 上限與原 protected／capacity 契約不放寬，以新 ZIP 實測。
- Why not less：只改 JSON 或只做按鈕不能保證畫面、draft、Undo、export/reopen 同一真相；無 scope confirmation 會抹掉人工修改。
- Why not more：不建通用 AI 重排引擎、整份 Deck restore、第二套 layout state、任意 primitive renderer、外部服務或第七張主卡。若跨 primitive 重排需要上述新 runtime，記錄 measured gap 回主線裁決。

## 驗收

1. 先 RED→GREEN：content-only patch 不洗人工 geometry／typography／motion；`reset-slide` 只重設目標 slide，取消及故障維持原樣，成功後 revision 一次、Undo／Redo、draft、save/reopen 正確。
2. `recompose-slide` payload 必須精確聲明目標 slide、候選 composition 與可取代的 override scopes；未列出者 byte-preserve。錯 deck／slide／primitive／slot／identity、stale intent、未確認破壞性 scope 與 unsupported renderer 均 fail closed。成功後 DOM 與 canonical 一致、其他 slides/content/assets/IDs 不變，Undo／Redo 與 export/reopen 一致。
3. Browser 真滑鼠操作驗證確認／取消、人工 override 保留與明示取代、雙 viewport 1280×720／1600×900、console/pageerror/network/HTTP/remote request、匯出離線重開。四支 affected PGQ 串行；受管 root、marker、process 清理及產品／ZIP／protected 身分收據完整。既有 Core4 20/1085 與 host-acceptance-05 不作本卡 fresh 驗收。
4. 獨立 code／host／實圖 review 無阻塞後才能更新至 5/6。原 Crop F2/P2、receipt I/O P2 保留到第6張重判。

## 派工與停損

Mainline 負責契約、baseline、派工、審查與驗收；一名 clean native Worker 只在指定 delivery code／tests 寫入，Mainline 不與其並行寫同檔。Worker 不碰此卡、控制收據、ZIP、commit／push 或正式 host。先回報現有 renderer 能否在 portable 上支援 proposed `recompose-slide` subset；若無法滿足上述 DOM/canonical 一致，不得以 JSON-only 假完成。Repair 2 需 Owner 成本核准；同 blocker 第三次停。此卡不含 merge、push、deploy 或 production。

## Renderer feasibility 裁決（同卡有界子集）

Worker 先查現有 source seam，結論是：portable 可真實支援**同一 primitive、相同 slots／stable IDs、切換既有 renderer CSS variant** 的 Recompose，並僅取代 payload 明示的 geometry／typography override scope；跨 primitive 或 slots 改寫沒有現成完整 renderer，必須 fail closed。這不是 Core5 驗收完成，只是可實作的最小 Recompose 子集。現有 history 投影對 Reset 的元件增刪 Undo／Redo 尚有獨立缺口；仍須在本卡處理，不能以 recompose 局部通過替代 Reset。feasibility 收據：`evidence/edx-core-5-reset-recompose/renderer-feasibility.md`。

## Recompose Repair1 後主線裁決

候選已具備 canonical 同 primitive／同 slots／明示 override scope 的交易、focused 9/9 與相鄰 73/73；Repair1 在提交前拒絕清除會使 fresh renderer 省略的 geometry-only component，避免 DOM 殘影。主線 fresh focused 9/9、`git diff --check` 通過。

然而 variant 切換只改 `.slide` class，未同步 `renderWorldChrome` 的 `data-type-visual` 節點。`component-focus` 的 `quote-monument → evidence-axis` 可重現 live DOM 無節點、fresh renderer 有節點；`title-points` 的 `editorial-index → dense-ledger` 也需更新該節點的 class／字樣。故目前 Recompose **CODE NO-GO**；Reset／UI confirmation／browser／PGQ 均未完成，不得更新 5/6。Repair2 的最小候選是在既有 renderer seam 精確投影該節點（含 Undo／Redo、draft restore、rollback），或對無法真實投影的 variant fail closed；不得靠 Node canonical 單獨通過。依本 repo AGENTS.md「Repair 2 需 Owner 成本核准」，後續產品修補待 Owner 明示授權。裁決詳見 `evidence/edx-core-5-reset-recompose/recompose-repair1-mainline.md`。

Owner 已於互動對話明示「修」，核准上述有界 Repair2。Worker 已補 `data-type-visual` 的 variant 投影，並在主線複核找到的「先 edit-text 改標題，再 Recompose」路徑補同步與回退。focused RED 重現後 GREEN 16/16；主線 fresh focused 16/16、`git diff --check` PASS。這只構成 Recompose **code candidate**；尚缺人機 UI scope confirmation、Reset、真 browser／PGQ 與獨立完整驗收，不能宣告 Core5 GO。正式 Repair2 收據待與其餘 Core5 證據一併鎖定。

## 本機候選與 host 停損

Reset 已以 edit-start 單頁基準完成受限 Node／portable operation，真 UI 顯示清除範圍並確認；元件增刪、Undo／Redo、草稿、匯出與回退納入 focused tests。Recompose UI 由使用者選擇既有 variant 與明示取代範圍，確認後才執行；取消／非法選項不變。focused fresh 22/22、受影響 targeted 53/53；完整 `pnpm test` 1107/1111，四個失敗均需 Chrome DevTools port，sandbox 沒啟動該 port。產品 runtime 已重建到 ZIP，hash／protected 身分見 `evidence/edx-core-5-reset-recompose/local-candidate-receipt.md`。

正式 browser／雙 viewport／四支 PGQ **尚未執行**。AI Core `tmp_session browser` 在 `CODEX_SANDBOX` 非空時規定 exit 2 並拒絕啟動；Codex IAB 亦明確拒絕 `file:` 且禁止替代繞行。因此此卡維持 **HOST_BLOCKED / 4/6**，不能把合成 VM 或舊 Core4 host 收據當作 Core5 驗收。下一步只能在允許的正式 host 跑受管瀏覽器收據、四支 PGQ 與獨立 review，完成後再裁決 5/6。

## 正式 host 三輪停損（Owner 已授權）

Owner 後續明示「允許」正式 host 驗收；`require_escalated` 唯讀預檢確認不在 `CODEX_SANDBOX`。沿 AI Core `tmp_session browser` 與既有 Core4 單一 PGID controller/client 製作 Core5 專用 harness，已執行 `host-acceptance-01`、`02`、`03`。三輪 supervisor 均 exit 2、browser client NOT_PASS；三輪 owned root／marker 清除且 PGID/root 觀測無殘留。`01` 的 harness 誤以 save 控制可見證明 edit mode；`02` 揭露 Recompose 按鈕被 CSS 隱藏；`03` 兩個 viewport 均通過前三項重組檢查後揭露 Undo 按鈕在 edit mode 隱藏。三輪都未進四支 PGQ，**HOST NO-GO**。

當時產品另補 edit mode 下 Save／Undo／Redo／Reset／Recompose 可見性，重建 fixture／ZIP，focused+相鄰 46/46 PASS。當時最新 CSS **未經 host 重驗**。依 AGENTS.md「同一 blocker 第 3 次失敗即停」，未自動執行第4輪；先封存三輪原始證據、產品身分與 CSS 修正，等待 Owner 對停損後重跑做新裁決。詳見 `evidence/edx-core-5-reset-recompose/host-stop3-receipt.md`。

## 2026-10-01 正式 host 續跑與視覺停損

Owner 在看過 UI stop-3 根因後明示「繼續」，主線執行 host-acceptance-04 至 06。04／05 的受管 browser、雙 viewport 各 8/8、四支 PGQ 16/16、cleanup 與身分均 PASS；產品、ZIP 未變。原圖複核發現 04 的截圖取於動效中且 fixture 文字重疊，05 的引用文字超出卡片底部；06 新增的四邊內縮 gate 又把原 variant 的合法行框當作失敗。故功能證據保留，Core5 **VISUAL NO-GO／4/6**，第 06 輪後停止此視覺驗收線，不自動重試。下一步僅是重新裁決 variant 對應的 visual gate 與負控制，詳見 `evidence/edx-core-5-reset-recompose/host-visual-stop3-20261001.md`。

## 2026-10-01 host-acceptance-07

Owner 在視覺 stop-3 後再次明示「繼續吧」。主線只修 browser visual gate：依 `quote-monument`／`evidence-axis` 分別驗證，並沿第 05 輪量測保留卡片溢出的 RED 負控制。第 07 輪正式受管 host：雙 viewport 各 8/8、四支 PGQ 16/16、八張實圖核對、console/pageerror/network/HTTP/remote request 空、cleanup 與十檔身分一致，產品與 ZIP 未變。主線裁決 `HOST_PASS / FUNCTIONAL_PASS / VISUAL_PASS`；依本卡第 4 項，尚待獨立 code／host／實圖 review，故進度仍為 **4/6**，不得先開 Core6。完整收據：`evidence/edx-core-5-reset-recompose/host-acceptance-07/mainline-receipt.md`。

## 2026-10-01 chart patch P1 與 host-acceptance-11

獨立複審發現 evidence-axis chart component patch 後 live type visual 留舊值。產品最小修復沿既有交易投影與回退；公開 API 的成功／故障回歸先 RED 後 GREEN，Core5 24/24、相關合併 82/82 PASS。正式選頁 authority 為第一頁 `currentId`；focused 受管 host 以 evidence 首頁開啟，雙 viewport 各 3/3 驗證 92→77 的 canonical、chart DOM、type visual、fresh renderer 與匯出離線重開。controller PASS、四支 PGQ 16/16、Browser.close 與 root／marker／程序清理正常，前後十檔 SHA 一致。獨立 code／host reviewer 裁決 GO，未發現阻塞問題；前述第 07 輪完整視覺驗收證據保留。主線裁決 **Core5 5/6**；commit／push 狀態以 Git 為準，本卡不授權 merge、deploy 或 Core6 產品開發。接續收據：`evidence/edx-core-5-reset-recompose/chart-patch-repair-20261001.md`；原始證據：`evidence/edx-core-5-reset-recompose/host-acceptance-11/`。
