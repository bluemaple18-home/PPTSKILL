# Core5 host-acceptance-07 主線收據（2026-10-01）

狀態：`HOST_PASS / FUNCTIONAL_PASS / VISUAL_PASS / INDEPENDENT_REVIEW_PENDING / CORE_PROGRESS_4_OF_6`。Owner 在視覺 stop-3 裁決後明示「繼續吧」，本輪只修 browser visual gate；產品 runtime、ZIP、protected 與 AI Core 均未修改。未 push、deploy 或開 Core6。

## 本輪修正與負控制

- 修正 `tools/edx-core-5-reset-recompose-browser-acceptance.mjs`：截圖前固定既有動效；四個階段都核對實際 DOM variant、三段文字的可見性／viewport／互不相交；僅 `evidence-axis` 重組卡片檢查引用文字在卡片框內。失敗時先記錄量測再斷言。`quote-monument` 不套用卡片內縮規則。
- 第 05 輪原始量測作負控制：舊卡片底部 1280×720 為 488px、文字底部 502.5px；1600×900 為 610px、文字底部 628.2px，兩者都必須 RED。本輪卡片高度 380，實測重組文字底部 502.5／628.2px，卡片底部 568／710px，底部餘量約 65／82px。
- Node syntax、`git diff --check` 通過；沒有新增套件或產品路徑。

## 正式 host 原始證據

- 入口：`CORE5_HOST_OUTPUT=host-acceptance-07 <ai-core>/.venv/bin/python -B evidence/edx-core-5-reset-recompose/host-controller-core5.py --run-core5-acceptance`；原始 controller、client、browser receipt 與 lifecycle log 均在本目錄。
- controller `PASS`，supervisor exit 0；雙 viewport 1280×720、1600×900 各 8/8 browser checks，四個截圖階段各有量測；每輪 target 關閉、草稿 key 清除。
- 四支 PGQ TAP：1/1、7/7、7/7、1/1，合計 **16/16 PASS**，0 fail／skip／cancel；Browser.close exit 0。
- browser console、pageerror、network failure、HTTP error、remote request 均為空。10 份截圖／匯出檔的大小與 SHA-256 已逐份對原始 `browser/acceptance.json` 重算相符。
- controller 前後十檔身分一致；owned root、isolation marker 均不存在，PGID/root process matches 為空。產品 `runtime/deck-editor.js` SHA-256 `140814f405c1fbacfef9c78c1269425e0b34029d807b7ac43041ba4cb37a992c`；ZIP SHA-256 `33aee060d6197492b384b370b2075da65e05d47840559706432aa747be4a6265`，均與停損前相同。
- 1280×720 與 1600×900 的 initial、recomposed、reset、offline-reopen 八張實圖已逐張核對：標題、副標、引用可讀；重組卡片文字完整位於卡片內；未見前輪的動效截半、文字相交或卡片溢出。實圖路徑見 `browser/acceptance.json` 的 `artifacts`。

## 裁決與限制

本輪 host applicability、功能與固定 fixture 的視覺驗收均 PASS，未發現主線核對阻塞。此 visual gate 限於兩個既定 viewport、固定 fixture 的 DOM 行框／CSS 可見性與實圖核對，不能宣稱通用 OCR 或任意字體組合無碰撞。主卡明定須有**獨立 code／host／實圖 review** 才能更新到 5/6；本收據供 Reviewer 以本輪 harness diff、原始 TAP、controller/client/browser receipt、八張實圖與第 05 輪負控制獨立裁決。在該 verdict 前，Core5 保持 4/6。
