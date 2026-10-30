# html-slide-builder-oss — 完整能力目錄

**目的：完整介紹 donor，不代表 PPTSKILL 決定採用。**

這份目錄刻意把套件介紹的完整能力全部保留下來，再由 `intake-report.md` 另行判斷 adopt／adapt／reference／reject。它不是只列「PPTSKILL 可能會吸收」的部分。

## 證據標記

- `DOCUMENTED`：README、EDITOR、CLAUDE、SKILL 或專題文件有宣稱。
- `SOURCE-OBSERVED`：靜態原始碼可看到對應入口或實作。
- `NOT-RUN`：本輪遵守 intake 邊界，沒有啟動 server、編輯器、下載、API 或 export；不能當 runtime PASS。
- `DRIFT`：文件之間或文件與程式不一致。

## 1. 產品完整體

`html-slide-builder-oss` 將簡報定義為一組固定 `1280×720` 的獨立 HTML 頁面：每頁有自己的 HTML、CSS、JavaScript；本機瀏覽器編輯器直接讀寫這些頁面；分享時再打包成一個可離線開啟的 HTML deck。

它包含五個主要面向：

1. LLM／人工 authoring：從 starter 複製 deck，直接寫每頁 HTML。
2. local WYSIWYG editor：選取、移動、縮放、改文字、插入媒體、動畫、頁面管理與自動儲存。
3. deterministic checks：檔案寫入安全檢查與 slide linter。
4. export packager：內嵌字體、圖片、影音、腳本與 navigation，輸出單一 HTML。
5. supporting systems：SVG chart vocabulary、Vanta 背景、文字動畫、live LLM demo、繁中簡報文案規則與 Cowork skill 包裝。

狀態：`DOCUMENTED + SOURCE-OBSERVED + NOT-RUN`。

## 2. 核心資料模型與檔案結構

### 2.1 HTML 是 source of truth

- 沒有中間 presentation schema，也沒有 generator 產物要回寫。
- editor 保存時序列化整份 slide DOM，直接覆寫該頁 HTML。
- 每個被視覺編輯的元素以 `data-ed` 保存位移、尺寸、旋轉與縮放。
- runtime 生成內容以 `data-live`／`data-live-id` 區分 authored state 與 live DOM。
- 背景效果設定放在 `data-vanta`。
- 文字動畫設定放在 `data-anim`。
- export 會移除 editor-only `data-ed` metadata。

### 2.2 Deck directory

```text
decks/<name>/
├── deck.json
├── slides-*/
│   ├── *.html
│   └── lib/
├── assets/
├── .editor-backup/<slides-dir>/
├── .trash/<slides-dir>/
├── .archive/
└── out/
```

- `deck.json` 只指向哪個 slides folder 是 live，不保存第二份內容。
- `slides-*` 是真相來源。
- `assets/` 放編輯器插入的圖片／影音。
- `.editor-backup/` 保存每頁第一次被改動前的版本。
- `.trash/` 保存被刪除的頁面。
- `.archive/` 是停用的舊 scaffolding。
- `out/` 是打包後交付物。

狀態：`DOCUMENTED + SOURCE-OBSERVED + NOT-RUN`。

## 3. 建立與 LLM authoring workflow

### 3.1 開新 deck

- `slide_gen/new_deck.py <name>` 從 `examples/starter/` 複製三頁起手式。
- 預設建立 `decks/<name>/slides/` 與 `deck.json`。
- 目標 deck 只要已存在，即使是空目錄也拒絕覆寫。
- 支援 `--from <template>` 與 `--root <path>`。
- deck 名稱拒絕 `/` 與前導 `.`。

### 3.2 寫入既有 deck 前檢查

- `new_deck.py --check <slides-dir>` 檢查 `data-ed` 與 `.editor-backup/`。
- 找到編輯痕跡就 exit 1 並要求另建目錄，不准覆寫。
- 不存在或沒有編輯痕跡則回報可以寫入。

### 3.3 slide-deck skill

套件附一份 `skills/slide-deck/SKILL.md`，觸發條件包含建立 deck、改頁、加頁。流程是：

1. 新建 deck，或先對既有 deck 跑安全檢查。
2. 直接撰寫／修改 `slides/*.html`。
3. `slide_lint.py --strict`。
4. 需要分享時才 `build_deck.py`。
5. 交付前啟動 editor 實際逐頁查看。

Skill 還要求：

- 先讀 starter content page。
- 主題 CSS 區塊跨頁一致複製，避免每頁重寫造成 drift。
- 使用繁體中文與 `slide-copy-zh-tw.md`。
- 圖表只用 `chart.py` 可渲染形式。
- 禁止直接修改 starter、`.editor-backup/`、`.archive/`。
- 禁止未檢查就寫既有 deck。
- 禁止元素上寫死 font family。

### 3.4 Cowork skill pack

- `skills/pack.sh` 產生可上傳 Cowork 的 skill ZIP。
- 會打包 SKILL、starter template、繁中文案與 chart vocabulary。
- 文件描述 Cowork 負責寫頁，Claude Code 本機負責 lint/editor 驗證。
- 目前 pack script 沒把 SKILL 所引用的 Python CLI 一起打包，屬 handoff 缺口。

狀態：`DOCUMENTED + SOURCE-OBSERVED + NOT-RUN`。

## 4. Slide contract 與 linter

`slide_gen/slide_lint.py` 可檢查單檔或整個 slides directory；`--strict` 將 warning 也升為失敗。

### 4.1 Error checks

- 必須找到 `width:1280px`。
- 必須找到 `height:720px`。
- HTML／CSS 內的外部 URL 只允許 Google Fonts hosts；其他網址視為離線交付失敗。
- 元素與 style attribute 不得寫死實體 font family；只能用 display/body/label CSS role 或 generic family。
- 整份 deck 的 `--display-font`、`--body-font`、`--label-font` 必須一致。
- 禁止 `alert()`、`confirm()`、`prompt()`，避免卡死自動化。

### 4.2 Warning checks

- HTML class 在該頁 CSS 沒有任何對應規則時警告。
- editor 自己管理的 class，以及帶 inline style、`data-ed`、`data-live` 的元素會排除，降低誤報。

### 4.3 刻意不做的檢查

- 不比較跨頁所有 theme CSS 是否完全一致，因為實際 theme 頁存在合理差異。
- 不要求 `<script>` 本身放在 `data-live` 裡；真正的規則是 runtime 生成節點必須位於 `data-live`。
- 不要求作者手填 `data-live-id`，編輯器會補。
- 不判斷美感、圖表重疊或實際 viewport geometry。

狀態：`DOCUMENTED + SOURCE-OBSERVED + NOT-RUN`。

## 5. Local WYSIWYG editor

### 5.1 啟動與瀏覽範圍

- Python stdlib `ThreadingHTTPServer`，綁定 `127.0.0.1`，預設 port `8765`。
- 可以直接指定 slides directory，或不指定 deck 從 UI file picker 選擇。
- `--root` 限制 file picker 可瀏覽的根目錄。
- server 會阻擋 `..` path traversal、非 root 內目錄與非 slide HTML target。

### 5.2 元素選取與幾何編輯

- 單選與 Shift 多選。
- 拖曳移動。
- 拖角調整尺寸。
- 拖旋轉控制點；Shift 以 15° snap。
- 方向鍵 1px、Shift+方向鍵 10px 微調。
- 8px grid 顯示與 snap。
- 對齊與平均分布；單一元素時可對齊整張 slide。
- 位移／尺寸／旋轉保留兩位小數，避免 fractional layout 累積 1px 誤差。
- 編輯數值以 delta 疊加在既有 computed transform 上，不直接取代 theme positioning。

### 5.3 文字與樣式編輯

- 雙擊文字進入 `contenteditable`。
- 離開文字編輯後自動保存。
- 處理注音／倉頡等 IME composition event。
- Enter 正規化為 `<br>`，避免 Chrome 的 block wrapper 被 sanitizer 拆掉換行。
- 貼上內容只保留限定文字標籤與 class attribute。
- 可插入新文字框。
- type panel 可改字體角色、字級、字重、斜體、行高、字距、顏色與對齊。
- copy/paste style 只搬文字外觀，不搬位置尺寸。
- computed font family 保存前會映回 `var(--display-font)`／body／label role。
- 色票從目前 deck 的 `:root` CSS variables 讀取。

### 5.4 媒體與 component 操作

- 插入圖片與影片到 `assets/`，並加入可拖曳元素。
- 刪除目前選取元素。
- 還原元素位置：清掉 editor 幾何調整，不刪除元素。
- 沒有圖層順序 UI；需要手改 `z-index`。
- 影片預設 `autoplay muted loop`。

### 5.5 自動保存與衝突處理

- 停手約 0.4 秒後自動保存。
- UI 顯示未保存／保存中／已保存／保存失敗。
- slide response 帶 `X-Slide-Mtime`；save 必須帶回載入時的 base mtime。
- mtime 不一致時回 409、停止保存並要求 reload，避免舊分頁覆蓋外部修改。
- server 保存後回傳新 stamp／mtime，client 立即採用，避免自己的保存被 poll 誤判為外部修改。
- 寫檔採同目錄 temp file + rename。

### 5.6 Undo／redo／recovery

- 每個操作前保存整頁 snapshot；支援 Command+Z、Shift+Command+Z。
- 連續方向鍵微調合併成一個 undo step。
- memory 內保留較完整 undo；sessionStorage 只保留 bounded snapshots，避免超過瀏覽器 quota。
- persisted undo 以該頁 mtime 驗證，不使用整份 deck 最新 stamp。
- deck-level operations 與 per-slide undo 以 timestamp 決定全域撤銷順序。
- server 在每頁第一次寫入前保存 `.editor-backup/`；只保存一次。
- 刪除頁面不是 unlink，而是移到 `.trash/`，可 restore。

### 5.7 Page management

- 插入頁：複製指定頁，確保 theme CSS 與結構存在。
- 刪除頁：最後一頁不可刪；其餘進 `.trash/`。
- 復原刪除頁。
- rename page。
- move/reorder page。
- renumber footer page labels 是明確操作，不在刪頁後偷偷改整份 deck。
- 插頁用 `03a-...html` 類 gap filename，不重編後面所有檔名。
- rename/move 同時搬 backup 與 session history key，避免 undo 脫鉤。
- reorder 只改被搬動頁面的檔名，不動其他頁。

### 5.8 Preview／interaction／export UI

- editor overlay 負責選取；interaction toggle 讓滑鼠事件穿到 slide demo。
- present mode／全螢幕預覽。
- editor 右欄可直接觸發單檔 export。

狀態：`DOCUMENTED + SOURCE-OBSERVED + NOT-RUN`。

## 6. 單檔 HTML export

### 6.1 Export CLI

`build_deck.py <slides-dir> -o <deck.html>` 支援：

- `--font wenkai|serif|none`
- `--nav scroll|buttons`
- `--title`
- 外框 `--bg`／`--ink`
- legacy `--overrides`
- external `--assets` directory

### 6.2 字體

- `wenkai`：LXGW WenKai TC；缺少時從 GitHub release 下載。
- `serif`：隨包 Noto Serif TC 常用 CJK subset。
- `none`：不內嵌字體。
- 掃描整份 deck 實際字符，以 `pyftsubset` 生成 WOFF2 subset。
- 將 Google Fonts `@import` 替換為內嵌 `@font-face`。
- 將 display/body role 改為內嵌 `DeckCJK`；label role 改為 system sans stack。
- 宣稱典型 subset 約 40–60KB。

### 6.3 Asset／script inlining

- 圖片：JPEG、PNG、GIF、SVG、WebP、AVIF、ICO。
- 影音：MP4、M4V、WebM、MOV、MP3、WAV、OGG。
- 字體：WOFF2、WOFF、TTF、OTF。
- 其他：WASM、JSON、CSS、JS、MJS、TXT、CSV。
- 本機 `<script src>` 讀成 script text 直接內嵌，並處理 `</script>` 提前閉合。
- 本機 `src=` assets 轉 data URI；外部 HTTP(S) script 保持原樣。
- MIME table 無匹配時使用 `application/octet-stream`。
- legacy overrides 可在 export temp directory 合成，不回寫來源頁。

### 6.4 Deck navigation

- `scroll`：transform track + wheel gesture lock，一次手勢一頁。
- `buttons`：上一頁／下一頁按鈕。
- 兩種模式都支援方向鍵、空白鍵、PageUp/PageDown、Home/End。
- 右側進度點可點擊跳頁。
- `F` 進入／離開全螢幕。
- touch swipe。
- window resize 與 fullscreen change 後重新 fit。

### 6.5 iframe model

- 每張 slide 放入 iframe。
- 實作使用 `sandbox="allow-same-origin allow-scripts"`。
- donor 明確說明：兩者同時使用讓 authored slide scripts 可運作，但不能用來承載 untrusted HTML。

狀態：`DOCUMENTED + SOURCE-OBSERVED + NOT-RUN`。

## 7. 圖表系統

### 7.1 Renderer

`chart.py` 不使用 Chart.js／ECharts，直接產生可貼進 slide 的 inline SVG。九種已實作 forms：

1. `slope`
2. `line`
3. `column`
4. `bar`
5. `ordered_bar`
6. `lollipop`
7. `diverging_bar`
8. `stacked_column`
9. `bullet`

共同特性：

- CSS variables 走 `--chart-* → theme token → literal fallback`。
- 字體走 body/label role。
- title、subtitle、source 保持為 slide 上的獨立可編輯文字，不塞進 SVG。
- 預設 mono emphasis；可選 accent emphasis。
- 只強調一筆，其餘用中性色，不提供多色 categorical palette。
- slope label 有 de-collision 與 leader line。
- 尺寸、tick、CJK label width 使用本地計算，不依賴圖表 library。

### 7.2 Vocabulary／suggestion

`chart-vocabulary.yaml` 由 FT Visual Vocabulary 整理成九個問題 families：

1. deviation
2. correlation
3. ranking
4. distribution
5. change over time
6. magnitude
7. part to whole
8. spatial
9. flow

每個 form 標記 `ready`、`planned` 或 `skip`，並含 slide fitness、使用情境與警告。`chart.suggest()`：

- 先比對常見問題 shortcut。
- 再用中文 character bigram 相似度排序 family。
- 預設只回傳已有 renderer 的 ready forms。
- 沒有分數就回空清單，不硬猜。
- 支援直接指定 family、是否包含 planned/skip、回傳 top N。

內建 AdTech shortcuts 包含季度變化、版位成效、預算分配、漏斗流失、目標達成、日曆流量、受眾分布、花費與成效相關性。

狀態：`DOCUMENTED + SOURCE-OBSERVED + NOT-RUN`。

## 8. Interactive slides、Vanta 與文字動畫

### 8.1 任意 slide JavaScript

- slide 可以執行 JavaScript、WebGL、Wasm 或 demo。
- runtime 生成節點必須放進 `data-live`；保存時還原 authored snapshot，避免 live DOM 累積回檔案。
- `data-live` 以 ID 配對，不依 DOM order。
- Wasm 必須 base64 內嵌並從 ArrayBuffer 啟動，不能依賴離線 `fetch`。
- 真實 terminal／live LLM 無法在單檔離線交付；建議改成 recorded playback。

### 8.2 Vanta backgrounds

右欄可為單頁加入 14 種 Vanta effects：

- waves
- birds
- net
- globe
- dots
- fog
- clouds
- clouds2
- cells
- ripple
- rings
- halo
- topology
- trunk

能力包含：

- 第一次使用才下載 Vanta effect 與 three.js／p5.js。
- TOPOLOGY、TRUNK 使用 p5.js；其他十二種使用 three.js；CLOUDS2 另需 noise texture。
- parameter schema 由各 effect defaults 整理進 editor。
- effect config 寫入 `data-vanta`，重開仍可編輯。
- background 或 foreground layer。
- foreground 強制透明背景與 `pointer-events:none`。
- 自動把 slide background 映射到各 effect 真正有效的 color option。
- 特別處理 WAVES、FOG、CLOUDS、CLOUDS2、CELLS 的色彩行為。
- 偵測 p5 等 library 在 layer 外插入的 body children，以 `data-vanta-junk` 標記並在序列化時移除。

### 8.3 Text animation

兩種效果：

- number count-up：從 0 跑到元素內數字，支援 duration/easing。
- reveal slide-in：依 per-element order stagger 進場。

行為：

- config 存在 `data-anim`。
- 第一個 animation 加入 runtime script，最後一個刪除時移除 runtime。
- editing iframe 裡不跑 animation，避免中間狀態被保存。
- requestAnimationFrame 不執行時用 timeout 保證回到 final value／visible state。
- slide 離開 viewport 後 reset，返回時重播。
- reveal transform 疊加既有 transform，不覆蓋 theme／editor positioning。
- 多選時依 click order 重新編 1..N；單選調序會補齊 gap。
- editor overlay 顯示 order badges；panel 裡獨立 preview，不在 slide 上預覽。
- 沒有數字時 count control disabled 並顯示理由。

狀態：`DOCUMENTED + SOURCE-OBSERVED + NOT-RUN`。

## 9. Live LLM demo

套件附一個 token-counting demo：

- server 讀取 `ANTHROPIC_API_KEY`、repo `.anthropic-key` 或 user home `.anthropic-key`。
- 呼叫 Anthropic `/v1/messages/count_tokens`，不做 completion。
- 比較只有問題與問題加 system/tools manual 的 input tokens。
- breakdown 結果在 server process 內 cache。
- UI 有 live、recorded fallback、request pending/failure 三類狀態；packed deck 使用 recorded values。
- demo DOM 位於 `data-live`，API 結果不寫回 slide source。
- `demo_manual.py` 保存範例 system prompt、tools 與 cost assumptions，避免每份 deck 都內嵌 manual。
- donor 文件記錄曾實測 deferred tool search 在該 manual 上更重，因此刪掉第三條比較 bar。

狀態：`DOCUMENTED + SOURCE-OBSERVED + NOT-RUN`。

## 10. 繁中簡報文案 guidance

`references/slide-copy-zh-tw.md` 提供：

- 投影片與文章不同的壓縮原則。
- 八類投影片 AI 味檢查。
- 標題、bullet、語氣、句型與刪字正向規則。
- 台灣用語與 AdTech 詞彙偏好。
- 單頁交付前 checklist。

Skill 要求 author 在寫中文 deck 前閱讀此文件並使用 zh-TW。

狀態：`DOCUMENTED`。

## 11. 技術棧與 dependency surface

### 11.1 本地技術

- Python 3.10+；作者開發環境稱 Python 3.14。
- editor server 使用 Python stdlib，沒有 web framework。
- frontend 是單一 Vanilla HTML/CSS/JS，沒有 bundler。
- chart renderer 是 Python stdlib SVG string builder。
- pack script 使用 Bash、zip、unzip、awk、cp、mktemp、rm。

### 11.2 Export dependencies

- `fonttools`／`pyftsubset`
- `brotli`
- `curl`
- 本機瀏覽器

### 11.3 Network／secrets

- WenKai font：GitHub release。
- three.js：cdnjs。
- p5.js：cdnjs。
- Vanta：jsDelivr `@latest`。
- CLOUDS2 noise texture：vantajs.com。
- optional Anthropic token-count API。
- 可從 env、repo dotfile、user-home dotfile 讀 Anthropic key。

狀態：`DOCUMENTED + SOURCE-OBSERVED + NOT-RUN`。

## 12. HTTP surface

### GET

- `/`：editor UI。
- `/api/state`：目前 deck、slides、edited state、stamp、root。
- `/api/browse`：root 內 directory browser。
- `/api/stamp`：deck 最新 mtime。
- `/slide/<path>`：slide HTML 與 slide-local assets。
- `/assets/<name>`：deck assets。

### POST

- `/api/save`：以 base mtime conflict gate 保存完整 HTML。
- `/api/open`：切換 slides directory。
- `/api/delete`：移到 trash。
- `/api/restore`：從 trash 復原。
- `/api/count_tokens`：Anthropic token count demo。
- `/api/insert`：複製一頁插入。
- `/api/renumber`：更新 footer page number。
- `/api/rename`：重新命名頁面與 backup。
- `/api/move`：調整頁序。
- `/api/export`：呼叫 packager。
- `/api/vanta`：下載 effect dependencies。
- `/api/upload`：base64 asset upload。

狀態：`SOURCE-OBSERVED + NOT-RUN`。

## 13. 內建 safety／recovery design

- localhost bind。
- file picker root containment。
- slide/asset path traversal checks。
- atomic slide write。
- optimistic concurrency 409。
- first-edit backup。
- trash instead of unlink。
- refuse overwrite new deck。
- strict lint。
- text paste allowlist。
- no modal dialog rule。
- live DOM restoration。
- animation final-state failsafe。
- bounded persisted undo。
- export MIME table。
- external URL detection。
- font role enforcement。

這些是 donor 提供的防線，不代表整體已完成安全審查；缺口另見 `intake-report.md`。

## 14. 授權與 provenance

- donor 自身：MIT，ZIP 內 LICENSE 列 `Copyright (c) 2026 catsmice`。
- Noto Serif TC subset：SIL OFL 1.1，ZIP 含 OFL 全文。
- LXGW WenKai TC：文件宣稱 SIL OFL 1.1，字體在使用時下載。
- FT Visual Vocabulary：文件宣稱 MIT，衍生 chart vocabulary。
- three.js：MIT。
- p5.js：LGPL-2.1；若被內嵌到 deck，分發者承擔相應義務。
- Vanta：NOTICES 要求另看 upstream license。
- README 提到 `ppt-agent-skill` MIT donor，但 ZIP 未含該 snapshot、Git metadata、上游 URL 或版本。

狀態：`DOCUMENTED`; provenance 尚不完整。

## 15. 作者揭露的限制與未完成事項

- 約 25 頁以上時，所有 iframe 同時存在，建議改 lazy `srcdoc` injection。
- scroll navigation 會攔截 wheel，slide 本身不能正常捲動。
- Noto Serif subset 只含常用 CJK，罕用字可能缺字。
- undo memory 完整度高於 sessionStorage；關 tab 後不保留所有歷史。
- sessionStorage per-tab；server restart 必須 reload 同一 tab 才能接回 undo。
- 沒有 layer ordering UI。
- 影片 base64 後可能非常大。
- 每一張使用 Vanta 的頁都各自內嵌約 600KB library。
- interactive slide 必須是 trusted authored HTML。
- live terminal／LLM 不能在完全離線單檔裡運作。
- source snapshot 的 publish checklist 尚未完成 fresh-clone command replay 與私人內容 scan。
- README 描述的 26 styles 來自未隨 ZIP 附上的 `ppt-agent-skill`。
- snapshot 沒有 tests directory，也沒有 CI／release signature／Git commit object。

狀態：`DOCUMENTED`; 本輪沒有重新驗證。

## 16. 文件／實作不一致

1. `EDITOR.md` 說 packed iframe 是 `sandbox="allow-scripts"`、因此是 opaque origin；`build_deck.py` 與 `docs/interactive-slides.md` 實際是 `allow-same-origin allow-scripts`。
2. README 說完整流程先從 `ppt-agent-skill` 的 26 styles 選款，但該資料夾不在 ZIP。
3. Cowork skill pack 的 SKILL 引用多支 Python CLI，pack script 卻只放 SKILL、template、references。
4. README 的 tree 仍提到不同名稱的 starter／font artifacts，實際 ZIP 檔案集合有部分差異。
5. `PUBLISH-CHECKLIST.md` 明示 fresh clone 文件指令尚未逐一重播。

狀態：`DRIFT`。

## 17. 本輪沒有證明的事情

- 沒有證明 editor UI 實際可用或視覺品質。
- 沒有證明 server security。
- 沒有證明所有 export MIME 與離線 reopen。
- 沒有證明字體下載、subset、罕用字 fallback。
- 沒有證明 14 種 Vanta effect。
- 沒有證明 animation、undo、trash、mtime conflict 的 browser journey。
- 沒有證明 Cowork／Claude Code skill workflow。
- 沒有證明 charts 無重疊或所有 vocabulary mapping 正確。
- 沒有證明 LGPL／Vanta／donor provenance 已滿足產品分發要求。

這些項目只能稱為 package capability claim 或 source-observed seam，不能稱 PASS。
