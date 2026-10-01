# Core5 chart patch 修復接續收據（2026-10-01）

狀態：`CORE5_ACCEPTED / FUNCTIONAL_PASS / VISUAL_PASS / INDEPENDENT_CODE_HOST_GO / CORE_PROGRESS_5_OF_6 / NOT_MERGED`。第 07 輪既有功能與視覺證據保留；新 P1 由第 11 輪 focused host 補齊。

## 修復與測試

- P1：公開 `applyLocalPatch()` 更新 evidence-axis chart 最後值後，canonical 與 chart DOM 是 77，live type visual 仍是 92；fresh renderer 是 77。
- 在既有 component patch 交易內，`replaceComponent()` 後比較舊／新 type visual token；變動時呼叫既有 `projectTypeVisual()`，故失敗會走同一 canonical／DOM／revision／history rollback。
- 新增公開 API 成功案例及 `data-word` 設定後拋錯的原子回退案例。修復前兩例均 RED（舊值 92；故障未觸發），修復後兩例 PASS。
- Core5 focused **24/24 PASS**；Core2 group lock、Core3 transaction、Core5 合併 **82/82 PASS**；Node syntax 與 `git diff --check` PASS。
- 新產品 runtime SHA-256：`9f18d76476e5063fb42f4c5028d2ff7a95b828db5b870cb9546464d43adefac1`；重建 fixture：`79848b7a033d269074821806e1669103c7e4799f8d181bcd8a4621fa6875f3a9`；ZIP：`fd9bef51984504e46dedf30f1a2c3af5ca6dea6b9bf8f74ebc12d647ae4a4a3a`。ZIP 內 runtime SHA 與工作樹一致。

## 正式 host 停損

三次受管 Chrome 驗收原始收據：`host-acceptance-08`、`09`、`10`。三次均為 `NOT_PASS`，且在新 chart patch 案例前被驗收 harness 擋住：08 是新增第三頁後仍寫死兩頁斷言；09 是重新開啟後 `next` 控制不可見；10 是以 focus 選頁後 `data-editor-selected` 仍為 false。兩個 viewport 的舊流程各已完成 8 項檢查，但新路徑未執行，不能宣稱 chart patch 的 browser／export-reopen PASS。三次 controller 均記錄 owned root、marker 不存在，PGID/root 無殘留程序，前後產品身分一致。

當時依同一 blocker 第三次失敗停損，沒有沿原 harness 進行第 11 次重試；未驗證的改動已撤回。後續重新查明正式頁面選頁契約，另立 focused 驗收模式如下。該停損時點未推送、部署或開 Core6。

## 選頁契約、focused host 與獨立複審

- 編輯器 `currentId` 開頁時取 DeckSpec 第一頁，`select(currentId)` 將該頁標記為 `data-editor-selected=true`；公開 `applyLocalPatch()` 要求 patch `slideId` 與 `currentId` 一致。原先嘗試的 `next` 不屬正式頁面可見的選頁控制，synthetic focus 也未選中 evidence。新 focused 模式讓 evidence 成為唯一首頁，實測先核對選中狀態與 92 初值，再呼叫公開 API。
- 執行入口：`CORE5_CHART_ONLY=1 CORE5_HOST_OUTPUT=host-acceptance-11 <ai-core>/.venv/bin/python -B evidence/edx-core-5-reset-recompose/host-controller-core5.py --run-core5-acceptance`。只修改 browser 驗收腳本的 fixture／選頁及 chart 專項分支；原第 07 輪預設流程保留。產品 runtime、fixture、ZIP 的 SHA 與本收據上列候選相同；新 harness SHA-256 為 `dc2900be04da0f75db55c0840e3260544c94fda4d98b3d484307d878596c4645`。
- 1280×720、1600×900 各 **3/3 PASS**：正式首頁 evidence-axis 的 canonical／chart／type visual 均為 92；公開 patch 後 canonical／chart DOM／live token／fresh renderer 均為 77；匯出 HTML 離線重開仍為 77。兩輪 target 與本輪草稿 key 均已清除，console、pageerror、network failure、HTTP error、remote request 均為 0。兩份 export artifact 的大小及 SHA-256 與原始 browser receipt 相符。
- controller `PASS`、supervisor exit 0；client `PASS`、browser／四支 PGQ／Browser.close 均 exit 0。四支 PGQ 合計 **16/16 PASS**。owned root 與 isolation marker 不存在，PGID/root 無殘留匹配；前後十檔身分一致。這是沿用既有 controller 的收尾，不是重跑第 04–06 輪視覺驗收。
- clean-context 獨立 reviewer 唯讀核對 code、回退測試、正式 browser/source/export 原始檔、controller/client/lifecycle、ZIP 內 runtime 與工作樹 hash，裁決 **GO，無阻塞 finding**；其限制為未親自執行 Chrome 或 Node 測試。主線已實際跑 Core5 24/24 與相關合併 82/82，正式 host 原始 evidence 見 `host-acceptance-11/`。

裁決：Core5 功能與視覺驗收均 GO，整體進度 **5/6**。commit／push 狀態以 Git 為準；此驗收不包含 merge、deploy 或 Core6 產品開發。
