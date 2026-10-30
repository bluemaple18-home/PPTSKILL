# S4-PERF 主線紀錄

Status: REVIEW CANDIDATE；主線驗收已完成，Independent Review pending。
Root question：不隨asset payload長度增加的pointer stale check，是否維持S4 correctness？
Base：S4 independent GO候選05295d3，closure5ae8bb8；S4已關閉，本卡為獨立bounded follow-up。
CodeGraph query createComponentInteraction/mountComponentInteraction/readTarget/fresh只命中旁系deck-spec，依rules降級bounded rg讀runtime/component-interaction.js resolve，確認JSON.stringify(spec)為hot path來源。
Frontier：獨立review新P2有實測；多選/history/motion修復皆不吸收。卡片traces_to已確認存在、無未解blocking decision；採既有editor閉包revision，不新建authority。
Routing：standard、一名native clean Worker Banach、shared sequential code writer；Mainline負責control與baseline診斷、fresh browser/ZIP；context preflight PASS，owner既有委派與Astra替代授權延續。
Baseline：fixed source05295d3，1/6/12MiB JSON p50約0.60/3.41/6.92ms，精確值見baseline-json.json。僅diagnostic，不是browser frame performance；deterministic hot-path gate待Worker。
Validation contract：focused＋non-browser full＋fresh S4雙viewportreal-pointer＋新增stale/performance browser regression＋ZIP lifecycle；未變PGQ authority時引用S4 GO的28unique作繼承，明示非本卡fresh。
Limits：無merge/push/deploy；不開S5；S3 motion P2保留。Worker不得動4既有untracked；先RED再修、freeze後由主線驗收。

Measured boundary：mounted async asset×readonly export測出captured component detached；Mainline允許await後以stable identity重找live target，避免false revision／遺失寫入，範圍已補卡；不擴資產subsystem。

## 最終驗收／裁決

- Worker 8 producer files freeze後主線核對SHA，fresh browser/ZIP後再次8/8一致；verification-source.sha256可重現。
- Focused45/45。Worker subset reporter222包含1個filtered empty-file PASS，主線精確補跑24個ZIP case的reporter51包含27個empty-file PASS。排除這些file-level entries後，完整nonbrowser共245具名case，全部PASS；不能把222＋51當273個測試。明細nonbrowser-coverage.json。
- Worker plan原「Owner禁止ZIP」是對主線分工的誤稱，已更正為Mainline讓Worker不建正式ZIP、自己補跑，並非Owner禁止測試。
- mainline-browser/acceptance.json：1280×720與1600×900，各17項真pointer/portable/stale檢查PASS，含original S4 drag/SE resize/cancel/invalid/noop/preview export/offline reopen與新增readonly/semantic revision路徑。console/page/network/HTTP/remote requests全0，owned targets關閉。主線檢視1280-selected.png，既有selection/toolbar可用。
- worker-after.json：1/6/12MiB各101個mounted updates，payloadReads/serializations/wholeSpecSerializations=0；舊正式RED每20updates為40次。mounted用DOM/vendor double，不是browser frame benchmark；baseline JSON timing與after update timing不能相除宣稱加速倍數。
- distribution-measured.json：ZIP 2,249,243 bytes，SHA-256 eca0af886794934f3d862a9ad0e140226b693e007c361dfc2218fda9ac4dde85，lifecycle/package smoke PASS，Codex/Claude可辨識，Gemini CLI缺席為partial。
- browser-close.json記錄Browser.close已送、socket退出時ErrorEvent；supervisor exit0與exact owned root ENOENT獨立確認，lifecycle-cleanup.json PASS。未碰其他browser。
- 未修改schema/geometry/vendor/QA authority/package；PGQ-WP4 28unique沿S4 Independent GO作繼承證據，本卡未fresh重跑。性能改善只移除pointer hot path成本，commit/export仍可能處理整份資料。
- 舊fingerprint熱路徑已移除，新revision不入portable canonical；Node/browser public API與mounted/real pointer回歸均驗證。無待退場fallback。

停止點：本機review candidate。S4 formal closure在5ae8bb8，本卡待獨立review；S3 motion P2保留。無merge/push/deploy，main仍b43def2，4既有untracked hashes未變，S5未開。

封存處理：兩份RED logs僅去除12行trailing whitespace；worker diff以gzip無損封存保留原始patch bytes。正式source/test、實質失敗內容未改。
