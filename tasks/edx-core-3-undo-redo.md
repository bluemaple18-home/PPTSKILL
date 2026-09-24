# 核心完整版 3/6：operation-level Undo／Redo

Status: OPEN / CONTRACT_LOCKED
Branch: `codex/edx-core-3-undo-redo`
Base: `115027040a169c505df0e7f31a0a8845280a4ed7`（Core2 closure）
Parent: `tasks/edx-core-six-card-closure-plan.md` 第3項（WP3-S1）
Trace: `CORE3-SC-01` 可撤銷提交、`CORE3-SC-02` 重做與分岔、`CORE3-SC-03` DOM／匯出一致、`CORE3-SC-04` 忙碌與原生鍵盤邊界；均對應父卡第3項，不新增第七張產品卡。

## 目標、依賴與實測缺口

Core2 已獨立 Review GO，產品與 ZIP 固定 SHA `88f401c7798976babfd28df991a6ba5b6b784e4e`；本分支從其 closure 建立，尚未 merge／push。現有 `OPERATION_DESCRIPTORS.undoable` 已標示哪些操作可回復，但 Node／portable editor 沒有可用 Undo／Redo，人工操作無法撤銷。CodeGraph 對 deck-editor/history 查詢只回無關舊 symbols，改用 bounded source 檢查 Node `commit`／`executeOperation`、portable `revision`／`markChanged` 與直接 slide/patch 寫入。前置依賴 Core2 GO 已滿足，frontier 只有本卡；第4張 draft/recovery 和第5張 recompose 尚未開始。

## 固定產品契約

1. DeckSpec 仍是唯一 canonical authority。歷史只在當前 editor instance 的記憶體中保存已成功提交的 operation 邊界；不寫入 DeckSpec/schema、export HTML 或 localStorage，不增另一套 document model。Node 與 portable 使用同一個最小歷史規則，UI 經現有 editor mutation/projection 路徑。
2. 只把現有 descriptor `undoable === true` 的 **實際 canonical 變更**記成一筆。現有 false descriptor 不偷偷改成 true：insert/delete/replace/crop/typography 等若成功改變 canonical，作為 history barrier 清除 undo/redo，避免往回覆蓋不曾記錄的變更。`copy-style` 僅改 editor clipboard，沒有 canonical 變更，不建立 entry。slide reorder/duplicate/delete、direct component patch 等非 operation canonical 寫入也必須設 barrier。若出現無法攔截的 writer，停止擴 scope 並回報。
3. 成功 undo 還原該筆 operation 前的完整合法 canonical 值；redo 還原其後值。每次成功 replay 增加一次單調 revision，不產生新 history entry。no-op、驗證失敗、DOM/projector throw、cancel、stale 與忙碌時不增加 entry、不移動 stack cursor；失敗後 canonical、revision、DOM 與互動投影回到原狀。新成功操作在 undo 後清 redo。歷史條目按提交單位，不按 pointer update、文字每個 keypress 或 Moveable preview 累積。
4. 對目前 deck 大小明示有限記憶體：最多 20 筆，保留快照估算總量上限 64 MiB；超出時先逐筆淘汰最舊 entry，單筆仍超限時不保留該操作歷史並讓 UI truthful 顯示。成本只在 commit 冷路徑產生；不得在 pointer update 讀取圖片 payload 或 stringify 整份 DeckSpec。可用共享不可變參照降低實際成本，但不可犧牲 rollback 正確性。這是暫存歷史上限，不改原20 MiB export gate。
5. Portable toolbar 提供可辨識且 disabled 狀態正確的「復原／重做」；Ctrl/Meta+Z、Ctrl/Meta+Shift+Z 可操作。IME 組字、input/textarea/contenteditable、Dialog 焦點、Alt、gesture、picker/optimizer busy、slide target stale 時保留原生或阻止 replay，不攔截未處理的快捷鍵。非編輯模式不應意外變更 DeckSpec。
6. Undo／Redo 後需清理或重建 selection／Moveable、selected image/text controls、crop projection、文字與 geometry DOM，使瀏覽器與 canonical 一致；舊 UI 狀態不可對新 canonical 提交。export/離線重開只保存目前 canonical，沒有可攜 history 或 editor chrome。群組／鎖定、單元件幾何與直接文字的回復是必驗路徑；既有 Crop F2 OPEN/P2 不在本卡順手修。

## 執行階段與驗收

同一主卡內部順序：A. 純 history contract＋Node exact operation/no-op/barrier/redo 分岔；B. portable 原有 mutation/revision/projection 接線與 UI/鍵盤；C. 正式受管 browser／affected PGQ／ZIP／獨立 Review。A→B→C 是 blocking edges，並非另開產品 Slice。A／B 每段先保留 meaningful RED，再做最小修補與具名回歸；每兩段 checkpoint 一次。

Focused 應涵 `edit-text`、move/resize/group/lock、同筆 revision、no-op/throw、redo invalidation、false descriptor 和 direct writer barrier、超限 truthful degrade、large-image deck 的 pointer update 零 payload read／零 whole-spec serialization。Browser 1280×720／1600×900 用真按鈕/鍵盤、群組與文字、匯出／離線重開、console/page/network/HTTP/remote errors 與 targetClosed；IME 使用 synthetic lifecycle 應明示，非原生 OS IME。Affected PGQ 四檔串行驗證。Mainline 執行完整 non-browser、distribution ZIP lifecycle/source-byte-match、source/protected 凍結與受管 cleanup；原 Reviewer 唯讀獨立驗收。歷史失敗保留，不把 committed evidence 說成 Reviewer fresh。

## 分工與停損

厚度 strict/core-bounded、規格已固定。規則首選 GPT-5.5 high；此 native subagent catalog 無 GPT-5.5/Terra/Luna，實際 Writer 採 clean `fork_context=false`、繼承 Astra／medium，明列成本路由差異。單一 shared Worker 寫 delivery 與本卡測試／browser harness；Mainline 同期只寫 task/control/evidence，做裁決、完整驗證與 review handoff。不可安裝新 vendor、不改 AI Core、不改 Core2 candidate、protected 四檔、schema 或舊 Slice；Worker 不啟 browser/build ZIP、不 commit／merge／push／deploy。

Worker 可改 `runtime/deck-editor.js` 及必要的單一純 history helper、新 focused tests／mounted fixture／既有 browser harness 的本卡 flag。若需改 `component-interaction.js` 或其他 runtime，先以現有 interface 無法滿足的具體測試證據回主線裁決。缺生效的 rollback/projection 路徑、無法保證 false-operation barrier、重複兩次同類失敗或必須放寬記憶體界限時停止，不宣稱 GO。Mainline 停在獨立 review candidate；本卡未獲正式 browser、PGQ、Independent GO 前維持 2/6，不開第4張。

## Mainline 對 A→B 停點的裁決

同一 Worker 已完成 A 段 Node history 初版，focused 3/3、受影響 scoped 43/43；尚未提交。B 段前以故障注入量到既有 portable `move`（slide reorder）在 `insertBefore` 先生效後拋錯時，canonical、DOM 順序和 revision 已變而操作失敗。這是 history barrier／rollback 所需的實測缺口，不是 Undo UI 的測試假設。Mainline 授權在本卡同一 Writer 及既准許的 `runtime/deck-editor.js` 範圍內，先讓 reorder 對 after-effect throw 原子回退；同時盤點 duplicate、remove、component direct patch 與 export cleanup 的直接寫入，對同類可重現缺口做最小修復／測試，然後才接 portable history。不得藉此改 Core2 或其他舊功能語意、擴展到未量測 writer；若安全 barrier 無法覆蓋，停止回主線裁決。這是同一 Core3 實作接續，不是新的 Repair generation。
