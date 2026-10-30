# EDX-WP2-S3 — Bounded copy/paste font size

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Branch: `codex/edx-wp2-s3-copy-font-size`
Base: `ed5b34ef357bf158dd1fbd379fda9156f23a1155`
Depends on: WP2-S2 COMPLETE / Independent GO / merged main。
traces_to: `BACKLOG.md §10.1 Decision 2`、`§10.3 EDX-WP2`、`§10.4 Unified Operation Registry`、`§10.8 product simplicity`。

## Objective / measured gap / prior art

WP2-S2 只能逐一輸入 title/subtitle 字級，缺少 BACKLOG 明列 Copy/Paste Style 的最小路徑。沿既有 operation registry + role typography + contextual toolbar，複製 canonical explicit fontSize，再貼至另一 role target。`research/editor-prior-art.md` donor style copy 為語意參考；不吸收 DOM computed style/任意 CSS truth。CUSTOM_DELTA、無新 dependency、無取代。
Why not less：只重複輸入不能重用既有設定。Why not more：本輪只有 S2 已批准 fontSize；不新增欄位、schema、renderer、system clipboard、keyboard shortcuts、history、跨 deck clipboard、keyPoint/component style。

## Fixed contract

1. 新 registry operations `copy-style` / `paste-style`（本 slice 僅 fontSize）；exact envelope `{operation,target:{slideId,elementId},value:{}}`，roles 只 role-title/role-subtitle。拒 foreign/missing/empty subtitle、extra fields、prototype/inherited/getter payload；Node/portable 使用同一 validation helper。
2. Copy 只讀 `composition.typographyOverrides[elementId].fontSize` explicit integer16..160。沒有 explicit override 就 fail loud，不讀 computed style、不默認 null/reset，不清掉原剪貼內容。有效 copy snapshot 恰 `{fontSize}`，存 editor closure session-local；不可是 spec 物件引用。
3. Paste 必須已有 snapshot；有效 paste 經同一 `set-typography` mutation/projector，preserve content/style/geometry/motion/background/otherSlides；no-op 不增 semantic revision。Invalid copy/paste 都不改 canonical／clipboard；copy 不增 canonical revision。
4. copy-style descriptor mutates ephemeral editor clipboard、preserves canonical spec、qaInvalidation=[]、undoable=false；paste-style descriptor 使用 S2 mutates/QA範圍。維持 executeOperation 返回既有 spec 契約，不新增持久化 clipboard schema 或第二 writer。
5. Clipboard 跨 slide/mode 保留同一 session，source 後續修改/reset/刪除不改 snapshot；新 editor 或 offline reopen 為空。Export 不清 live clipboard、也不把 snapshot 或 transient UI 值帶入 export。
6. 既有 typography contextual toolbar 加「複製字級／貼上字級」；copy 無 explicit override disabled，paste 尚無 snapshot disabled；target 切換、套用／reset 後狀態即時更新。標示功能限字級，不誤宣稱完整樣式。
7. 只在 text edit 的合法 target 操作，slide/mode switch 清 target，避免 wrong-slide mutation。IME pending 時 copy/paste（UI與API）拒絕、不提交 partial；合法 UI 動作先沿 WP2-S1 sync 完整文字，copy/paste 不吞字。
8. 不改 S2 font-size/reset authority 與 CSS specificity 修復。包含 title→subtitle、跨頁、重複貼上、source變更後snapshot、default source拒絕、export/reopen 空clipboard的端到端驗證。

## Ownership / route

Worker single-writer：runtime/deck-editor.js、必要 role-typography helper；bounded tests、mounted stub、browser case/runner flag、既有 exact registry snapshots；不修改 BACKLOG/tasks/handoff/evidence/dist/protected。不得 commit/merge/push/deploy、不得啟 browser。Mainline control、source freeze、ZIP build/lifecycle、host。Standard bounded；runtime無Luna/Terra override，單一 inherited native agent、fork_context=false，不fan-out、不新task。

## Acceptance / stop

Meaningful RED→GREEN；Node/portable parity、invalid atomic、snapshot/no-op、IME/stale target、export round-trip。Focused/full non-browser PASS、ZIP lifecycle/source/protected hashes、git diff --check。新 `--style-copy-regression` attach-only；雙viewport真 UI 完整覆蓋固定契約，errors0、targetClosed；四支 affected PGQ 串行與managed cleanup。缺 host 就 checkpoint，不偽稱 review candidate。
同類兩次無進展回主線。完成停 Independent Review candidate，未 merge/push/deploy、不開下一 Slice。

## Mainline checkpoint

產品與 full non-browser441/441、ZIP lifecycle 已完成；正式browser目前 BLOCKED_DELETE_VISIBILITY，未達review candidate。詳 evidence/edx-wp2-s3/mainline-checkpoint.md。

## Focus repair 完成

最新狀態 READY_FOR_INDEPENDENT_REVIEW；產品c43e480，targeted10/10、full442/442、ZIP、雙viewport各14checks、PGQ單輪16/16、cleanup全PASS。歷史browser blocker已由本輪focus ownership修復與實測解除；Independent GO仍pending。

最新裁決：Independent Review GO，P0–P3全0，WP2-S3正式結案。見 `evidence/edx-wp2-s3/independent-review.md`。歷史pending/stop紀錄保留作時間序列；未merge/push/deploy，未開下一Slice。
