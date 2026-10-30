# Core5 Recompose review probes

Status: REVIEW_INPUT / CANDIDATE_NOT_YET_ACCEPTED

產品候選完成後，Reviewer 應以 public Node 與 portable API 重播：

1. `recompose-slide` 僅允許同 primitive、相同 slots、已存在 renderer CSS variant；把 primitive／slots 換成其他合法 CompositionSpec 也必須拒絕，不能只更新 canonical。
2. payload 不含 override scope 時，geometry／typography／motion、group/lock、content、stable IDs、其他 slides 與 asset bytes 全部保留；顯式只取代 geometry 時 typography/motion 仍保留，反向亦然。
3. 若需丟棄人工 override，必須有明確 destructive scope 與確認；拒絕／關閉／stale click 不得改 spec、DOM、revision、history、draft 或 export。
4. 成功提交後 variant class、manual override DOM 投影與 canonical 一致；Undo／Redo 和匯出離線重開回到同一版面。故障注入在 DOM class、geometry/typography 投影、history controls 或通知時不得留下半提交。
5. 大 spec 的 pointer/gesture hot path 不因此序列化整份 Deck；無第二 renderer、writer、schema 或外部依賴。若任何一點需跨 primitive runtime，記錄缺口，維持 Core5 4/6。
6. 真 UI 必須讓使用者選擇現有支援 variant，明列本次將取代／清除的 override scopes，且只能在確認後呼叫 operation；API payload 自填 `confirmedScopes` 本身不足以證明使用者確認。取消、重入、stale revision、沒有可用 variant 都應 fail closed。
7. `data-type-visual` 在 variant 切換、先改標題再切換、Undo／Redo、草稿恢復及匯出重開後，需與 fresh renderer 的存在與 token/class 相符；chart token 若隨可編輯內容改變，也須重播同一一致性門檻。
