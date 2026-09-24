# Core3 交易邊界 Zoom-out：呼叫圖與修復契約

Status: `RESEARCH_ONLY / PRODUCT_NO_GO`
固定產品 SHA：`4a405cfcb397a2223dcd010cf048a1e5e058418f`
範圍：只分析 portable editor 的同步寫入與 gesture 收尾；本文件不授權下一輪產品修復。

## 模組與資料流

| 層 | 目前職責 | 跨層接點 |
| --- | --- | --- |
| UI／公開 API | click、文字 blur、`window.PPTSKILLEditor`、Moveable 事件 | `move`／`duplicate`／`remove`／`applyPatch`／`executeOperation`／`replayHistory`／`interaction.finish` |
| 操作協調 | `runtime/deck-editor.js` 的 portable closure | validation、DeckSpec mutation、revision、`editor-history`、DOM/control/status projection |
| 手勢控制 | `runtime/component-interaction.js` | preview 是暫態 DOM；release 經 `executeOperation` 寫入 canonical geometry |
| Authority | DeckSpec + 既有 operation executor | history 記錄前後 canonical；DOM 是投影，不是第二份真值 |

可重現的故障不是三個獨立 setter bug。`move()` 在 `syncText()`、DOM reorder、canonical swap、history clear 之間沒有共同 owner；`interaction.finish()` 在預覽復原、operation、控制列刷新之間暫時解除 `finishing`。任一同步 DOM setter／method 都能呼叫公開 Undo 或 edit-text。內層先回報成功，外層回退再抹掉它，或使 canonical 與 DOM 順序分裂。連續兩次 projector fault 則留下 preview style，即使 canonical／history 已回退。固定重播見 `review-round-05-repro.mjs`／`review-round-05-repro.json`。

## 裁決：一個同步寫入 owner，兩條不同的內部路徑

在 `deck-editor` 既有 mutation authority 加 **closure-local 同步 transaction owner**。公開寫入入口先檢查 owner，**早於 request getter、DOM 變更及任何通知**；交易從第一個可重入副作用前開始，直到提交或經驗證的回退完成才釋放。覆蓋 `executeOperation`、`replayHistory`、`applyPatch`、reorder、slide duplicate/delete，以及可改變本次 target 的 slide selection／mode transition。async file optimizer 不持有跨 `await` 的同步 owner；其完成時進入既有 operation 入口並重新驗 target。`interaction.begin` 在 finish 期間仍拒絕新 gesture，不能靠暫時解除 `finishing` 讓控制列更新。

**不可用 ambient `allowNested=true`。** `syncText()` 在 reorder 中會合法呼叫 edit-text；`paste-style` 在 operation executor 中會轉成 set-typography。這兩種內部延伸只可由 closure-private 函式／明確 token 進入既有 executor，token 不進公開 API，也不在呼叫外部 DOM setter 時保持可借用的全域通行權。外部同步回呼呼叫任何 public mutation 都必須被拒絕；`copy-style` 等非寫入也不得在交易中意外改 `styleClipboard` 或控制投影。Node editor 與 portable editor 分開核對，不能只修一邊的同名函式。

`move()` 必須在交易開始時固定 slide identity，並把 pending text sync、DOM sibling reorder、canonical swap、revision/history/control/status 視為一個成功／失敗單位。內部文字同步可以產生中間 state，但對外不得報獨立成功；外層失敗須回到交易前的 spec、DOM sibling order、文字、revision、history、selection 與 controls。`historyDomChanged()` 現在未比較同 parent 的 sibling order，且 `restoreHistoryDom()` 會吞下節點回退錯誤；reorder 應保留專用順序驗證，通用 rollback 也要回報驗證失敗。

Gesture 的 owner 至少涵蓋 `beforeFinish`、`notify`、preview restore、canonical operation、history／controls 和失敗收尾。`finishing` 只能代表真實手勢收尾，不能兼作公開 mutation owner；Core2 group operation 檢查的是 `gesturing`，不能把 `finishing` 假裝為 `gesturing`。2026-09-24 實作前精化：終態 controls 以 private rendering 參數呈現，但真實 owner／finishing 仍保持；全部可拋錯 UI 必須留在 rollback 範圍，交易釋放後只 return。原先「釋放後刷新」建議撤回，以免重新造成已提交卻向外報失敗的 Repair1 P1。

## 投影故障的獨立回退契約

交易 guard 只能排除重入，不能修復 preview DOM。Gesture 在首次 preview **之前**記錄當前 target／group members／geometryTarget 的身份與原始 style／geometry marker；失敗先嘗試 canonical projector，再用原始 attribute checkpoint 作 bounded fallback。不得以第二次相同 projector 呼叫作唯一保障。回退後逐節點核對 identity、style／marker、canonical geometry、revision、history 和選取／控制投影；任何一項無法還原時，明確回報 `rollback failed`，阻止後續 mutation／gesture，等待 remount。不能讓 `finish()` 把最終回退錯誤包成普通取消後繼續編輯。

## 最小實作順序與驗收

1. 先加固定 RED：reorder 的 `insertBefore`／status 中 nested Undo、nested edit-text、selection 切換；gesture 的控制 setter／status／style setter 中 nested Undo、nested edit-text、新 gesture。每項驗「內層不得成功、外層成功或完整回退」，而非只驗例外文字。
2. 加同步 owner 與 closure-private internal executor；移除 gesture 收尾中的 `finishing=false` 窗口。補 `paste-style`、reorder text sync、Core2 group drag、普通 undo/redo 的相容性測試。
3. 加 preview 前 checkpoint、一次／兩次投影 fault、fallback 仍失敗的 fail-closed 測試。逐項核對 spec、DOM、revision、history、selection、controls；不得把回退錯誤吞掉。
4. RED→GREEN 後跑 Core2/Core3 scoped、全量 non-browser、ZIP lifecycle／byte match、雙盲 review。新產品 SHA 得到 code GO、且 AI Core scanner 有適用 host receipt 後，才開新一輪受管 browser／PGQ。Host04 `ENOENT` 屬平行 AI Core observer 線，不應作為產品改碼理由。

不引入新 history、scene graph、writer 或 async transaction manager。若 private path 仍需公開回呼持有通行權，或 rollback 無法可靠驗證，應停回架構裁決，不再加局部 setter guard。
