# Core3 Undo／Redo 交易邊界重規劃 — Owner 裁決卡

Status: `NON_BROWSER_GREEN / TARGETED_RE_REVIEW_PENDING / HOST_OBSERVER_BLOCKED`
Historical product／ZIP candidate: `4a405cfcb397a2223dcd010cf048a1e5e058418f`（NO-GO，不得整合）

2026-09-24 續接：新 code checkpoint `e6f9afab11d74e95042f7abe3157daa6c2d4f92d` 已取得 Writer 1044/1044 full non-browser、98/98 scoped；ZIP 已由主線重新 build/lifecycle/75-source byte match。原 `4a405cf` 與中間 `a0fd3e7`（Mainline full 23 FAIL）歷史保留；本次尚無獨立 GO，禁止整合。固定程式／ZIP 交付與後續 verdict 見 `evidence/edx-core-3-undo-redo/transaction-boundary-mainline-checkpoint.md`。

最新續接：code `8ad5d6f` 已修 round-06 兩項 P1；1056/1056 non-browser、更新 ZIP lifecycle 通過，獨立 re-review pending。以上 e6f9afa 為歷史階段，詳見最新 Mainline checkpoint。

## 為什麼需要重新裁決

Repair 3 已經得到兩名獨立 NO-GO，主線亦重播。具體反例在 `evidence/edx-core-3-undo-redo/review-round-05.md`／`review-round-05-repro.mjs`：reorder 期間 Undo 使 canonical/DOM 分裂；reorder 或 gesture 收尾中的內層 operation 可先回報成功、再被外層 rollback 抹掉；連續投影回退故障可留下 preview DOM。這已不是單一 setter 補丁能證明關閉的邊界。

## 已完成的唯讀研究

Mainline 已完成唯讀呼叫鏈與方案分析，見 `evidence/edx-core-3-undo-redo/transaction-boundary-research.md`。結論是：要同時阻止 reorder／gesture 收尾中的 Undo 和其他 public operation 重入，保留 `syncText` 與 `paste-style` 必要內部呼叫，並驗證雙次投影故障的 DOM rollback。研究沒有修改產品 runtime／ZIP；尚未用程式證明設計方案可行。

設計不得新增第二套 history、DOM authority、scene graph、runner 或放寬 fail-closed；DeckSpec 仍是 canonical，operation 是唯一 mutation path，DOM 是 projection。同步重入須在整個 reorder/gesture 提交與回退期間有一致的拒絕契約，且不能拒絕其自身必需的內部操作。Rollback 必須驗證 canonical／DOM／revision／history 一致；無法還原時明確報錯，不得宣稱成功。

## 可選裁決

- `AUTHORIZE_BOUNDARY_IMPLEMENTATION`（推薦）：以本卡與研究結果另授權一次明確的產品交易邊界實作；屬 critical／架構岔，先由 Mainline/Sol-high 固定契約，再以單一 Writer 做 strict bounded code，兩名盲 Reviewer 以固定 SHA 獨立審查。範圍限 `deck-editor`／`component-interaction` 的入口排他與 rollback projection，以及必要的 focused tests／ZIP；若必須新增第二套 authority 或跨其他 runtime，停回 Owner。
- `DEFER_CORE3`：保留 NO-GO candidate 與證據，主線維持 Core2 2/6，不開 Core4、不整合。

無論選哪條，AI Core Host04 scanner 的 ENOENT／`IO_ERROR_OBSERVED` 仍需其 owner 獨立處理。產品沒有新 code GO、observer 沒有適用 host receipt 前，不重跑受管 PGQ／browser；未 merge／push／deploy。

Owner decision: `AUTHORIZE_BOUNDARY_IMPLEMENTATION`。2026-09-24 Owner 在 zoom-out 結論後要求「你繼續做嗎？」；Mainline 承接為繼續此唯一明確修復範圍。保留原 Repair 3／NO-GO 歷史，不重置為新功能鏈；本次只實作研究中已固定的交易邊界。

## 本輪實作卡

- 目標／範圍：依 `evidence/edx-core-3-undo-redo/transaction-boundary-zoom-out.md` 關閉 review-round-05 的兩個 P1 與雙重投影故障；可改 `runtime/deck-editor.js`、`runtime/component-interaction.js`、Core3 測試與必要的既有 mounted test helper；其餘 delivery 改動需有此邊界的直接證據。
- Writer／模型：native clean context（fork_context=false），shared sequential single writer。規格已固定的 strict repair；工具未提供 GPT-5.5 lane，本輪繼承主 task 可用模型。主線在 Writer 工作時只讀取與規劃驗收，不並行寫 repo。
- 介面／不變量：公开 mutation 在同步 owner 活躍時先拒絕，再讀 payload；內部 text sync／paste-style 仍用原 executor，不以 ambient allowNested 放行 callback。DeckSpec／revision／history／DOM／selection／controls 原子成功或可驗證回退；失敗回退無法完成時明確 fail-closed。finish 不暫時解除 finishing；正常 Core2 group drag 不退化。API／event selection/mode、export 的 text-sync 副作用、async adapter 的同步入口也須核對，不能只加在 Undo。
- 驗收／證據：先把 `review-round-05-repro.mjs` 轉為期待正確行為的 regression，保存 RED；補 direct operation／patch／selection／mode／gesture reentry、paste-style／syncText 正常路徑、單／雙投影故障與 fallback 失敗；跑 `node --test --test-concurrency=1 tests/edx-core-2-group-lock.test.mjs tests/edx-core-3-undo-redo.test.mjs` 及必要的新測試。再由主線 full non-browser、ZIP lifecycle、source/protected hashes、固定 SHA 雙盲 review。證據存 `evidence/edx-core-3-undo-redo/transaction-boundary-*`。
- 禁區／停損：不改 AI Core、不啟 Chrome、不重跑 PGQ、不改歷史 evidence、不新增第二套 state authority/history/scene graph、不 merge/push/deploy。不擴 Core4。若需要擴架構或兩次同類修正無進展，帶最小重播交回 Mainline；不要宣稱 review GO。產品可用 git revert 回退本輪 commit，不動四個 protected untracked。
