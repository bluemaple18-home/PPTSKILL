# Core5 視覺驗收 stop-3 裁決（2026-10-01）

狀態：`FUNCTIONAL_PASS / VISUAL_NO_GO_STOP3 / CORE_PROGRESS_4_OF_6`。本輪沒有修改產品 runtime、fixture 成品、ZIP 或 protected 檔案；沒有 push、deploy 或開 Core6。正式 host 沿既有 AI Core 受管 Chrome controller 執行，三輪原始收據為 `host-acceptance-04/`、`05/`、`06/`。

| 輪次 | 正式結果 | 實圖裁決 |
| --- | --- | --- |
| 04 | controller PASS；雙 viewport 各 8/8；四支 PGQ 16/16；cleanup、identity PASS | 初始／Reset 截圖在動效尚未穩定時取得；原 fixture 的 96px 標題與左上引用重疊，不能視為 visual PASS。 |
| 05 | controller PASS；雙 viewport 各 8/8，四個截圖階段的可見性與文字互不相交 gate PASS；四支 PGQ 16/16；cleanup、identity PASS | fixture 已將標題降到 72px、引用移到右側，截圖穩定且互不相交；引用文字仍超出自身卡片底部。1280×720：文字底 510.2px、卡片底 488px；1600×900：638.5px、610px。可重播 RED 指令見本輪 task history。 |
| 06 | browser 在初始 visual gate fail，兩 viewport 0 項；PGQ 未跑；Browser.close exit 0，root／marker／process 清理與 identity PASS | fixture 高度從 280 增至 380，預期底部餘量 57.8／71.5px，但新 gate 同時要求文字四邊比元素框內縮 2px。05 的量測顯示原 variant 行框左邊與元素左邊齊平（1280：664px、1600：830px），行框頂部也可高於元素 top 8px；這會讓新 gate 誤報，與 06 的失敗吻合。06 的 browser `acceptance.json` 僅記錄斷言，未記錄失敗量測，不能把預期餘量當成 06 的實測。 |

`04`／`05` 的功能與流程證據可保留，但不抵消 visual NO-GO；`06` 是驗收 gate 缺陷，不證明產品新故障。產品 `runtime/deck-editor.js` SHA-256 `140814f405c1fbacfef9c78c1269425e0b34029d807b7ac43041ba4cb37a992c`、ZIP SHA-256 `33aee060d6197492b384b370b2075da65e05d47840559706432aa747be4a6265` 未變。三輪 controller 的前後身分一致，owned root／isolation marker 均不存在，PGID/root process matches 為空。

同一視覺驗收線第三次未達標，依 AGENTS.md 與 browser 驗收規則停手，不自動開第 07 輪。下次裁決先區分 `quote-monument` 原 variant（文字可與元素左邊齊平，僅要求 viewport 可見且不碰其他文字）與 `evidence-axis` 卡片 variant（需檢查引用文字落在卡片背景內）。修 gate 後先用既有 05 量測建立可證偽負控制，再決定是否重跑正式 host；不得以 04／05 的 controller PASS 宣告 5/6。
