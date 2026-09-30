# Core5 Reset 的交易與 history 缺口

Status: DESIGN_NOTE / NO_PRODUCT_CHANGE

`runtime/editor-history.js` 的 entry 只保存 before/after canonical spec；portable `projectHistoryState` 目前以既有元素 ID 更新文字與部分 geometry，未處理元件新增／移除、variant、typography 或整張 slide 節點重建。`restoreDraft` 已有從初始 slide DOM clone 投影草稿內容的受限路徑，但成功後清除 history，不能直接當作可 Undo 的 Reset。

另查得 `initialSpec`／`initialSlides` 目前僅在 `recoveryCandidate` 存在時捕捉；一般編輯頁沒有可供 Reset 使用的 edit-start 基準。若實作 Reset，須在開啟編輯時獨立固定 canonical 與目標 slide DOM 基準，並明確區分恢復草稿前後的 baseline 語義，不能假設草稿恢復專用快照必然存在。

因此 `reset-slide` 若允許把本次編輯期間的元件增刪恢復到 edit-start 基準，必須在同一交易內具備 before/after DOM 真實投影與可驗證 rollback，並讓 Undo／Redo 能從 canonical snapshot 重建對應結構；只把 spec 換回基準或只清 history 不符合本卡。若不能有界完成，須限縮 Reset 的支援範圍並向 Mainline 回報，不能宣稱 Core5 GO。Recompose 的同 primitive variant 子集與此缺口分開驗證，但仍屬同一主卡。

最小候選 seam：啟動時為現有 slide ID 固定 edit-start canonical 與 DOM template；Reset 只接受唯一、未被刪除的原始 ID，duplicate／無基準者 fail closed。確認後將指定 slide 投影成 baseline，並在既有單筆 history 中記 before/after；Undo／Redo 需要可在 detached 基準 clone 上重建任一 canonical slide 的受限 projector，否則不能宣稱結構性 Reset 支援。UI 應在確認前說明會清除此頁自開啟後的文字、元件和人工版面更動；取消或投影故障不更新 revision、history、draft／export。這是設計邊界，尚非產品實作。
