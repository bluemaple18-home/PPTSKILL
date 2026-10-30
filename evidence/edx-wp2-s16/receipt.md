# WP2-S16 Mainline receipt

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Product candidate: f5db0c03b61bbcbb2285f95562d8a3ef986a9ee0
Branch: codex/edx-wp2-s16-edit-text-ui
Base/main/origin-main: 3cebfafddcbd070d28fae23de24e52a88163b778（S15 Independent GO已FF/push/readback MATCH）。S16未merge/push/deploy，未開S17。

## 交付與authority

Layout單選canonical type=text時顯示「編輯所選文字」，同S15 native dialog預填草稿，submit只走S14 edit-text。原component DOM不直接contenteditable，role文字UI不改。單一pending/busy/dialog ownership；capture slide/element/root/node/原文字，拒絕stale／lost update，geometry更新保留。原S15插入模式還原、image chooser互斥、IME guard、showModal failure、no-op、重入、exportdraft/offline均驗。
Snap-on最初會因cancel('edit-text')清selection而拒絕正常submit，已改兩處沿既有picker cancellation，未改component-interaction或S14 writer。snap=false/true × gesture=false/true四regression及雙viewport真pointer均通過。

## Fresh Mainline evidence

- Scoped 260/260（9個實體test files，scoped-files.txt與scoped-snap-repair.log）。S16其中32/32。
- Full nonbrowser 821/821（73 explicit files，nonbrowser-files.txt／nonbrowser-summary.json／nonbrowser.log），無filtered-empty-file假計數。
- Fresh build/probe ZIP lifecycle PASS；ZIP 2298511 bytes（比S15+742），SHA256 `a26d5bc80044afb2c2cd9c00eb31b715d38fdf704846b9670761e1a404d101bd`。
- Formal host browser：1280×720、1600×900各42 records（base10＋S16 32），errors0、targetClosed。最終host-snap-repair/edit-text-ui/acceptance.json。
- PGQ最終單輪16/16 unique named，四檔串行--test-concurrency=1；前輪中止不混算。
- Managed readiness/Browser.close/supervisor exit0、exactownedroot與marker absent。Source4/protected4/ZIP前後MATCH，ZIP內runtime byte-match；host-final-verification.json。
- 兩viewport toolbar/dialog共4 PNG Mainline直接檢視，無clipping；visual-check.md。

## 歷史與執行偏差

原Worker因runtime usage limit中止，主線回收其runtime/tests與28/28 GREEN，再續harness/驗收；不宣稱Worker交付完整。原RED與中間attempt不覆寫。
初版f07bcad fresh256/817/ZIP PASS；首輪browser1280過35records，synthetic .click跳過pointerdown的gesture open assertion FAIL。Harness-only9c2d485改真pointer後雙viewport39 PASS；首輪沒有完整event-path，不能把vendor blocker說成已live直接觀測。
主線另以mounted probe發現snap-on真產品缺口，精確SIGINT停止當輪PGQ，Browser.close／supervisor／ownedroot／marker回收PASS，host-pointer-retry controller為NOT_PASS，不能算PGQ成功。
新snap regression RED28/32含兩個snap-on dialog失敗與兩個VM Array compare fixture失敗。Runtime兩處修正後scoped256/260、full817/821仍因同一VM Array prototype assertion失敗；Array.from同realm ID比較修正後260/821。首個scoped shell被尾隨diff-check掩蓋exit，主線誤啟一次full；該full自身exit1停，未build或host。FAIL logs保留，raw-log-hashes.json記原始gzip hashes。
最後f5db0c0才具本輪fresh260/821/ZIP/42+42/PGQ16全鏈路。

## 限制

Context dialog編輯並非direct inline/dblclick/contenteditable；IME只synthetic CompositionEvent，非原生OS輸入。CDP chooser不是人工OS dialog；其cancel fixture明列synthetic。固定geometry無自動縮字／避障。S8歷史I/O根因未知，S16成功不宣稱修復環境。

## 重現

以scoped-files.txt或nonbrowser-files.txt列出的檔案直接給node --test，不用test-name-pattern空檔計數；Node / pnpm採既有toolchain。Formalbrowser需合法managedhost且source-hashes freeze，沿host-controller-snap-repair.py；sandbox不可unset旗標或裸啟Chrome。

Mainline驗收不是Independent GO；下一步只交獨立Reviewer，無P0/P1後才closure/整合。
