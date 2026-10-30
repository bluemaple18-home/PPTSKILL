# 跨 Codex／Claude／Gemini 的 HTML-first 簡報工作流：研究綜合

## 判定基準

本文件只綜合三組既有研究訊號：歷史／記憶、Vault／tags，以及電子書方法。採用條件是：能同時提高敘事可讀性、可驗收性與跨 agent 可交接性，且不引入第二套 runtime、生命週期或全域常駐服務。

| 候選套路 | 來源交叉命中 | 分類 | why_not_less | why_not_more |
|---|---|---|---|---|
| 先定敘事頁序，再進入視覺與實作；每頁有一句主張、受眾觀點與 30 秒主線 | 歷史：敘事頁序先行、逐頁 beats；電子書：受眾視角、30 秒主線後下鑽 | 公版核心 | 若直接做畫面，頁面容易成為零散資訊，無法檢查故事是否成立 | 不需把敘事固化為複雜的企劃或工作流引擎；一份 outline 即足夠 |
| 每頁以「主張 → 證據／假設 → 行動 → 驗證」組織，並將抽象概念轉成可見場景、情境 → 行動 → 結果 | 電子書；歷史：逐頁 beats、講者稿 | 公版核心 | 只有標題與要點無法判斷推論跳躍、責任歸屬或預期結果 | 不強制所有投影片同一版型；此為內容邏輯，不是視覺模板 |
| 單檔、可離線開啟的 HTML 為主要交付物；renderer 失敗時保留 fallback | 歷史：HTML 單檔離線；Vault：HTML renderer + fallback、filesystem artifacts | 公版核心 | 僅交付設計稿或外部網站，無法可靠重播、審查與封存 | 不將 renderer 常駐化或包成平台服務；需要時在既有 runtime 呼叫即可 |
| 把 slide ID、來源連結、摘要／推論層與 speaker notes 寫入頁面或相鄰 artifact | Vault：provenance、slide IDs、speaker notes；電子書：重要 claim 可回來源、來源／摘要／推論分層；歷史：講者稿、來源／未知 | 公版核心 | 沒有可追溯性，跨模型 review 無法分辨事實、摘要與推論，也無法可靠修改指定頁 | 不建立中央知識庫或新記憶系統；頁面層 metadata 與檔案來源已足夠 |
| 為每頁定義 beat、預期轉場與講者稿，使投影片與口述節奏一致 | 歷史：逐頁 beats／轉場、講者稿；電子書：30 秒主線、情境 → 行動 → 結果 | 公版核心 | 只有畫面會使節奏與頁間邏輯成為未驗證假設 | 不做自動配音、計時器或演講 runtime；文字稿可由演講者調整 |
| 視覺路由：明確選擇圖表、流程、場景圖、比較表或純文字；顏色只承擔固定語意 | Vault：visual route；電子書：抽象轉可見場景、顏色語意 | 公版核心 | 不指定資訊的可視化形式，容易得到漂亮但不傳達關係的裝飾 | 不吸收全套設計系統或統一品牌 token；專案可另帶 style profile |
| 分階段 gate：outline、style、backend、sample、full；同時驗證結構與實際畫面 | 歷史：outline/style/backend/sample/full gates、結構 + 實畫面雙驗收；Vault：thin harness / fat skills | 公版核心 | 僅最終一次檢查會把內容、設計與技術問題混在一起，難以定位 | gate 僅是薄檢查點，不發展成第二套 pipeline、狀態機或協調層 |
| fresh state 的多尺寸實畫面檢查，確認首次載入、投影尺寸與文字溢位 | 歷史：fresh state、多尺寸、實畫面驗收；Vault：HTML renderer + fallback | 公版核心 | 僅檢查 HTML 結構不能證明實際排版、字級與切換狀態可用 | 不需要瀏覽器農場、雲端截圖服務或永久監測；每次交付做有限尺寸檢查 |
| 由獨立 agent／模型進行交叉 review，聚焦敘事、證據、畫面與可運行性 | 歷史：獨立 review；跨 Codex／Claude／Gemini 的任務背景 | 選配 | 單一作者自審容易漏掉同一組假設；重要交付應至少有獨立視角 | 不要求每次都三模型全跑；依風險、時程與素材敏感度選一個獨立 reviewer 即可 |
| runtime health 檢查：檔案可開啟、必要資產與 fallback 可用、輸出可重現 | 歷史：runtime health；Vault：filesystem artifacts、fallback | 選配 | 有 HTML 檔不等於其資產引用或預覽路徑有效 | 不建立持續健康監控；交付前一次性健康檢查即可 |
| style profile（品牌、字體、色彩、密度、語氣）與受眾設定 | 電子書：受眾視角、顏色語意；歷史：style gate | 個人 profile | 不帶最低限度的受眾與風格約束，成品容易不合場合 | 不把個人偏好提升為公版規格；不同講者、客戶與簡報目的應可替換 |
| sample slide 先行，確認風格、內容密度與 renderer 行為後再擴到全 deck | 歷史：sample gate；Vault：thin harness / fat skills、HTML renderer | 選配 | 直接量產整份簡報會放大錯誤的視覺或技術假設 | 不需預先做多套完整候選 deck；一至兩頁代表性樣頁即可 |
| 全域常駐 renderer、集中式 artifact registry、第二套 lifecycle／記憶層 | Vault：明確反對全域常駐 renderer 或第二套 lifecycle；歷史：runtime health | 不吸收 | 現有 filesystem artifact、按需 renderer 與既有 runtime 已可達成可驗收交付 | 這些能力增加維運面、權責與故障模式，未對本任務證明有量測缺口 |
| 把所有來源、未知與禁區升格為獨立治理／審批系統 | 歷史：來源／未知／禁區；電子書：來源／摘要／推論分層 | 不吸收 | 每頁來源註記、未知標示與禁區提示已能支持誠實表述與 review | 正式治理系統會超出簡報交付範圍，且未證明比輕量 metadata 更有必要 |

## 最小 sufficient workflow

1. **敘事契約**：建立 deck outline；每頁包含 slide ID、受眾要回答的問題、一句主張、30 秒口述主線，以及該頁在前後頁的 beat／轉場。
2. **證據契約**：對重要主張附來源；明確分標「來源事實」「摘要」「推論／假設」「未知／禁區」。將可講述的行動與驗證條件寫進 speaker notes。
3. **視覺與 HTML 實作**：為每頁選擇視覺路由，將抽象主張落成可見場景或關係；以單一離線 HTML 交付，並保留能開啟內容的 fallback。色彩僅用於一致且可說明的語意。
4. **薄 gate、雙證據驗收**：依序檢查 outline、style、backend、sample、full；每一關同時看結構資料與渲染後實畫面。full gate 在 fresh state 下以目標投影尺寸及至少一個較窄尺寸檢查文字、層級、資產與可讀性。
5. **交付前 review**：執行一次 runtime health 檢查；高重要性 deck 交由另一個模型做獨立 review，回饋以 slide ID、主張、來源與畫面證據定位，作者再做最小修正。

此流程以檔案為交接界面：Codex、Claude、Gemini 都可讀同一份 HTML 與其頁面 metadata，但各自只在自己負責的 gate 或 review 上產出可核對的證據。它保留跨模型協作的可替換性，而不是假設某一模型或 renderer 是唯一控制面。

## do_not_absorb

- 不新增全域 renderer、中央 registry、長駐服務、第二套 lifecycle、第二套記憶系統或新的 agent orchestration 層。
- 不把每次簡報都強制成三模型並行、完整樣式系統、雲端瀏覽器矩陣或持續 runtime 監控。
- 不將個人品牌、字型、配色、篇幅偏好或固定版型偽裝成跨專案公版核心；它們應留在可替換的 profile。
- 不以來源 metadata 取代研究本身，也不以 gate 名稱取代實畫面與可追溯證據；驗收必須仍可回到具體 slide、來源與渲染結果。
