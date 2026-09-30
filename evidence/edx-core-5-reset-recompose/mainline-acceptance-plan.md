# Core5 驗收預案（產品候選前）

Status: PLAN_ONLY / NOT_ACCEPTANCE
Base: `098177ac395d1dcf0d02f30c102ceb8c0f11abe5`

用真 public operation 與真滑鼠 UI 分別驗證，不借用 Core4 host 證據：

1. 先做人工 geometry／typography／motion，再只改文字：三類 override、group/lock、其他 slide、stable IDs 與既有 asset bytes 保留；成功交易的 draft、Undo／Redo 與匯出一致。
2. 對一張已改 slide 操作 Reset：取消時 canonical、DOM、revision、history、draft、export 不變；確認後只有該 slide 回到編輯起點，其他 slide 及 deck setting 原樣；Undo／Redo、離線 reopen 一致。若 slide 是 duplicate，必須明示支援的來源映射或拒絕，不能誤重設別張。
3. 對有人工 override 的 slide 操作 Recompose：未明示要取代的 scope 保留；明示清除某 scope 才能移除；content、stable IDs、assets、other slides 不變。確認前後的版面、canonical、draft、Undo／Redo、export/reopen 同步；不存在 renderer 支援的候選應 fail-loud。
4. 故障注入：錯 slide／stale target／不合法 primitive／slot／scope、確認拒絕、DOM 投影後段 throw、history/notification fault 均不可留下半提交或假 saved。
5. 正式 host 使用既有 AI Core 受管 Chrome，同群組 client 串行執行雙 viewport 和四支 affected PGQ；listener 先於 navigation；收據含 console、pageerror、network、HTTP、remote request、截圖／DOM 量測、target close、root／marker／PGID 清理及 before/after identity。

門檻：兩名盲 reviewer 只在涉及 activation／rollback／teardown 實作時強制；其他 review 依風險指定，不能用測試 PASS 代替獨立判斷。若產品候選無法如實投影或有未關閉 P1，停止 host，不更新 5/6。
