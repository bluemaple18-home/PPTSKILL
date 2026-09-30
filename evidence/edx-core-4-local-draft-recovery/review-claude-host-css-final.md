FINAL CODE NO-GO

# Core4 host CSS 修復：獨立 code review

## 根因確認（修法方向正確）
- 舊的預設隱藏 selector `.pptskill-editor>:not([data-action="edit"]):not([data-action="layout"])` 的權重是 (0,3,0)。`runtime/deck-editor.js:483` 的 `.pptskill-editor>[data-local-draft]{display:inline-flex}` 只有 (0,2,0)。所以在 play mode 裡，即使 `hidden=false`，computed display 仍是 `none`。這和修復前 host 證據（hidden=false 但 computed visible=false）一致。
- 新 selector 多了 `:not([data-local-draft])`，把 draft 元素排除在預設隱藏之外。restore/replace 會吃到 :483 的 `inline-flex`，`hidden` 時由 :483 的 `[data-local-draft][hidden]{display:none!important}` 和 :484 的通用 `.pptskill-editor>[hidden]{display:none!important}` 雙重擋住。hidden 的契約成立。
- edit/layout 按鈕：本來就被排除，沒有變。其他沒有 `data-local-draft` 的 toolbar、save、delete、status：仍被預設規則隱藏，:484 的 layout 規則也沒有動。edit mode 本來就用 `body[data-editor-mode="edit"] .pptskill-editor>*` 全部顯示，沒有差別。
- click 路徑：`runtime/deck-editor.js:877` 讓 restore-draft 和 replace-draft 直接走 `editorClick`，沒有 mode 門檻。只要看得見，就點得到。
- storage、state、export cleanup、通知 fault 邏輯（:626–632、:837、:868、:876）都沒有被這個 delta 碰到。

## Findings

### P1：本機草稿狀態文字在 play/layout mode 被一併放寬顯示，超出契約
- **位置**：`runtime/deck-editor.js:480`（`:not([data-local-draft])`），相關程式在 :527 和 :626–629。
- **觸發**：:527 產生的 `<span data-local-draft role="status">` 也帶有 `data-local-draft`，但它從來沒有 `hidden` 屬性。:627 的 `draftRecoveryControls` 只切換兩顆按鈕。修復後，這個 span 在 play mode 和 layout mode 永遠是 `inline-flex`：
  - 有文字時（例如「本機草稿可用」「本機草稿已保存」「本機草稿待保存」，或失敗訊息），在簡報模式會一直疊在右下角 toolbar。
  - 沒文字時，也會多佔一個 flex gap。
- **風險**：違反「其他 controls 不得被放寬」。即使沒有 pending draft，簡報畫面也會變。focused 測試和 harness 都沒有檢查 status span 的 computed display，所以 18/18 和 host 驗收都抓不到。
- **最小修法**：只排除兩顆按鈕。

  ```
  .pptskill-editor>:not([data-action="edit"]):not([data-action="layout"]):not([data-action="restore-draft"]):not([data-action="replace-draft"]){display:none}
  ```

  - 權重 (0,5,0)，按鈕仍由 :483 決定 `inline-flex`，`hidden` 時由 `!important` 隱藏。status span 回到 play mode 預設隱藏。
  - `tests/edx-core-4-local-draft.test.mjs:62` 的 regex 要跟著改成比對這兩個 action 的 `:not(...)`。
- **取捨**：這個修法下，play mode 裡恢復失敗的訊息（:876 寫到 draftNode）一樣看不到，這和修復前的行為相同。如果產品上希望 play mode 顯示這段狀態，要先修訂契約。修訂後可以保留目前的修法，但要補一條測試，明確規定 status span 在 play mode 什麼時候可見。無論選哪邊，目前這個「沒規定、沒測試的放寬」都不能 GO。

### P3：測試 line 62 的 regex 太寬，擋不住退化
- **位置**：`tests/edx-core-4-local-draft.test.mjs:62`
- **觸發**：regex 只比對 `:not([data-local-draft]){display:none}` 這段結尾。如果有人把前面的 edit/layout 排除刪掉，或 selector 被改成套到別的地方，測試仍會 PASS。這也是字串斷言，不是 computed style。
- **最小修法**：斷言完整 selector 字串（包含 `.pptskill-editor>` 和 edit/layout 的 `:not`）。另外可以補一條斷言：status span 在 play mode 不應被放寬（對應 P1 的決定）。

### P3：harness 的 click helper 沒檢查遮擋和尺寸
- **位置**：`tools/edx-core-4-local-draft-browser-acceptance.mjs:178–183`
- **觸發**：:180 只檢查 hidden 和 display，沒有檢查 `document.elementFromPoint(x,y)` 是否就是該節點（或它的子節點），也沒有檢查 box 寬高大於 0、座標在 viewport 內。Core3 才剛發生過 fixture 遮擋。
- **風險**：真實滑鼠點擊可能落在別的元素上。後續狀態等待（:185–191）大多會以逾時失敗，所以仍會 fail-loud，但失敗原因會被誤導成「狀態逾時」。
- **最小修法**：在 :181 前加上 hit-test，不符合就 throw，例如 `UI 控制被遮擋`。

### 觀察（不阻塞）
- restore/replace 在 layout mode 也從「CSS 強制隱藏」變成「依 hidden 決定」。這符合「pending 時可點」的本意，P1 的修法也保持這個行為。建議在契約裡寫明 layout mode 也要可見。

## Harness fail-loud 判定
- :173–174 的可見性要同時滿足 `!hidden` 和 computed display 不是 `none`。
- :180 不可見就 throw，:149 會把 exceptionDetails 轉成錯誤往上拋。
- 按你的描述，新增的診斷欄位（:172 等）只是額外輸出，沒有放寬任何斷言。
- 結論：仍然 fail-loud，只有 P3 的遮擋盲點。

## 證據限制與剩餘風險
- 我只讀了 source，沒有執行 `node --check`、測試、瀏覽器或 host，也沒有自己驗 SHA。18/18、1083/1083 和修復前 host 數據都是轉述，我沒有重跑。
- 我沒看到「notify 在載入或 play mode 什麼時候第一次寫入 status 文字」的實測。所以 P1 在簡報時的實際可見程度（有沒有文字、opacity 是 .28 時多明顯）還沒量到。不過這個放寬本身已經確定。
- 修復後的 host 還沒跑。GO 之後至少要在兩個 viewport 各跑一次：pending 時兩顆按鈕的 computed display 不是 `none`，而且 hit-test 通過；restore 或 replace 之後 `hidden=true` 且 display 是 `none`；沒有 pending 時 play mode 的 toolbar 只剩 edit/layout（用來驗證 P1）。
- 沒有評估 `.pptskill-editor` 的 `flex-wrap` 加上新增按鈕後，在窄 viewport 會不會蓋到 slide 內容。
