# EDX-WP2-S2 — Role font-size override

Status: REVIEW_CANDIDATE / INDEPENDENT_REVIEW_PENDING
Branch: `codex/edx-wp2-s2-role-font-size`
Base: `4a1c0bb0fddff372253eaa3e4ea5f33a3204ea1e`
Depends on: WP2-S1 COMPLETE / Independent GO / merged main。
traces_to: `BACKLOG.md §10.1 Decision 2`、`§10.3 EDX-WP2`、`§10.4 Unified Operation Registry`、`§10.8 product simplicity`。

## Objective / measured gap

WP2-S1 已提供 role text canonical commit，現有 renderer 僅有全域 StyleSpec 字型，無單一 title/subtitle 字級覆寫。沿既有 selection/edit-text/operation/renderer seam 完成「雙擊文字 → 字級覆寫或還原 → 另存重開」。

Prior art：`research/editor-prior-art.md` EDX-D02 要求 role-based StyleSpec + bounded overrides；donor inline style 不可升為 canonical truth。採既有 native number input + bounded projector，CUSTOM_DELTA；無 dependency。無取代既有 authority。
Why not less：DOM-only 無法 portable round-trip。Why not more：先驗證 title/subtitle 單欄位，keyPoint 多 renderer、family/weight/color/line-height、copy/paste style、富文字、history、AI bridge 均不吸收。

## Fixed contract

- 僅 role-title / role-subtitle；不得支援 component、keyPoint、任意 CSS／DOM selector。不得替無 subtitle 的 target 建立內容。
- Canonical optional `composition.typographyOverrides`，key 為 stable role element ID，value 恰 `{fontSize: integer}`；fontSize 16..160 inclusive（slide CSS px）。空 map canonicalize 為 absent；舊 DeckSpec 不變。
- Operation `set-typography`，exact envelope `{operation,target:{slideId,elementId},value:{fontSize}}`；fontSize=null 為刪除該 target override、回復 renderer/StyleSpec 預設。Schema strict，不 clamp、不接受 string/NaN/Infinity/fraction/extra key/prototype key/foreign target。
- Node 與 portable browser 共用驗證、descriptor、計算 authority。先驗證後 atomic commit；canonical no-op 不增 revision；preserve content/style/geometry/motion/background/otherSlides；QA invalidation typography/overflow/readability。不宣稱 history 已存在。
- Renderer 初次 render、live projector、export/reopen 必須一致；只改 font-size，不覆寫其他 inline style 或 motion；reset 不破壞原本 default style。
- 輕量 contextual 字級 number input + 套用／還原，只在 text edit mode 的 title/subtitle 顯示；target 綁定 stable identity。切 slide/mode 清掉 target，不可 wrong-slide mutation。
- IME composition 中禁 typography commit；toolbar 焦點移轉須保留待編輯 target，先完成既有合法文字 sync，不能吞字／提交 partial。Guard 或 invalid payload 不部分改 typography。
- Export 不留 toolbar/contenteditable/selection chrome；text edit 保留 typography、typography 保留內容。

## Scope / ownership

Worker single writer：產品 runtime、bounded tests、`tools/edx-wp2-s2-browser-cases.mjs` 與既有 browser runner flag、ZIP 打包必要清單。不得修改 BACKLOG/tasks/handoff、他人檔案、四個 protected untracked；不新增 vendor，不 commit/push/merge/deploy。Mainline 負責 control docs、evidence、ZIP build/lifecycle、host acceptance。
路由：跨 schema/operation/render contract 為 fixed core bounded；runtime 未提供 Luna/Terra/GPT-5.5 subagent override，使用單一 native inherited agent，fork_context=false，不 fan-out，不另開 task。

## Acceptance

- 有意義 RED→GREEN：invalid/atomic、reset/default、no-op、preservation、sanitizer/render/export round-trip、mounted UI/focus/IME/stale target。
- WP2-S1 與 affected EDX focused、完整 non-browser tests PASS；正常 ZIP build/lifecycle、source/protected hashes、git diff --check。
- 新 `--typography-regression` attach-only flag：雙 viewport 真 title/subtitle UI 改字級、reset、IME guard、export/offline reopen，errors0、target closed；四支 affected PGQ 串行、managed cleanup。
- 缺正式 host evidence 則只 checkpoint，不偽稱 review candidate。完成停在 Independent Review candidate，未 merge/push/deploy，不開下一 Slice。
- 同一 blocker 兩次無進展回主線；不自行擴欄位或改安全閘門。

## Mainline acceptance — 2026-09-22

Product `14555d0499e1f07ec8fabf3deb5e33db90d4d608`。Worker scoped 66/66；完整 non-browser 最終 431/431 PASS；最新 ZIP lifecycle PASS。雙 viewport typography 各 16 checks PASS；affected PGQ 串行單輪 16/16 PASS；errors0、targetClosed、cleanup PASS。

首輪 full 425/431 為 S3 snapshot/VM fixture，已 bounded 修正。Browser 前兩輪 FAIL 定位 toolbar CSS specificity，使按鈕 rect=0×0；產品補 edit-mode typography selector 後 PASS。歷史 FAIL 保留，非單輪全部成功。Source 13/13、protected 4/4、ZIP MATCH；IME 僅 synthetic CompositionEvent。

Receipt：`evidence/edx-wp2-s2/mainline-receipt.md`；handoff：`handoff_20260922_edx_wp2_s2_review.md`。未 merge／push／deploy，未開下一 Slice。
