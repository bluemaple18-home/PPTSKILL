# PPTSKILL 前期品質強化整合

**Integration ID:** PGQ-20260914  
**Date:** 2026-09-14  
**Read baseline:** `a3e4ff604df0f09f286d51a145db10e5c2da5406`  
**Product decisions:** OWNER APPROVED IN CONVERSATION（下表 01–16）  
**Implementation:** NOT STARTED / NOT VERIFIED  
**Scope:** 文件整合、去重、既有模組對照、後續驗收與依賴；不是產品實作收據。

本文件是 [working-spec.md](../../../working-spec.md) 的規劃補充；[BACKLOG.md](../../../BACKLOG.md) 仍是唯一 execution queue。不得把本文件變成第二份 backlog 或直接執行指令。P0-R11-R1 的 S3 真實已安裝 CLI replay 與 release closure 保持在前，不以本次文件變更重開 VQ2/VQ3/R7/R8/R9/R10，也不解除 release blocker。

## 1. 產品方向與證據分級

目標是每位員工透過自己的 AI 得到「內容正確、初版好看且有動畫，之後可以自己修改」的 portable HTML。能力增加不等於增加問卷、設定頁、服務或 Agent。

維持使用者路徑：素材 → 必要的 Grill Me → outline 確認 → Company Style＋三個 AI 封面 → 選款 → 可選樣張 → bounded full build → 驗收 → 編輯／另存。每頁仍保留一主題與 3～5 小標／重點；現有 `title / subtitle / keyPoints` 不在本次文件整合中改名或改 schema。

以下四種來源不可混稱：

| 類型 | 依據 | 可以宣稱的範圍 |
|---|---|---|
| Owner decision | 本次連續討論的 16 項確認，以及「不要重武裝、每個人能用」 | 產品目標已核准，不是功能已實作 |
| Existing implementation | 本文件第 3 節列出的 pinned-main 程式 | 該檔可確認的行為；不能從文件名稱推論完整能力 |
| Donor prior art | [文案指南](source/references/slide-copy-zh-tw.md)、[選圖詞彙](source/references/chart-vocabulary.yaml)、[圖表說明](source/docs/charts.md)、[動畫說明](source/docs/text-animation.md)、[背景效果說明](source/docs/vanta.md)、[editor](source/slide_editor/static/editor.html)、[server](source/slide_editor/server.py) | 對應規則與靜態實作；不是 PPTSKILL 已執行證據 |
| Integration design | 以下合併、欄位責任、派工順序與相容性處理 | 實作建議／待契約化，不可冒充 donor 原有自動 planner 或新的 Owner 裁決 |

Donor 的 [intake](intake-report.md)、[能力目錄](capability-catalog.md)、[原討論題目](web-discussion-brief.md) 全數保留。舊 intake 是吸收前評估；本次核准的動畫產品範圍是後續決策，不回寫改造 donor 原始碼或抹去先前風險。

## 2. 16 項決策完整追溯

所有列皆為「方向通過／實作未開始」。合併的是責任與實作位置，不是刪除需求。

| ID | Owner 通過的能力 | 必須保留的行為 | 歸屬 |
|---|---|---|---|
| PGQ-D01 | 簡報文案生成與校對 | 敘事串讀、小標去重、保留事實的壓縮、數值整理、情境式繁中校對、自檢後局部修稿；一主題＋3～5 點不變 | G2 / WP1 |
| PGQ-D02 | 內容呈現與構圖決策 | 按關係、資料與主次選呈現；不固定卡片／箭頭／等寬 KPI；完整保留核准內容並保持可編輯 | G4 / WP2 |
| PGQ-D03 | Golden 範例引導 | Owner 校準標準，AI 選適用參考，程式守硬限制；一般使用者不用逐頁選例 | G4 / WP2 |
| PGQ-D04 | 初版動畫規劃 | 數字 B 逐位滾輪、小標 E 底線 Sweep、完整 donor 背景效果選單、Style 配色、播放與編輯分離、reduced motion | G6 / WP3 |
| PGQ-D05 | 代表性樣張 | Typical＋Stress 共 1～2 頁；先 QA/repair；樣張回饋有範圍；核准頁不亂重生；跳過人工等待仍可內部驗代表頁 | G7 / WP4 |
| PGQ-D06 | 依實際能力創作 | 既有能力優先；有內容、覆蓋缺口、QA 或 Golden 依據才提出 candidate；驗證後才使用 | G5 / WP2 |
| PGQ-D07 | 素材前檢與歧義確認 | 用途／裁切風險先判斷；看不清、不確定且影響正確性才問；原始證據不被 AI 重畫取代 | G1 / WP1 |
| PGQ-D08 | 整份視覺節奏 | 內部規劃密度、主從、證據與動畫強弱；可有意重複，不強迫每頁不同 | G4 / WP2 |
| PGQ-D09 | 可讀內容承載 | 禁止無限縮字；先換合適構圖與處理冗文；拆頁或意義改動必須確認 | G3 / WP1＋WP4 |
| PGQ-D10 | Claim / Evidence | 事實、可重算衍生值、推論分開；不把相關寫成因果，不補不存在的數據 | G1 / WP1 |
| PGQ-D11 | 可讀性驗收 | 客觀硬檢查、結構風險 review、Owner-calibrated 審美分開；不用虛假的單一 clutter score | G7 / WP4 |
| PGQ-D12 | 使用情境與時間 | 對象決定資訊優先級、口頭／自讀決定自足程度、可用時間決定總量；不使用職稱＝頁數公式 | G2 / WP1 |
| PGQ-D13 | 來源一致性 | 只處理本 deck 素材的版本、指標與名稱衝突；有明確 supersession 才自動取代，不只憑檔名或修改日期 | G1 / WP1 |
| PGQ-D14 | 來源跟著內容走 | Claim／數值／衍生計算／呈現保持關聯，更新值時檢查相依結果；交付只含可分享的最小來源資料 | G1 / WP1＋共用契約 |
| PGQ-D15 | Main / Appendix / Drop | 主線、可信備用資料、無關或重複資料分流；outline 明示頁數；Drop 不等於刪除來源檔 | G2 / WP1 |
| PGQ-D16 | Ask Only When It Matters（B） | 高影響未知才追加問題；其他採保守呈現；不確定不得自動變事實，也不把核心證據偷偷移到附錄 | G1（跨流程）/ WP1 |

## 3. 七個責任區，沿用四個實作工作包

七區不是七個服務、七個 Agent、七份知識庫或七次 LLM 呼叫。優先由目前使用者的同一 AI 執行合併的規劃／校對；只有機械驗證需要程式。已有 manifest 能承載就擴既有欄位，不按每個區另造正本。

| 區 | 現有基底 | 真正增量 | 不新增什麼 |
|---|---|---|---|
| G1 素材與事實 | `runtime/grill-outline.js` 的 reviewed 素材／sourcePolicy；`asset-policy.js`；DeckSpec citation | 用途與裁切風險、衝突、claim/source/derivation 關聯、高影響未知 | Evidence DB、知識圖譜、上傳來源全文 |
| G2 敘事與情境 | Grill 的 desiredChange/resistance/evidence/CTA；人工 outline | 文案自檢、時間與自讀模式、主線／附錄／排除分配 | 新問卷、講者稿系統、第二份 outline |
| G3 內容承載 | `layout-repair-policy.js` 已有 safer-composition → shortening → split | 把過密回報前移，與文案壓縮和核准範圍接合 | 獨立 Content Budget service、縮字到過關 |
| G4 視覺規劃 | `generation-plan.js`、`design-grammar.js`、`composition-primitives.js`、Golden materials | 語意到構圖的選擇理由、少量適用範例、跨頁節奏 | 新版型資料庫、產業模板分類、第二 renderer |
| G5 能力邊界 | 已有 primitives/schema allowlist；`capability-probe.js` 檢查 read/render/screenshot/save | 從實際 registry 產生能力視圖；缺口候選的驗證接入 | 手工維護重複的支援名單、預設自我改寫安裝核心 |
| G6 動畫 | `motion-primitives.js` 與 role treatments/reduced motion | B/E、背景 effects adapter、Style 色彩映射、序列／重播／靜態狀態 | donor Python editor、另一條 export、LLM 每頁手寫動畫 |
| G7 驗證修復 | sampleCount 0/1/2、geometry、browser receipts、既有修復上限 | Typical/Stress 選頁、樣張保留、readability、內容對應、deck 回饋範圍 | 多重審批 console、只驗樣張就讓完整 deck 放行 |

現況定位：`generation-plan.js` 目前是 `outline.slides.slice(0, sampleCount)`，不是代表性選頁；`design-grammar.js` 讀規則，不是已證明逐頁看過圖片參考；`capability-probe.js` 的環境 probe 不是生成能力清單；citation component 不是完整來源相依模型。

已知正確性缺口歸 WP2：`schemas/deck-spec.schema.json` 的 chart enum 有 bar/line/area/pie/donut，但 `full-deck-renderer.js` 的 chart 分支統一畫 bar-row 並使用數值絕對值。不得只擴 prompt 就宣稱支援更多圖；需定義支援範圍、負值语意與不支援時的明示行為。保留舊格式讀取能力，不能靜默改成不同圖意。

## 4. WP1 — Preflight / Brief Upgrade

**覆蓋：** G1/G2/G3；D01/07/09/10/12/13/14/15/16。  
**優先序：** R11-R1 release closure 後的第一個增量。  
**既有落點：** `runtime/grill-outline.js`、`runtime/layout-repair-policy.js`、`runtime/workflow-entry.js`、既有 brief/outline 規格與共用 Skill 指引；只在必要時抽小型 pure helper。

先讀素材並保留可核查來源，再在同一次草稿中做文案與事實校對。來源具有明確版本取代關係才自動選；檔名 v2、較新的 timestamp 或較好看的數字都不足以單獨證明權威性。相同名稱但期間、母體、幣別不同，不應誤報成同一指標衝突。

截圖先保留內容；數字／日期／欄名等證據上下文不能為美觀裁掉。結構化來源可由程式重繪，但解析、欄位映射與計算仍須驗證；模型或 OCR 高信心不等於事實正確。只在影響內容、證據或重要決策時提出短問句，其餘採保守展示並保留未知狀態。

時間估計是可校準的 planning heuristic，不是已驗證的人類講速模型。對象不等於職稱刻板模板；必要資訊由本次目的決定。主線與附錄同在原本 outline，資料不足不補數字湊 3～5 點。

**驗收：** 相同資料不重問；兩份真正衝突的核心數字會被指出；期間不同不誤合併；來源只有相關時不產生因果句；增減值、百分比與百分點由程式重算；未授權的圖表／圖片不生成；未知條件不寫成事實；主線＋附錄不繞過總頁數限制；post-approval 內容不靜默改寫。

## 5. WP2 — Generation Planner Upgrade

**覆蓋：** G4/G5；D02/03/06/08。  
**依賴：** WP1 的核准內容與最小來源／數值契約。  
**既有落點：** `runtime/generation-plan.js`、`runtime/composition-primitives.js`、`runtime/full-deck-variants.js`、`runtime/design-grammar.js`、必要的 `full-deck-renderer.js`、`design/materials/`。

以已核准 slide ID 與內容引用規劃關係、主從、素材、構圖、參考與相鄰頁節奏。只帶本單元需要的少量 reference，記錄「實際讀取／使用的參考」，不能只附 reference ID 就聲稱模型看過圖片。不批次再生成四份 full deck；不增加逐頁四選一。

Donor 選圖詞彙與真實 renderer 能力交集後才可推薦。從已有 registries 生成一個能力視圖，避免 schema、renderer、editor、export 各說各話。現有能力不足時必須先指出具體內容／可讀性／語意或 Golden 缺口。

**Candidate 分兩類：** 既有契約能表達的組合／variant，經相同 QA 可用於本 deck；需要新資料型別或 executable renderer/effect 的候選，必須先完成 schema、sanitizer、renderer、editor/export、版本相容、離線與 recipient 回讀的驗證。這是 D06 的實作分層建議，不是以 schema PASS 自行核准任意新程式，也不把需要核心升級的情況裝成員工端已可用。未完成者標 candidate/unavailable，保留不扭曲原意的既有方案或請人確認。

**驗收：** 同樣四點能正確區分比較／流程／證據，不強迫四卡；換構圖 content hash 不變；所有已核准內容對應可見元素；未支援 chart 明示而非偷換；不得用裝飾推導因果；相同內容可在已核准的不同 Style 重用；整份有理由的一致與變化，不固定左右交替。

## 6. WP3 — Motion Vocabulary Upgrade

**覆蓋：** G6；D04。  
**依賴：** WP2 的實際能力視圖與共用版本契約；不必等待 WP1 所有非相依文案改善才開發。  
**既有落點：** `runtime/motion-primitives.js`、`runtime/full-deck-renderer.js`、`runtime/deck-editor.js` 的最小動畫選擇 seam、Style/DeckSpec schema、既有 ZIP builder。可加入隔離的 background-effect adapter，但不引入第二套 deck runtime。

### 已確認的方向與證據限制

- **數字 B：** Owner 選定 odometer 逐位直向滾動。由真實原值到新值；向上／向下、符號、單位、小數與千分位正確；原值與比較上下文保留；年份、編號不自動當指標。不能用淡入或普通 count-up 冒充 B。
- **小標 E：** Owner 選定逐項揭示＋細底線 sweep；用 Style accent，不鎖紅色、不回到實心 highlight。不得為套 E 破壞比較頁需要同時可讀的語意；必要時分組同步。
- 以上是對話中 prototype 的視覺方向核准；原型並非都由正式 runtime 渲染，故正式整合仍須重播驗證。不得把 PIL 示意當正式產品 motion PASS。
- 背景先前的簡化示意全部不作 donor 的視覺 PASS/FAIL 證據；不要把 N/Q/S 等示意的淘汰變成禁用真正的 WAVES/HALO/TOPOLOGY。

### 背景產品範圍：完整選單，不先替使用者刪成兩種

`none / WAVES / BIRDS / NET / GLOBE / DOTS / FOG / CLOUDS / CLOUDS2 / CELLS / RIPPLE / RINGS / HALO / TOPOLOGY / TRUNK`。

14 種列入產品目標，不等於 14 種已通過技術驗證；本次沒有下載或執行其 runtime。每種需單獨記錄 supported/unavailable 與原因，尤其 RIPPLE 不可只因 donor 選單列出就宣布可用。

效果使用原實作能力，不再畫低保真模擬替代。StyleSpec 的 canvas/accent/text/surface 等映射到各效果真正的色彩參數，不能只設定 backgroundColor；donor 的 WAVES、FOG、CLOUDS、CELLS 已有不同映射可參考。若缺次強調色，從現有 palette 衍生，不先新增全域品牌系統。

一般介面提供效果、速度、強度、沿用 Style 色系與無動畫；進階僅露出該效果真的支援的參數，沒有 speed 參數的效果不得出現無效速度控制。AI 初版可選相容效果，使用者可改選，不強制每頁使用背景。

### 單檔與 runtime 邊界

使用已鎖版本、checksum 與授權可追溯的 JS／必要貼圖；不照搬 `@latest` 或執行時 CDN 下載。ZIP 仍單 core，無員工額外 Python server 或套件安裝。

**離線下拉選擇是實際能力承諾：** 最終 HTML 內顯示可用的每種效果，所需程式／貼圖必須本檔已攜帶，不能只包當前效果卻讓其他選项暗中連網。共用依賴只內嵌一次、效果按需初始化；切換時銷毀前一實例、離開頁面停止運算。完整 bytes 計入現有 20 MiB hard limit；超限不能靜默刪素材、改外鏈或宣稱全選單離線可用，須在生成前報告可交付限制。

編輯、保存、reduced motion 顯示最終數值與完整靜態內容；動畫不修改 canonical content。缺 WebGL／效果啟動失敗時保留可讀靜態版並明示，不當播放已通過。不把前景透明設定視為所有 shader 都支援的保證。

**驗收：** B 的升降、零值、負值與精度；E 的 3/4/5 小標、分組與 Style 換色；每個 offered effect 真實 browser replay；warm/light、dark、Company 等代表配色；切换／編輯／另存／離線重開／recipient parse；reduced motion、無 WebGL、依賴缺失、20 MiB、資源釋放；真實截圖／錄影，不接受模擬 GIF 作 runtime evidence。

## 7. WP4 — Representative QA Loop

**覆蓋：** G7；D05/11，重用 D09 repair。  
**依賴：** WP1/WP2；先驗靜態增量，WP3 完成後追加動畫與完整交付驗證。  
**既有落點：** `runtime/generation-plan.js`、`runtime/layout-repair-policy.js`、現有 `tools/` 與 `tests/` 的 browser/geometry surfaces、Golden Visual Regression；不另建 QA service。

AI 選 Typical＋Stress，總數仍為 1～2；只選一張時兼顧代表性。使用本次真實核准內容，不縮文換圖做漂亮假樣張。同一批正式生成單元先做代表頁，通過者直接重用到完整 deck，避免多付一輪生成成本。

有人工 sample：AI 先驗修再請人確認；無人工 sample：不多一個等待點，內部仍可用代表頁測高風險情境。兩種模式最後都必須逐頁 full-deck QA；樣張 PASS 不替代全份驗收。

回饋分 slide-local、deck-wide、profile opt-in；只把最終允許的設計設定保存回 StyleSpec／CompositionSpec，訪談、決策理由與版本歷史留在本機工作資料。核准 sample 凍結在目前內容／Style／契約版本；有受影響變更才局部失效與重驗，不默默重生已核准頁。

三層驗收：①可測硬錯（漏內容、幾何、靜態對比／尺寸等）；②結構與閱讀風險（AI advisory、有引用理由）；③Owner 校準標準／製作者對本 deck 的確認。圖片是否足以作證、動態背景是否干擾，不能僅由 CSS 對比值保證；未驗證標 NOT_RUN/UNKNOWN，不硬給 PASS。對比、投影字級等門檻實作時須列明標準來源、量測條件與適用例外，不把「AI 覺得亂」當客觀值。

沿用既有同一問題最多兩次 repair 的規格，不在每一層各重置計數；用完保留最後成功 artifact，給具體可行選項。修改事實或核准內容要回到原有確認範圍，不藉 repair 自行改結論。

**驗收：** 非前兩頁可被選為代表；中途樣張回饋正確傳到剩餘頁；已確認頁未受影響時 hash/構圖不變；skip-sample 無新增等待；故意過密、標籤相撞與動畫干擾能被偵測；所有 3～5 點不漏；repair 不無限循環；整份離線／編輯／sanitizer 回歸。

## 8. 共用契約增量，不開第五套 subsystem

這是 WP1–WP4 共用的相容性工作，不是獨立的新資料系統。具體欄位名稱／版本需先做最小 schema proposal 與 round-trip fixtures，尚未定版。

| 資料 | 放哪裡 | 不可誤用 |
|---|---|---|
| 原檔、路徑、完整來源定位、抽取結果、衝突、Grill 回答、review 理由 | 既有本機 brief／work context | 不跟著 HTML 分享，不放 personal profile |
| 核准文案、數字原值／新值、單位／期間、可分享來源摘要與必要 derivation | versioned sanitized DeckSpec 的最小擴充 | 來源 metadata 也可能敏感；只讓白名單、可交付欄位出檔 |
| 全 deck 配色、字體與預設動畫 | StyleSpec | 不複製一套 palette 到每個 effect |
| 單頁布局、內容引用、必要 bounded 覆寫 | CompositionSpec 與既有穩定 ID | 不用 DOM selector 或任意 HTML 作第二正本 |
| runtime/effect 識別、相容版本、依賴校驗 | 共用 registry／build manifest | 不把可執行 JS 當普通使用者資料放入 DeckSpec |

Source-linked 不等於收件者持有原始 Excel/PPTX。收件者 AI 可理解已分享內容與衍生關係；原來源未交付時必須說明無法再次對原件驗證。裁切展示不應把可能含私密資訊的完整原图暗藏在 HTML；原件預設留本機，只有明確可分享才附入。

同步修改範圍必須包含 `schemas/`、`runtime/deck-spec.js` sanitizer、renderer、browser editor 的 clean/export 路徑與 recipient parser 測試。新增欄位不能只在生成後存在，另存時又被 sanitizer 丟掉。舊版可讀，新版未支援欄位不靜默改意；未知格式明示。

## 9. 基準與核准目標的衝突登錄

本節是整合者的相容性分析，不把尚未討論的細節假稱 Owner 已裁決。新工作包開工前以小型 contract diff 解決；在那之前沿用目前安全行為。

| 衝突 | 已確認的兩端 | 本次處置 |
|---|---|---|
| 少問 vs 必要 Grill | D16 少問；現有 D-017 至少一個實質問題 | 保留既有必需 Grill，D16 控制額外追問。零問題新模式未獲確認，不偷偷移除 gate |
| 自動壓縮 vs 核准內容凍結 | D09 希望無意義變更可自動縮文；現有 shortening 需人批，restyle 有精確變更集 | 草稿／核准前可自動整理；核准後 wording-only 自動權限仍需契約釐清，先沿用精確變更確認。不得把「語意相同」假裝可由 hash 證明 |
| Appendix vs 15 頁 | D15 備用資料；既有上限仍在 | 主線＋附錄合計最多 15，附錄不是免費加頁。超限在 outline 提示，不改 schema 偷渡 |
| Source linkage vs sanitizer | D14 可追溯；既有不輸出原始素材／路徑 | 僅可分享 compact refs/derivations 出檔，來源全文與工作定位留本機；不是嵌入第二套 Evidence DB |
| 新能力候選 vs fixed renderer | D06 不鎖死 AI；既有拒絕任意 HTML/CSS | 可表達組合與新 executable 分流；新 executable 的驗證／版本契約需先明示，不能自我宣告 QA PASS 即升級 core |
| 完整背景選單 vs 舊禁用／size guard | D04 已核准 14 類選項；旧卡禁止 ambient/3D 作預設 | D04 是規劃中的明確例外，不抹除歷史；保留 none、受控 Style、技術可用性、offline 與 hard limit，禁止假支援與逐頁隨機炫技 |
| 样張 vs 全份 | D05 先看代表頁；既有全份 hard gates | 重用代表頁降低成本，但全份仍逐頁驗；核准樣張只對相同輸入版本有效 |

既有口頭例子的「特定秒數、7.5–8.5 分鐘、幾張樣本就足夠、某形狀＝高級」皆不升格成已驗證產品常數。使用來源不足時不能補造事實；把無根據的因果改成「可能」也不自動變合格推論。

## 10. 排程、驗證與停止條件

唯一排程在 BACKLOG：R11-R1 S3 → 既有 release closure → PGQ-WP1 → PGQ-WP2 → PGQ-WP3；PGQ-WP4 隨各增量串驗，最後做跨工作包回歸。這是依賴建議，不宣稱並行額度或另啟 16 張卡。

每包先重用舊測試與收據，再新增針對 gap 的測試；舊 gate COMPLETE 不重新歸零，新行為另外留下證據。共享 schema 以每包最小相容增量前進，不一次設計所有未來欄位。

本次只建立規劃與追溯，不改 runtime、schema、Skill 執行指令、installer、正式 ZIP、Company Pack 或 Golden verdict。產品測試、browser replay、14-effect 相容性在本次均 **NOT RUN**；不得沿用歷史 110/110 或模擬動畫當本次驗收。

後期拖曳、尺寸、插入、Undo/Redo、換色等人工編輯 UX 的意圖繼續保留在 [capability-catalog.md](capability-catalog.md) 與既有討論，不因本次前期整合視為取消或已交付；WP3 只接必要的動畫選擇／保存表面，不藉此重做整個 editor。
