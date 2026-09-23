# EDX-WP2-S16 — 已選文字元件編輯 UI

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Base/main/origin-main: 3cebfafddcbd070d28fae23de24e52a88163b778
Branch: codex/edx-wp2-s16-edit-text-ui
traces_to: BACKLOG §10.1 decisions2/7/8、§10.3 WP2、§10.4 edit-text。
Blocking edges: S14 edit-text、S15 native text dialog已GO並整合；frontier清空。無取代；S15插入功能仍存在。

## 最小裁決

Measured gap：已插入text component只有API可修改文字，一般使用者無UI。沿S15 native dialog加「編輯所選文字」context action，以S14 edit-text提交。CodeGraph query未命中相關symbols，限域rg核對deck-editor的refreshSelectedImage、pendingTextInsertion、submitInsertText及editComponentText。少於此仍須API；更多direct contenteditable/dblclick/typography/history/AI/auto-layout不吸收。本Slice是context dialog edit，不能宣稱完成direct inline editing。
Prior Art：S15 native HTML dialog/textarea + S14 operation；DIRECT_REUSE，瀏覽器原生與repo自有code，無新增license/vendor/version依賴，portable增量由freshZIP量測。Why Custom僅selected-target與operation薄mapping，不造通用editor primitive。
Visual Route：沿S15既有toolbar與modal、原字體/色彩/spacing；僅單選type=text時顯示「編輯所選文字」，同一dialog按mode顯示「編輯文字／儲存」或原「插入文字／插入」，有label/textarea/取消/status。雙viewport檢查toolbar/dialog clipping、focus與keyboard。無新增動效材料。

## 契約

1. layout且唯一單選current slide canonical type=text才顯示enabled edit action。role title/subtitle、quote/image、多選、空選擇、play/edit mode不得誤開。原insert/image controls維持。dialog必須共用S15 native primitive，不能另造draft registry/writer。bootstrap/remount不duplicate。
2. Open捕捉slide ID、element ID、唯一connected slide root與text node、原canonical text；取消active gesture且不commit preview。textarea預填原文（換行/空白/emoji/non-NFC/HTML-like原樣），draft只在UI；component DOM與canonical在submit前不變。不得轉為contenteditable。取消/Escape/native close清pending/draft並合理restore focus。
3. Submit只走既有executeOperation({operation:'edit-text',target:{slideId,elementId},value})；禁止改S14或S13writer。1–500Unicode codepoints、no trim/coerce/truncate；invalid保留draft/status零partial commit，可修正再送。same value沿S14 no-op revision/DOM/selection语義。success只一次operation，除目標text外其他canonical/geometry/typography/motion/root/node identity不變；選取清理沿S14。
4. Capture必須避免lost update／wrong target：頁/root/node被換、selection identity變動、mode離開layout、target刪除／重建／type變動／duplicate identity、原canonical text被另一operation改掉都不得把舊draft寫回或改current target；不serialize整份spec做stalecheck。submit前再次驗target/root/node/current text。失效close並顯示就近status，可重新開啟。不要求ABA text-version registry。未相關geometry更新不應被dialog改掉。
5. 沿同一S15 pending/busy/IME ownership與S6/S10 picker互斥；insert與edit不得重入／巢狀dialog。showModal throw回收，retry可開；同步reentrant submit不doublecommit。IME組字中submit/Escape不搶組字；textarea Enter為換行，不是submit。S1 role direct editing及S15insert仍原契約。CompositionEvent標synthetic，不宣稱OS IME。
6. export draft不commit、clone無editor dialog，offline重開可UI edit已保存component；cancel/export不漏draft。API-only VM與既有listener teardown契約保持。固定geometry不auto-fit/避障；20MiB gate不變。

## Worker 範圍

允許runtime/deck-editor.js、tests/edx-wp2-s16-edit-text-ui.test.mjs、tools/edx-wp2-s16-browser-cases.mjs、tools/edx-wp1-s4-browser-acceptance.mjs。必要薄擴tools/edx-wp1-s4-perf-mounted.mjs的native dialog DOM double；不得弱化既有assertions。禁止其他runtime/S14authority/schema/vendor/control/evidence/BACKLOG/task/ZIP/AI Core。共享工作樹單一product writer；Mainline只寫control與驗收準備。
Worker先行真RED→GREEN，scoped明列S16/S15/S14/S13/S10/S6/S1/S12/WP1S7（先核對實體檔名）；不要full/build/ZIP/browser/Chrome。涵顯示條件、預填、save/cancel/noop/invalid/501/500emoji/HTML-like、capture/duplicate/stale canonical/node/removed/mode/selection、IME/Enter、showModal、reentry、picker互斥、gesture/export/offline/remount、insert→edit→insert模式復原。
新增--edit-text-ui-regression，base10+S16、asset fixture，禁止順便fanout所有旧cases。Browser真pointer選text/open/save/cancel、Input.insertText、keyboard Escape/Enter；fixture初始text可S13 API建立，之後編輯必須UI。取證single-selection、prefill、unchanged DOM draft、save preservation、no-op、cancel/Escape、invalid/retry、500emoji、IME synthetic、stale mode/slide/API update/target removal、同dialoginsert模式還原、gesture cancel、export draft/offline再edit；toolbar/dialog各screenshot。初始化fixture geometry符合safearea80/minsize80。真pointer的canonical delta選40（1280為32px／1600為40px），記trusted input。Browser records分清trusted/synthetic，不虛報OS能力。

## Mainline／Routing／停止點

standard既有primitive/operation的UI glue，1 clean native Worker fork_context=false、medium inherited model（runtime無較低模型lane，不冒稱Terra），無Reviewer fanout。Mainline驗diff、explicit full nonbrowser、freshZIP lifecycle、正式managed host雙viewport1280×720/1600×900與四支affectedPGQ串行、source/protected4/hash/cleanup。原FAIL保留，同類兩次無進展停重判；新candidate未獨立review前不merge/push/deploy，不開S17。目前外部write授權只涵已GO S15整合。

Visual clarification：Mainline實看S15 1280 toolbar截圖，既有role action已叫「編輯文字」；新selected component action固定「編輯所選文字」，dialog仍「編輯文字／儲存」，避免相同toolbar label混淆。

## Routing continuation

原Worker因runtime usage limit終止（不是product failure），已close。Owner再次明示繼續；Mainline回收其28/28 unit與partial runtime，同一卡接續剩餘harness／驗收。未開第二Worker或Repair generation，原FAIL保留。

## Mainline acceptance

Candidate f5db0c03b61bbcbb2285f95562d8a3ef986a9ee0；fresh scoped260/full821/ZIP、雙viewport42+42、PGQ單輪16、source4/protected4/cleanup PASS；首輪FAIL、中止及snap修復證據完整保留。詳evidence/edx-wp2-s16/receipt.md及handoff_20260923_edx_wp2_s16_review.md。S16未merge/push/deploy，未開S17。

## Independent Review closure

Owner交回GO，reviewed f5db0c03b61bbcbb2285f95562d8a3ef986a9ee0，P0–P3全0；Reviewer fresh260/821，browser42+42與PGQ16為committed evidence核對。詳evidence/edx-wp2-s16/independent-review.md。Owner僅授權整合推送，完成停止，不開S17。
