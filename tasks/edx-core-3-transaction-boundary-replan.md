# Core3 Undo／Redo 交易邊界重規劃 — Owner 裁決卡

Status: `PROPOSED / NOT_AUTHORIZED`
Current product／ZIP candidate: `4a405cfcb397a2223dcd010cf048a1e5e058418f`（NO-GO，不得整合）

## 為什麼需要重新裁決

Repair 3 已經得到兩名獨立 NO-GO，主線亦重播。具體反例在 `evidence/edx-core-3-undo-redo/review-round-05.md`／`review-round-05-repro.mjs`：reorder 期間 Undo 使 canonical/DOM 分裂；reorder 或 gesture 收尾中的內層 operation 可先回報成功、再被外層 rollback 抹掉；連續投影回退故障可留下 preview DOM。這已不是單一 setter 補丁能證明關閉的邊界。

## 推薦裁決：先研究交易 authority，再決定是否開產品修復

允許 Mainline 做一張 **research-only** 設計驗證：畫出 reorder、syncText、gesture finish、executeOperation、history replay、DOM projection/rollback 的完整同步呼叫路徑；用上面固定 fault probes 驗證一個最小交易邊界方案，明確回答「內層 operation 是否可進入、成功回報何時成立、投影二次失敗如何 fail loud」。研究可新增唯讀分析／測試 fixture 證據，**不改產品 runtime／ZIP**。若量到可收斂的最小方案，再另交 Owner 審核其實作範圍與成本；不得把本卡自動當 Repair 4 授權。

設計不得新增第二套 history、DOM authority、scene graph、runner 或放寬 fail-closed；DeckSpec 仍是 canonical，operation 是唯一 mutation path，DOM 是 projection。同步重入須在整個 reorder/gesture 提交與回退期間有一致的拒絕契約，且不能拒絕其自身必需的內部操作。Rollback 必須驗證 canonical／DOM／revision／history 一致；無法還原時明確報錯，不得宣稱成功。

## 可選裁決

- `AUTHORIZE_RESEARCH_ONLY`（推薦）：架構岔點用 Sol/high 作一次 bounded 設計驗證，交付呼叫圖、最小方案、反例矩陣及實作估算；Mainline 保留裁決，無產品寫入。
- `DEFER_CORE3`：保留 NO-GO candidate 與證據，主線維持 Core2 2/6，不開 Core4、不整合。

無論選哪條，AI Core Host04 scanner 的 ENOENT／`IO_ERROR_OBSERVED` 仍需其 owner 獨立處理。產品沒有新 code GO、observer 沒有適用 host receipt 前，不重跑受管 PGQ／browser；未 merge／push／deploy。

Owner decision: `PENDING`。
