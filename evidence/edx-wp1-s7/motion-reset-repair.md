# S7 motion reset 窄修復 receipt

狀態：SOURCE FIXED／BROWSER ACCEPTANCE BLOCKED；不是 review candidate。主線直接完成 minimal 單一 runtime 檔修復；原 Worker frozen，未加 agent。未啟動或重跑 browser。

## 實作

runtime/motion-primitives.js 僅拆出 reduced/static transform reset。所有節點及 ::before/::after 繼續停動畫、停 transition、opacity1、clip-path none；transform:none!important 只排除 [data-pptskill-editor-chrome]、.moveable-control-box 及各自子孫。使用 :where 保持排除條件零 specificity，不增加另一套 geometry authority。簡報內容及其 pseudo-element 繼續 reset；normal mode 不變。

CodeGraph buildMotionCss 查詢與既有失敗證據先於修改。原因鏈為slide內vendor control被全體motion reset命中，不用updateRect或修改pointer方向掩蓋。

## 驗證

- node --test tests/edx-wp1-s7-motion-reset.test.mjs：RED 2 pass/2 fail，失敗原因為全體reset仍含transform；GREEN 4/4。logs motion-reset-red.log、motion-reset-green.log。
- node --test $(rg --files tests -g '*.test.mjs' | rg -v '/pgq-wp4-')：337/337 PASS，0 skipped；motion-reset-nonbrowser.log。
- esbuild transform(buildMotionCss(), {loader:'css',target:'chrome120'})：PASS、warnings0。
- git diff --check PASS。motion-reset-hashes.json記錄當前source及四個protected untracked，後者完全一致。

新測試是CSS輸出selector/declaration契約，不是computed-style、selector engine或真pointer測試。337不含PGQ-WP4；不宣稱fresh browser修復成功。

## 下一驗收範圍與限制

browser原blocker累計兩次停止門檻不重置；兩個受管session亦曾scan-limit停損，cleanup已在mainline-checkpoint-cleanup.json，沒有活browser。

待明示覆核停止門檻後，先targeted：reduced/static各驗SE handle位於canonical右下角、真pointer resize可提交、chrome transform不被reset，內容及underline ::after仍為静態終態。此後才跑S7完整兩viewport與三treatment、export/reopen。若再遇scan-limit，保留停止，不放寬資源閘門。

因修改motion seam，PGQ28unique只能保留historical inherited；新候選需fresh affected content-integrity與required-visibility驗證，不能聲稱免測。ZIP尚未重建；全部工作樹修改未commit，未merge/push/deploy。
