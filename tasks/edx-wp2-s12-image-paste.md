# EDX-WP2-S12 — Clipboard paste-event 單張圖片插入

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Base/main/origin-main: 8b9ee5bceb1ab6d762f3f370f95f9f248943e446（S10/S11 GO已FF並push）
Branch: codex/edx-wp2-s12-image-paste
traces_to: BACKLOG §10.1 decision3圖片clipboard paste、decision2文字/IME、decision7 identity、decision8單一operation；§10.3 WP2；§10.4 insert-element。
Dependencies：S8 canonical insertion／S9 File adapter／S10 chooser／S11 drop皆Independent GO。Measured gap：deck-editor只有style clipboard與drop，沒有image paste事件adapter；CodeGraph回不相關symbol，rg確認。Frontier只選此一條，不加crop/video/group/history。

## 契約

1. document paste薄adapter，只讀事件clipboardData的File，不用navigator.clipboard、execCommand、OS clipboard、permission grant、getData或HTML/URI解析/fetch。事件沒有file（text/html/URI含img/dataURI都算文字）不preventDefault、不讀bytes、不改spec/revision/selection/status。clipboardData null亦不接管；尊重defaultPrevented。
2. 僅layout模式；先保留input/textarea/select/contenteditable/role=textbox所有輸入ownership（event.target與document.activeElement都檢查；contenteditable=false非editable；繼承editable要正確），existing composingText或event.isComposing亦不接管。play/edit/destroy不接管。純文字既有paste保持預設，不做rich-text sanitizer。
3. 合法event範圍：connected本deck.slide子節點採該slide ID；body/document/deck本身與本editor toolbar非輸入control採currentId；其他外部node、detached或另一deck不接管。沿insertionSlide唯一DOM/canonical identity驗證。非法target不讀File bytes、optimizer、不取消gesture。使用事件target不是selection作authority；捕捉接受當刻identity。
4. 合法layout範圍有file transfer時preventDefault；busy或S6/S10 chooser拒絕不清其pending/input/value，不呼叫optimizer。Files.length必須恰1；multi/empty(file marker)顯示「請一次貼上單張圖片。」不截第一張、不items+files重複計數。FileList是唯一File來源（DataTransfer items只用於file marker）；含file＋text/html時只處理File、不讀text。unsupported單檔沿optimizer拒絕一次，無新MIME政策。
5. 接受後沿S10/S11 insertionTarget/insertionOptions，first-free inserted-image-N、560/288/480/320、contain、File.name或空alt。先layout.cancel('image-paste')不commit，select接受slide，沿同一insertionBusy鎖／refresh，await insertImageFile恰一次→S9/S8；finally只釋放自己insertionBusy，不清較晚S6 chooser。不得重寫drop/chooser authority；可必要局部helper重用，但禁止廣泛重構。既有image上paste新增，不替換。
6. async：接受後mode/slide/other edit/export不取消或重新選target；latest其他state保留；targetremoved/IDcollision/optimizerreject/invalid result原子拒絕，無rename/retry/ID占用/partial mutation。busy與drop/insertchooser互斥，原S6policy維持。成功清selection，舊DOM roots保留，一次revision。export不保存paste transient，offline remount只有一次listener，仍可paste。

## 驗收與證據邊界

本Slice驗收範圍是ClipboardEvent File adapter。正式browser使用真DataTransfer+File+new ClipboardEvent('paste')，必須標isTrusted=false，真optimizer decode3×2、canonical/DOM/export/offline閉環；**不宣稱原生OS clipboard或Cmd/Ctrl+V已驗證**，不讀寫Owner系統clipboard。這是開卡前明示的事件入口驗收，不是失敗後切synthetic fallback。Native clipboard user gesture驗收另有環境/授權再評估，不在本卡補造能力。

Worker public mounted RED→GREEN：positive/nested/body/toolbar/current/cross/empty-slide/firstfree/samefile/defaults；negative mode/defaultPrevented/textURI/getData poison/input-active/nestededitable/IME/external/detached/duplicate-ID/multifile/empty/busy/chooser；snapfalse/true active cancellation；async mode/other edit/export/removed/collision/reject/invalid；drop/chooser互斥；export/reparse/remount。保留RED與中間FAIL，舊assertions不放寬。
Worker scoped明列：S12新測試、S11 drop、S10 insert UI、S9 File、S6 image UI、S7 fit、WP2-S1 direct text、WP1 keyboard、S1 export cleanup。只跑明列、不glob/full/browser/ZIP。
Worker新增tools/edx-wp2-s12-browser-cases.mjs＋runner --image-paste-regression；沿既有S10合法三頁fixture。正式路徑先S10 chooser與S11 drop確保互斥回歸，再S12synthetic paste；分開records/isTrusted。雙viewport1280×720/1600×900，新圖與toolbar截圖；errors/HTTP/remote0、targetClosed；capturedtarget、gesturecancel、input/IME、chooser/busy、reject、export/offline真DOM覆蓋。
Mainline Worker STOP後讀diff，focused/full明列nonbrowser、ZIP build/lifecycle/bytesdelta、source/protected/hash，再正式managed host雙viewport與4支affectedPGQ --test-concurrency=1、cleanup。全部過才Independent Review candidate；原OS clipboard未測限制不得隱藏。

## Prior art／最小採用

DIRECT_REUSE：W3C ClipboardEvent/clipboardData/DataTransfer File與內部S9/S10/S11 adapter。2026-09-23核對https://w3c.github.io/clipboard-apis/#clipboard-event-paste、https://html.spec.whatwg.org/multipage/dnd.html#dom-datatransfer-files-dev；事件clipboardData是filtered multipart view，synthetic只帶script給的資料，不等於OS delivery。License/pin/bundle：web原生API無新增vendor，沿現有套件版本；ZIP/inline delta實測。Why custom：僅PPTSKILL target/mode/busy與canonical authority mapping。Why not less：只有drop未滿足Owner paste需求；why not more：不用async clipboard permission或第二套asset pipeline。無取代既有路徑。

## 派工

standard／1 clean native Worker／medium／shared sequential single product writer；Mainline只control與驗收準備。原推薦Terra不在native可用model，本工具要求未經Owner指定不得override，因此繼承主模型、medium、fork_context=false；不額外開Reviewer。1 implementation loop；兩次無進展/contractfork停回主線。Owner外部Independent Review沿既有交接。
允許：runtime/deck-editor.js、tests/edx-wp2-s12-image-paste.test.mjs、tools/edx-wp2-s12-browser-cases.mjs、tools/edx-wp1-s4-browser-acceptance.mjs；mountedhelper只有明示必要且保持舊tests才准小補。禁止其他runtime/schema/vendor/AI Core/protected/control/evidence/branch/commit、full/browser/Chrome/ZIP/build/PGQ、merge/push/deploy/subagent。Report/log：/private/tmp/pptskill-wp2-s12-*。Worker完成STOP WRITING交Mainline。

## Mainline acceptance

Candidate 09c7d29253a5235b12ac58b5fef3f13cd5c70acb；Worker66/scoped236、full712、ZIP lifecycle、1280×720：111 records、1600×900：111 records、PGQ單輪16、managed cleanup/source4/protected4/hash PASS。S12只驗synthetic ClipboardEvent File adapter，不冒稱OSclipboard；詳receipt與review handoff。未merge/push/deploy S12，未開S13。

## Closure

Owner交回Independent Review GO，reviewed09c7d29253a5235b12ac58b5fef3f13cd5c70acb，P0–P3全0。Reviewer fresh236/712；browser111+111與PGQ16為committed evidence核對。Mainline source4/protected4/ZIP與delivery無drift再核對一致。synthetic paste adapter／OS clipboard未驗邊界維持；詳evidence/edx-wp2-s12/independent-review.md。Reviewed code/ZIP不改；未merge/push/deploy，未開S13。
