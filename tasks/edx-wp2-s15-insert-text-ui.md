# EDX-WP2-S15 — 安全插入文字 UI

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Base/main/origin-main: 8dcc3a0db58df98e58f717e106d12c2cf1bb7d42（S14 GO已FF/push/readback MATCH）
Branch: codex/edx-wp2-s15-insert-text-ui
traces_to: BACKLOG §10.1 decisions3/7/8、§10.3 WP2、§10.4 insert-element。
Dependencies: S13 text insertion、S14 edit-text、S10 insert image UI均已GO與整合，無未解blocking edge。只開S15；無取代。

## 最小裁決

Measured gap：text已有API insert-element及edit-text，但一般使用者沒有安全新增文字的UI。沿既有native dialog／textarea／button與S13 operation，非新增editor/document model。CodeGraph query未命中相關editor symbols，限域rg確認insertionSlide／refreshSelectedImage／existing dialog與operation seam。少於此仍須API；更多doubleclick contenteditable／文字toolbar／typography／history／AI／auto-layout不吸收。文字插入UI與role文字編輯分開，component仍contentEditable=false。

## 契約

1. layout mode正常slide顯示「插入文字」按鈕；play/edit隱藏或disabled，沒有valid slide不得動作。Native modal dialog有label、textarea、取消／插入與就近status。bootstrap舊HTML補一次markup，remount不duplicate；既有圖片controls保持，雙viewport不clip。
2. Open捕捉當時slide ID，取消active gesture而不commit preview。dialog未成功提交前無canonical／revision變動，取消／Escape／native close清pending與文字並復原合理focus。showModal throw回收pending，能重開。改頁、刪除/重建target、離開layout或selection ownership改變時失效，不得插入錯頁。Native modal focus自身不應被誤當成slide切換；不因focusout就提交。
3. 送出只走executeOperation insert-element精確text variant，沿S13 validateTextValue，1–500 Unicode codepoints、保留空白/non-NFC/換行/HTML-like。不trim/coerce/truncate、不用maxlength=500 UTF16偷縮emoji容量。不允許empty／501；invalid保留輸入供修正，status可見、無partial commit、再送可成功。IME組字中送出與Escape不搶組字；textarea Enter為換行，非提交。CompositionEvent測試誠實標synthetic，不宣稱OS IME。
4. 元件ID在submit以canonical捕捉slide現況找第一個未用inserted-text-N（N>=1，所有component types占用同namespace，holes重用）；不新增counter/registry。native dialog生命期只保存捕捉identity，不serialize整份DeckSpec做stalecheck。missing／duplicate slide/root fail loud；不得默默改成currentSlide或覆蓋同ID。幾何固定{x:560,y:288,width:480,height:320}，新text無extra fields。canonical S13preflight/update保留authority；同步reentrant submit不得doubleinsert。
5. 與S6/S10 chooser互斥；imagePickerOpen/insertionBusy時不能開文字dialog，文字dialog期間不可開image chooser。invalid／cancel不改原selection/canonical（open取消gesture可依既有語意）；成功一次insert revision、cancel/clear走既有S13，不再自行寫components/geometry。原slide/root/其他content/manual overrides不變。Node/public API behavior不改。
6. Native dialog及draft/pending皆editor chrome，不進export。dialog開著匯出不暗中提交draft，export clone無dialog／contenteditable transient。offline重開可再次從UI插入／取消，文字仍可S14 API改、選取move/resize。20MiB既有gate保持，固定geometry不承諾避障／自動縮字。

## Worker write範圍與驗證

允許runtime/deck-editor.js、tests/edx-wp2-s15-insert-text-ui.test.mjs、tools/edx-wp2-s15-browser-cases.mjs、tools/edx-wp1-s4-browser-acceptance.mjs；證明必要才薄擴tools/edx-wp1-s4-perf-mounted.mjs的DOM double以符合native dialog/input行為，不得弱化既有assertions。禁其他runtime/schema/vendor/S13authority、control/evidence/BACKLOG/task、ZIP、AI Core。共享工作樹單一product writer。
真RED→GREEN，scoped明列S15/S14/S13/S10/S6/S1/WP1-S8（先核實實體檔名）。Cases涵mode、empty/noimage slide、open/cancel/Escape、IMEguard、invalid再submit、length/codepoints、不執行HTML、firstfreeID/hole/typecollision、capture跨頁／removed／duplicate root、mode／selection invalidation、double submit、showModal throw、image互斥、gesture、export/draft/remount、舊rootpreserve。執行Node/public mounted，不跑full/browser/ZIP。
新增--insert-text-ui-regression，base10＋S15，asset fixture可沿existing；不要附帶重跑S8/S13 browser。真pointer button/open/submit/cancel與CDP Input.insertText輸入，Escape／Enter真keyboard；IME及故障/target變更可evaluate fixture但分標。雙viewport測首次/再次插入、invalid/500emoji、cancel/Escape/IME、頁/模式失效、holes、preview cancel、export draft不漏/offline再次UIinsert/S14APIedit/真pointermove，toolbar+dialog screenshot各一。records應細分重要claims，console/page/network/HTTP/remote0、targetClosed。

## Mainline／Routing

standard固定UI glue，1 clean native Worker fork_context=false，medium inherited lane（不冒稱未提供低階模型）；主線平行只control/驗收準備。Worker禁止commit/branch/merge/push/deploy/子agent、full/build/probe/browser/Chrome/attach。logs與receipt=/private/tmp/pptskill-s15-*，完成STOP WRITING。Mainline讀diff後跑explicit full nonbrowser＋freshZIP lifecycle／正式host雙viewport＋四支affectedPGQ串行、source/protected4/hash/cleanup；原FAIL保留，同類兩次無進展即停重判。全部通過停Independent Review candidate；新slice未merge/push/deploy、不開S16。

## Mainline bounded repair 1

Full初輪782/789，7fail集中3因：WP1-S3 VM body無insertAdjacentHTML（5）、S7 document pointerdown listener teardown契約（1）、S12 fixture重複toolbar（1）。原Worker同線1次bounded repair，不改canonical authority。優先讓UI bootstrap只在真editor DOM成立、pointerdown綁定專用insert-text按鈕而非新增全域listener；可薄調S15測試路由。追加允許tests/edx-wp2-s12-image-paste.test.mjs僅fixture沿用mounted既有toolbar，既有S12 assertions不得弱化。若需改其他檔先回報；scope不擴。先跑S15 scoped＋這三個受影響檔，不跑full/browser/ZIP；Mainline再次full。原FAIL永久保留nonbrowser-initial-fail.log。

## 驗收交付

Candidate `a181982396eb4f282574f70b93a6c4ef2cfa9c62`；scoped修復252/full789、雙viewport48／48、PGQ單輪16、source/protected/ZIP/cleanup PASS。歷史FAIL完整保留，詳receipt與handoff_20260923_edx_wp2_s15_review.md。未merge/push/deploy S15，未開S16。
