# EDX-WP1-S5 — 單一 component 鍵盤微調

Status: REPAIR CANDIDATE — targeted Independent re-review pending
Base: `d2bd314`（S3-MOTION closure）；branch `codex/edx-wp1-s5`。
traces_to: BACKLOG.md §10.2 donor arrow nudge、§10.3 WP1 guided direct manipulation、§10.4 shared Operation Registry、§10.5 portability。
類型：standard bounded；一名clean native Worker，shared sequential writer；Mainline負責control與fresh browser/ZIP，Owner自行帶候選做獨立review。沿既有Astra替代授權，不更動主對話模型。

## 目標／frontier

S3/S4/S4-PERF/S3-MOTION均Independent GO，所需stable identity、operation、selection、geometry與motion契約已具備。增加單一component鍵盤微調，使用同一move-element authority；不新增schema/operation/dependency/history/multiselect/Selecto/AI。
why_not_less：現有keydown只有Escape，無keyboard geometry入口。why_not_more：沿既有selected target＋bounded operation即可，無需新input subsystem。無取代；現有pointer與播放翻頁仍保留。
CodeGraph query未命中interaction，Mainline已bounded rg核對component-interaction.js keydown與deck.js Arrow翻頁（capture必須在已處理時阻止bubble）。

## 操作契約

- 版面模式、已選取且已初始化geometry的單一component：ArrowLeft/Right/Up/Down每keydown按canonical 1px；Shift為10px，與viewport zoom無關。每個可接受keydown最多一筆move-element，repeat亦逐筆處理，沒有history/coalescing宣稱。
- payload只改x/y；尺寸、content、motion與其他slide不變；既有canonical validator控制safe area，越界拒絕原子保留，不clamp、不偷偷初始化legacy geometry。
- 不處理Ctrl/Meta/Alt、IME（isComposing／keyCode229與必要composition狀態）、input/textarea/select/contenteditable/role textbox以及editor chrome focus；保留它們的預設鍵盤行為。
- 有pointer gesture時不插入keyboard mutation；對版面選取的方向鍵保持不翻頁，不能完成或取消成另一筆意外提交。無mode／無selection／無geometry／非目標鍵不得寫spec；播放模式翻頁保持。stale/deleted target不得沿陳舊identity寫入。
- handled方向鍵（含越界拒絕）阻止預設與後續播放翻頁；未處理的輸入不攔截。成功與拒絕有既有status提示，UI文字可提示方向鍵操作。
- 不增加永久tabindex/editor attribute進export。若真browser證明selection後focus不可用，才作最小focus修正並驗證清理；不得先假設需新focus層。
- teardown移除新增listeners；export/reopen維持canonical位置、無selection/editor state洩漏；S3-MOTION修復保留。

## 驗收／證據

- public/mounted keyboard RED→GREEN；方向/Shift/repeat、guard矩陣、bounds、deleted target、gesture互斥、operation次數與portable roundtrip。
- focused S3/S4/perf/motion/S5，non-browser full具名cases；source SHA、diff check。Worker只跑focused與記exact command；Mainline接手全套，避免重複。
- 提供attach-only browser工具，沿既有S4 harness新增--keyboard-regression或等價bounded cases；真Input.dispatchKeyEvent、雙viewport1px/10px相同canonical delta、bounds、輸入/IME/修飾鍵/gestureguards、非layout不nudge、export/offline reopen；console/page/network/HTTP/remote=0，finally僅清自己的target。
- Mainline fresh browser按suite順序執行，禁止PGQ與motion共用browser並行；freeze後fresh ZIP/lifecycle及source複驗。未改geometry/motion/QA authority時沿S3-MOTION已review的PGQ28 unique作繼承、不冒稱本卡fresh；若觸及那些seam再重判。

## 改檔／禁止／停止點

Worker可改runtime/component-interaction.js、必要keyboard協調（須先證明）與tests/tools對應檔，evidence/edx-wp1-s5/worker-*；不改task/backlog、dist或原四untracked，不commit、不開agent。主線期間不平行寫repo，只唯讀準備驗收，Worker freeze後接手。
不用新的可見task、不代傳review、不merge/push/deploy。兩次同類無進展附證據停回主線。完成停獨立review candidate，未達驗收不得宣稱GO。

## 本輪 checkpoint

Mainline 接手完成實作；focused 70/70、non-browser 259/259、ZIP lifecycle PASS。受管 browser 啟動因 scan limit 退出2，未完成 attach，故無 fresh browser 結論、尚非 review candidate。詳見 `evidence/edx-wp1-s5/mainline-receipt.md`。deck.js 翻頁屬另一 legacy renderer；本卡僅驗證 handled key 攔截，不宣稱 full-deck 存在該翻頁功能。

## 最終驗收

真 browser 發現點選元件後仍有 toolbar focus，已依本卡條款只在明確選取元件時 blur editor chrome，不增 tabindex；保留直接操作 chrome 的鍵盤避讓。focused 71/71、non-browser 260/260、fresh 雙 viewport 各19 checks、ZIP lifecycle PASS；正常 browser cleanup PASS。舊失敗證據保留，詳見 receipt；PGQ 僅 inherited，未重跑。

## Independent NO-GO / bounded repair

Reviewer 核對 `be7b0bddad3d96384d3a17fe9e1f47349161826c`：P0/P1/P3=0，P2=1；Escape 先於 IME/modifier/input guard，會攔截並清 selection。主線接受，限定移動 guard 順序與 guarded-Escape regression，普通 Escape pointer cancel 須保留；更新 ZIP 與 source evidence 後 targeted re-review。無其他 scope；Mainline 直接執行此 minimal bounded repair。

修復驗收：73 focused／262 non-browser PASS；fresh browser雙viewport各20 checks PASS，ZIP/cleanup PASS。最終證據：`evidence/edx-wp1-s5/repair-escape/receipt.md`。
