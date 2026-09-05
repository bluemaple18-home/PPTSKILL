# Feature Specification: 跨 AI 共用簡報工作流

**Created**: 2026-09-04
**Status**: Approval Candidate v0.1
**Input**: 建立一套可供多人、跨 AI runtime 使用的簡報工作流，並納入 MD · HTML Viewer 的相關能力；Skill 只是其中一種入口。

## 問題與目標

團隊已多次製作簡報，但流程、品質標準與可重用資產尚未被整理成可攜式工作流。目標是讓內部 PM、RD、業務與行銷，在 Codex、Claude 或 Gemini 等 AI 工作環境中，由目前使用的 AI 執行完整流程，快速得到可審閱、可修改、可交付的簡報成品。

## 初步範圍

### In Scope

- 將簡報需求收斂成清楚的敘事、頁面結構與視覺方向。
- 讓內部 PM、RD、業務與行銷共用同一個入口，再依簡報目的調整內容與呈現方式。
- 產生或修改簡報成品，並執行內容與版面驗收。
- 提供可供人工檢視與修稿的交付路徑。
- 以 HTML 作為唯一正式工作檔與交付檔，形成與傳統 PowerPoint 工作流的產品區隔。
- 每份成品內建隱藏式編輯模式，可修改文字及管理投影片，再匯出新的單檔 HTML。
- 吸收 MD · HTML Viewer 的最小必要本機能力到成品單檔 HTML：檢視、編輯、重排、刪頁、另存新 HTML 與 PDF 匯出；不得依賴外部網址。
- 支援每位使用者選擇性套用自己的簡報偏好；公版 Skill 本身不綁定個人風格。
- 內建四套固定 Theme，涵蓋內部常見的管理、產品技術、業務提案與行銷敘事情境。
- 將核心流程與 runtime 包裝分離，讓同一套規格、模板及驗收規則能跨 AI 重用。

### Out of Scope（暫定）

- 自動部署或公開發布簡報。
- 自動把使用者內容上傳至第三方服務。
- 產生或維護 PPT／PPTX。
- 以 PowerPoint／Google Slides 相容性限制 HTML 簡報的互動與視覺表現。
- 要求使用者先安裝 ai-core、Antigravity memory、資料庫或其他個人基礎設施。
- 把 Codex Skill、Claude 指令或 Gemini 指令中的任一格式當成唯一真相來源。
- 建立額外的中央 AI 服務、共用模型帳號或後端推論層。

## 已查證的外部能力

MD · HTML Viewer 目前提供：

- 本機開啟 `.md` 與 `.html`。
- 自動目錄與明暗主題。
- 在預覽中修改文字與元件。
- 投影片排序、刪頁與頁碼重編。
- 匯出獨立 HTML，以及透過列印輸出 PDF。
- 核心檢視可離線使用，不要求帳號或後端。

## Assumptions

- HTML 是唯一 canonical 簡報格式；PDF 僅為使用者按需產生的衍生輸出。
- 第一版採最小充分範圍，先服務一個主要使用者與一條 P1 工作流。
- 各 runtime 可有自己的薄入口，並優先使用目前 AI 原生具備的推理、圖像、檔案與瀏覽器能力。
- 個人簡報偏好屬可撤回、會變動的 domain profile，不視為 AI 的核心人格或永久真相。
- 公版工作流在沒有任何 profile／memory 時，仍必須能用合理預設完成整條簡報工作流。
- 同一入口同時接受「從一句需求開始」與「整理既有素材」；有素材時優先沿用事實，沒有素材時先形成可確認的 brief。

## 研究支持的公版套路

- 先以受眾視角定義敘事頁序；每頁需有一句主張，並以「主張 → 證據／假設 → 行動 → 驗證」與「情境 → 行動 → 結果」組織內容，再進入視覺與實作。
- 每頁以 slide ID 定位；重要 claim 可回溯來源，並清楚分層標示來源事實、摘要、推論／假設與未知／禁區。speaker notes 應保存該頁的 beat、轉場、講者稿與可講述的行動／驗證條件。
- 工作流採 outline、style、sample、full 的薄 gate；每關同時檢查結構與實際渲染畫面，避免 gate 發展為另一套流程引擎。
- full gate 必須在 fresh state 檢查實際畫面，至少涵蓋目標投影尺寸與一個較窄尺寸，以驗證文字溢位、層級、資產與可讀性。

## Unresolved Frontier

- **TF-002 / Technical Follow-up / Non-blocking**：在不同 AI runtime 中，如何發現選配的 presentation profile；不得以 ai-core 作必要依賴。此項不阻塞 v0.1，無法發現時改用無記憶模式。

## Decision Log

- **D-001 / Resolved**：吸收 MD · HTML Viewer 的必要本機編輯、重排、刪頁、另存新 HTML 與 PDF 能力到單檔成品；成品不得依賴外部網址、帳號或服務。
- **D-002 / Resolved**：第一版服務內部 PM、RD、業務與行銷；共用單一入口，角色不各自拆成不同 Skill。
- **D-003 / Resolved**：採「公版 Skill＋每人可選的小型 presentation profile」。不把簡報偏好放進 Soul；當次明示需求優先於 profile，偏好變更可撤回且不得自動升格。
- **D-004 / Resolved**：交付物必須可切出去給每位同事獨立使用；公版 Skill 不依賴 ai-core 或特定記憶架構。
- **D-005 / Resolved**：產品本體是一套跨 AI 的小型簡報工作流，不限定為 Skill；Codex、Claude Code 與 Gemini 只提供薄包裝。
- **D-006 / Resolved**：HTML 是唯一正式工作檔與交付格式；不支援 PPTX。PDF 僅作為選配的人工匯出結果。
- **D-007 / Resolved**：每份單檔 HTML 預設進入乾淨播放模式，並內建可選的編輯模式；支援改字、投影片排序／複製／刪除及另存新 HTML。
- **D-008 / Resolved**：工作流同時支援從零建立與整理既有素材，不拆成兩套產品；共同進入 brief 與頁面計畫後再產製。
- **D-009 / Resolved**：公版提供四套固定 Theme；個人後續調整只寫入自己的 presentation profile，不回寫或分叉公版 Theme。
- **D-010 / Resolved**：Theme 選擇發生在需求提問／敘事架構完成後、正式製作前；AI 一次呈現四張封面示意圖，每種風格一張，由使用者確認後才進入完整簡報製作。
- **D-011 / Resolved**：四張封面一律使用訪談已確認的本次真實標題、副標與必要識別資訊；除 Theme 視覺規則外，內容與資訊層級保持一致，選款只比較風格。
- **D-012 / Resolved**：正式交付為可任意轉傳、雙擊開啟、離線播放的單一 HTML；不得要求收件者安裝工具、登入或連接服務。CSS、JavaScript 與合理大小的資產應內嵌；大型媒體的處理方式另列限制。
- **D-013 / Resolved**：使用者預設在 Codex、Claude 或 Gemini 等 AI 工作環境中啟動流程；目前的 AI 負責調用自身可用能力完成工作，不建立另一個中央 AI 服務。
- **D-014 / Resolved**：四款封面必須先以真實 HTML/CSS Theme 渲染，再截成四張 16:9 預覽圖供選擇；禁止用無法直接延伸為成品的純 AI 圖像概念稿代替。選定後沿用同一套 tokens、版型與元件製作全份。
- **D-015 / Resolved**：素材輸入不設產品層格式白名單；目前 AI 平台能讀取的文字、檔案、圖片、數據與網址都可直接作為輸入。若 runtime 無法讀取，才請使用者貼上內容或轉為該平台可讀形式。
- **D-016 / Resolved**：製作前採自適應的簡易 Grill Me，不使用固定五題問卷。AI 每次只問一題、附建議答案，下一題選擇最可能改變敘事、證據、風險或頁面架構的未解事項。
- **D-017 / Resolved**：Grill Me 是每次製作的必要流程，不提供「直接做」或完全略過；問題數依素材完整度與任務複雜度縮放。即使素材完整，仍至少提出一個能檢驗核心主張或受眾假設的實質問題。
- **D-018 / Resolved**：訪談採「標準輪＋動態伸縮」。標準輪必須覆蓋預期改變、受眾阻力、主張證據與 CTA 四個決策面；AI 可依素材完整度調整追問數，使用者也可要求問快一點或再深一點，但不能完全略過。
- **D-019 / Resolved**：研究支持的共同標準限於可攜敘事、證據、頁面 metadata、薄 gate 與實畫面驗收；既有簡報的固定頁數與個人文案不升格為公版規則，應保留為當次簡報或可替換 profile 的選擇。
- **D-020 / Resolved**：每份 HTML 內嵌 presenter mode，顯示當前頁講稿、下一頁提示、來源與進度；一般播放模式必須隱藏這些資訊。講稿隨 HTML 轉傳且可由原始碼讀取，因此禁止放入機密資訊。
- **D-021 / Resolved**：個人 presentation profile 跨專案生效，但專案與當次明示要求可覆蓋。只有使用者明確表示「以後都這樣」或確認記住時才更新；客戶與專案內容不得寫入個人 profile。
- **D-022 / Resolved**：過去簡報只作為敘事、證據、頁面 metadata、薄 gate 與實畫面驗收的流程證據；不得將其視為四套 Theme 的視覺母版或升格為固定頁數、個人文案與視覺偏好的公版規則。

## v0.1 核准邊界

v0.1 的交付契約是：在 Codex、Claude Code 或 Gemini 的任一現有 runtime 中，從需求與素材產出可離線播放、可本機修稿、可驗收的單檔 HTML。流程狀態、gate receipt 與能力探測只寫入本文件與下列 manifest；不得新增資料庫、FSM 服務、中央 runtime、全域 renderer 或第二套 lifecycle。

## 使用者故事、功能需求與成功條件

### 使用者故事

- **US-001 / 產製者**：身為簡報產製者，我要把需求與素材收斂成含可追溯主張的頁面計畫，以便產出可供受眾理解與採取行動的簡報。
- **US-002 / 簡報者**：身為簡報者，我要在不離開單檔 HTML 的情況下播放、查看 presenter 資訊並本機修稿，以便安全地演講與修正成品。
- **US-003 / 審閱者**：身為審閱者，我要取得可重播的 artifact 與 gate 證據，以便分辨已驗證的技術事實與僅供參考的敘事／美感建議。

### 功能需求

- **FR-001 / Artifact contract**：系統 SHALL 依 v0.1 最小 artifact 契約產出並保存每個工作階段的輸入、輸出、owner 與 validator。
- **FR-002 / Forward-only flow**：WHEN 任一 gate receipt 為 pass，系統 SHALL 只允許前進到下一個狀態；WHEN receipt 為 fail 或 blocked，系統 SHALL 保留最後成功 artifact 並不得宣告 released。
- **FR-003 / Deterministic validation**：系統 SHALL 執行定義的 schema、metadata、單檔、資產、畫面與三模式檢查，並將結果寫入 manifest。
- **FR-004 / Runtime capability**：系統 SHALL 在產製前記錄 `canRead`、`canRender`、`canScreenshot` 與 `canSave`；缺少能力時 SHALL 標示 blocked 或採用既有 runtime 的等價方式，不建立中央替代服務。
- **FR-005 / Presenter safety**：WHERE presenter mode 啟用，系統 SHALL 顯示當前頁講稿、下一頁提示、來源與進度；一般播放 SHALL 隱藏它們，且講稿不得包含機密。
- **FR-006 / Profile precedence**：系統 SHALL 在相關時讀取跨專案 profile，但 SHALL 以專案與當次明示要求覆蓋，且只有明確確認才更新 profile。

### 成功條件

- **SC-001**：release 僅在所有 required deterministic checks 均 pass，且 `release-manifest.json` 引用有效的 evidence 後成立。
- **SC-002**：`deck.html` 可在 fresh state 離線開啟，並在目標投影尺寸與一個較窄尺寸各留下可讀的 screenshot／overflow 證據。
- **SC-003**：內部三頁功能測試樣本的播放、前後導航、presenter、重排、複製、刪頁與另存 smoke 均 pass，才可進入完整 runtime；presenter 若不可用，必須先調整或移除並重新驗證。
- **SC-004**：每個已發布 slide ID 唯一，重要 claim 的來源、摘要、推論／假設與未知／禁區均可由 artifact 定位。

### 追溯表

| 使用者故事 | 功能需求 | 成功條件 | 主要證據 |
|---|---|---|---|
| US-001 | FR-001、FR-002、FR-003、FR-006 | SC-001、SC-004 | brief、outline、theme preview、render evidence、release manifest |
| US-002 | FR-003、FR-004、FR-005 | SC-002、SC-003 | deck、render evidence、release manifest |
| US-003 | FR-001、FR-002、FR-003 | SC-001、SC-004 | 所有 manifest、gate receipt 與保留的最後成功 artifact |

## 最小 Artifact 契約與責任

所有 artifact 均位於同一份工作輸出中；檔名固定，內容可由目前 runtime 產生與讀取。owner 是執行中的 AI／人工協作者，validator 是檢查該輸出的角色或 deterministic gate，不代表新增中央服務。

| Artifact | 產出步驟 | Input | Output／最低內容 | Owner | Validator |
|---|---|---|---|---|---|
| `brief.md` | intake → brief_valid | 需求、素材、Grill Me 回答、適用 profile | 受眾、目的、主張、證據、CTA、限制、未知／禁區 | 目前 runtime | 產製者確認完整性 |
| `outline.json` | brief_valid → outline_confirmed | `brief.md` | 唯一 slide ID、頁序、每頁主張、來源／摘要／推論／未知分層、beat、轉場、講稿 | 目前 runtime | 產製者確認頁序與內容 |
| `theme-preview-manifest.json` | outline_confirmed → theme_selected | `outline.json`、四套 Theme | 四張真實 HTML/CSS 封面預覽、Theme 選擇與內部三頁功能測試樣本範圍 | 目前 runtime | 使用者選定 Theme |
| `deck.html` | theme_selected → sample_passed → full_built | 已選 Theme、outline、內部三頁功能測試樣本驗收結果 | 離線單檔 deck、播放／presenter／編輯模式與必要本機修稿能力 | 目前 runtime | deterministic gate 與人工檢視 |
| `render-evidence.json` | full_built → evidence_valid | `deck.html`、capability probe | schema、資產、兩尺寸 screenshot／overflow、三模式 smoke、gate receipts 與最後成功 artifact 參照 | 目前 runtime | deterministic gate |
| `release-manifest.json` | evidence_valid → released | 前五項 artifact、核准結果 | artifact 雜湊／位置、能力探測、required checks、release receipt 與 human approval | 目前 runtime | 產製者與核准者 |

## Forward-only 狀態轉換

狀態只記錄在 artifact manifest 與本文件，並不要求 runtime 實作狀態機服務。每次 transition 均附 gate receipt。

| From | To | 進入條件／receipt | 失敗或阻塞時 |
|---|---|---|---|
| `intake` | `brief_valid` | `brief.md` 必填內容完整 | 留在 intake，保留現有 brief |
| `brief_valid` | `outline_confirmed` | 頁序、主張與關鍵未知已確認 | 留在 brief_valid，保留最後成功 brief |
| `outline_confirmed` | `theme_selected` | 四張預覽已渲染，使用者選定 Theme | 留在 outline_confirmed，保留 outline 與預覽 |
| `theme_selected` | `sample_passed` | 內部三頁功能測試樣本的播放、前後導航、presenter、重排、複製、刪頁與另存 smoke pass | 留在 theme_selected，保留選定 Theme 與最後成功功能測試樣本 |
| `sample_passed` | `full_built` | 全份 `deck.html` 已建立 | 留在 sample_passed，保留已通過的內部功能測試樣本 |
| `full_built` | `evidence_valid` | required deterministic checks pass | 留在 full_built，保留最後成功 deck 與 evidence |
| `evidence_valid` | `released` | `release-manifest.json` 完整且核准者確認 | 留在 evidence_valid，保留可重播的 evidence |

## Gate Receipt、修復與確定性驗收

每個 gate receipt 必須記錄 gate 名稱、時間、輸入 artifact、檢查結果、`pass`／`fail`／`blocked`、失敗原因、修復次數與最後成功 artifact。相同問題最多修復兩次；第三次不得自動重試，必須停在目前狀態交由人類選擇修正方向、降級或取消。任何 fail／blocked 均不得覆寫最後成功 artifact。

| Required deterministic check | 驗收證據 | 放行規則 |
|---|---|---|
| schema | 六份最小 artifact 的 schema／必填欄位 | 缺欄即 fail |
| slide ID 唯一性 | `outline.json` 與 `deck.html` 的 slide ID 對照 | 重複或缺失即 fail |
| metadata 完整性 | 每頁主張、來源／摘要／推論／未知分層、beat、轉場與講稿 | 必填欄缺失即 fail |
| 單檔／無外鏈 | `deck.html` 的資產與連結掃描 | 外部依賴或不可離線資產即 fail |
| 資產載入 | fresh state 載入結果 | 任一必要資產失敗即 fail |
| 兩尺寸畫面與 overflow | 目標投影尺寸與較窄尺寸的 screenshot、overflow 記錄 | 無截圖或未處理溢位即 fail |
| 三模式 smoke | 內部三頁功能測試樣本與成品的播放、前後導航、presenter、重排、複製、刪頁與另存結果 | 任一必要操作不可用即 fail；presenter 可於功能測試階段移除後重驗 |

敘事、內容說服力與美感 review 均為 **advisory**：必須記錄回饋，卻不可單獨讓 artifact 放行；required deterministic checks 與必要的人類核准才構成 release 證據。

## Runtime Capability Probe

在 `intake` 前或首次需要該能力時，現在的 AI runtime 以 capability probe 寫入 `release-manifest.json`：`canRead`、`canRender`、`canScreenshot`、`canSave`。每項記錄 `true`、`false` 或 `unknown` 與可重現的 probe 結果。`canRead` 或 `canSave` 為 false 時 blocked；`canRender` 或 `canScreenshot` 為 false 時，不得假稱 evidence_valid，應停在可用的最後 artifact，或由既有 runtime 的等價能力完成同一檢查。probe 不安裝服務、不呼叫中央 runtime，也不改變跨 AI 的薄包裝邊界。

## 簡易 Grill Me（草案）

AI 先讀完使用者提供的全部素材，能自行判斷的內容不得重問。可能追問的面向包括：

- 真正要促成的決策或行動。
- 受眾已知什麼、在意什麼、可能反對什麼。
- 一句話核心主張，以及支持主張的證據。
- 必須保留、不可公開或不可臆測的資訊。
- 簡報場合、時間、語言與必要限制。
- 故事順序、關鍵轉折、結尾與 CTA。

每輪遵循：`讀取現況 → 找最高影響未知 → 提一題＋建議答案 → 更新 brief／架構 → 再判斷是否需要下一題`。

使用者不能用「直接做」略過訪談。素材充分、目標單純時走精簡路徑；素材衝突、目的模糊、受眾複雜或證據不足時自動加深。題目必須有實質決策價值，不為了滿足流程而重問已知資訊。

標準輪至少驗證：

1. 這份簡報真正要改變的認知、決策或行動。
2. 受眾最在意、最可能質疑或反對的事項。
3. 核心主張與足以支持它的證據。
4. 結尾希望觀眾採取的下一步或 CTA。

停止條件不是固定題數；需同時具備可確認的標題／副標、受眾、目的、核心主張、主要證據、敘事順序、CTA、限制與頁面架構。停止後先讓使用者確認架構，再進入四款封面選擇閘門。

## 四套固定 Theme（草案）

1. **Executive Clear**：高留白、結論先行、數字醒目，適合主管報告、決策與進度更新。
2. **Product Blueprint**：結構清楚、流程／架構圖友善，適合 PM、RD、產品規格與技術說明。
3. **Sales Momentum**：對比強、利益與證據突出，適合提案、案例、商務與成交情境。
4. **Brand Story**：圖片與情緒敘事優先、節奏明顯，適合品牌、活動與行銷內容。

四套 Theme 共用相同的投影片元件與編輯 runtime，只替換 design tokens、版型傾向及視覺規則，避免維護四套獨立系統。

## Theme 選擇閘門

觸發時機：brief、受眾、目的、核心訊息與頁面架構已足以製作，但尚未生成完整簡報。

工作流必須：

1. 訪談結束時先鎖定簡報標題、副標、受眾、核心訊息與頁面架構。
2. 依已確認的真實標題與副標產出四張 16:9 封面示意圖，每套固定 Theme 各一張。
3. 四張圖的文字、資訊層級與素材條件保持一致；只允許 Theme 的色彩、字體、構圖、形狀與視覺語言不同。
4. 每張圖清楚標示 Theme 名稱；可附一句適用情境，不要求使用者理解設計術語。
5. 使用者選定一款後才進入全份製作；未確認時不得大量生成投影片。
6. 若使用者已有 profile 偏好，AI 可先標示建議款，但仍展示四張並保留選擇權。
7. 封面示意只作視覺選款，不冒充完整簡報驗收；全份完成後仍須逐頁視覺檢查。
8. 每張封面預覽皆由實際 HTML/CSS 渲染結果截圖；若需要照片或插圖，可由目前 AI 的原生生圖能力產生後嵌入 HTML。

## 工作流骨架（草案）

`需求與素材 → 簡報 brief → 敘事與頁面計畫 → 產製 → 視覺驗收 → 人工修稿 → 格式交付`

- **核心層**：共用 brief、頁面計畫、風格 profile、產出規則與驗收標準。
- **產製層**：由目前 AI 使用自己的原生工具產出自包含的單檔 HTML 簡報；核心契約定義結果，不硬綁同一組工具名稱。
- **檢視與修稿層**：在成品單檔 HTML 內提供必要的本機檢視、修稿、重排、刪頁與 PDF 匯出能力，不依賴外部網址。
- **成品 runtime**：播放模式預設隱藏控制介面、講稿、來源與進度；使用者可切換至 presenter mode 查看當前頁講稿、下一頁提示、來源與進度，或進入編輯模式並以「另存新 HTML」保存結果，不直接覆寫來源檔。
- **入口層**：Codex、Claude Code、Gemini 等 runtime 的最薄啟動說明。
- **降級路徑**：沒有個人 profile 時使用公版預設；特定原生工具缺席時，AI 依共用檔案契約選擇等價方式完成結果。

## Acceptance 與 Prototype Gate

先完成一份**內部三頁功能測試樣本**，其用途只在驗證播放、前後導航、presenter、重排、複製、刪頁與另存：播放模式須隱藏 presenter 資訊；presenter mode 須能顯示當前頁講稿、下一頁提示、來源與進度；編輯模式須可完成其餘本機修稿操作。若 presenter mode 不好用，可在功能測試階段調整或移除；樣本通過後，才將完整 runtime 擴展到正式簡報。

此內部三頁功能測試樣本不是正式簡報、內容模板或頁數限制。正式簡報頁數完全由內容決定，且不受三頁限制。

## 個人偏好契約（草案）

僅保存會重複影響簡報產出的穩定偏好，例如：

- 語氣與資訊密度。
- 常用版型、色彩與字體傾向。
- 圖表、圖片與動畫偏好。
- 常用輸出格式。
- 明確不喜歡的呈現方式。
- 經使用者確認的參考簡報。

不保存單次簡報內容、客戶／專案內容與機密、臨時要求或未經確認的推測。每次任務中的明示要求永遠優先。

## 偏好提問時機

1. Grill Me 的最後一題，主動摘要本次將套用的既有偏好，並詢問使用者是否要調整。
2. 製作中不得為偏好更新打斷工作；臨時改動僅列為候選，留待最後一次確認。
3. 完整成品驗收後，主動詢問是否把本次已確認的改動保存為未來預設；僅在使用者明確說「以後都這樣」或確認記住後更新 profile。

## 可攜式運作模式

1. **無記憶模式（必須可用）**：以公版預設開始；必要時進行一次極短偏好詢問，但不阻擋產出。
2. **選配偏好檔**：使用者可提供一份小型、可讀、可刪除的 presentation profile；它跨專案生效，但只在當次任務相關時讀取，且可被專案或當次明示要求覆蓋。
3. **既有記憶整合（非必要）**：若使用者自己的 AI runtime 已有 profile／memory，僅透過該 runtime 現成能力讀取，不要求安裝 ai-core，也不建立第二套資料庫。

個人資料不得寫進公版 Skill 套件，避免分享或更新 Skill 時夾帶、覆蓋個人偏好。
只有使用者明確說「以後都這樣」，或確認 AI 提出的偏好更新時，才更新 profile；單次修改不得自動變成長期偏好。
