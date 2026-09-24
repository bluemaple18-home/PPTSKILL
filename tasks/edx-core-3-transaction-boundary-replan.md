# Core3 Undo／Redo 交易邊界重規劃 — Owner 裁決卡

Status: `RESEARCH_ONLY_COMPLETE / IMPLEMENTATION_NOT_AUTHORIZED`
Current product／ZIP candidate: `4a405cfcb397a2223dcd010cf048a1e5e058418f`（NO-GO，不得整合）

## 為什麼需要重新裁決

Repair 3 已經得到兩名獨立 NO-GO，主線亦重播。具體反例在 `evidence/edx-core-3-undo-redo/review-round-05.md`／`review-round-05-repro.mjs`：reorder 期間 Undo 使 canonical/DOM 分裂；reorder 或 gesture 收尾中的內層 operation 可先回報成功、再被外層 rollback 抹掉；連續投影回退故障可留下 preview DOM。這已不是單一 setter 補丁能證明關閉的邊界。

## 已完成的唯讀研究

Mainline 已完成唯讀呼叫鏈與方案分析，見 `evidence/edx-core-3-undo-redo/transaction-boundary-research.md`。結論是：要同時阻止 reorder／gesture 收尾中的 Undo 和其他 public operation 重入，保留 `syncText` 與 `paste-style` 必要內部呼叫，並驗證雙次投影故障的 DOM rollback。研究沒有修改產品 runtime／ZIP；尚未用程式證明設計方案可行。

設計不得新增第二套 history、DOM authority、scene graph、runner 或放寬 fail-closed；DeckSpec 仍是 canonical，operation 是唯一 mutation path，DOM 是 projection。同步重入須在整個 reorder/gesture 提交與回退期間有一致的拒絕契約，且不能拒絕其自身必需的內部操作。Rollback 必須驗證 canonical／DOM／revision／history 一致；無法還原時明確報錯，不得宣稱成功。

## 可選裁決

- `AUTHORIZE_BOUNDARY_IMPLEMENTATION`（推薦）：以本卡與研究結果另授權一次明確的產品交易邊界實作；屬 critical／架構岔，先由 Mainline/Sol-high 固定契約，再以單一 Writer 做 strict bounded code，兩名盲 Reviewer 以固定 SHA 獨立審查。範圍限 `deck-editor`／`component-interaction` 的入口排他與 rollback projection，以及必要的 focused tests／ZIP；若必須新增第二套 authority 或跨其他 runtime，停回 Owner。
- `DEFER_CORE3`：保留 NO-GO candidate 與證據，主線維持 Core2 2/6，不開 Core4、不整合。

無論選哪條，AI Core Host04 scanner 的 ENOENT／`IO_ERROR_OBSERVED` 仍需其 owner 獨立處理。產品沒有新 code GO、observer 沒有適用 host receipt 前，不重跑受管 PGQ／browser；未 merge／push／deploy。

Owner decision: `PENDING`。
