# WP2-S5 — explicit target image file adapter

Status: IN_PROGRESS
Base: 20c93125edc396513d36324b03e4137c56fdcf4f（S4已merge/push）
Branch: codex/edx-wp2-s5-targeted-image-file
traces_to: BACKLOG.md §10.1 decisions3/7/8、§10.3 WP2、§10.4 replace-asset。

## Measured gap / minimum

S4 replace-asset registry可指定第二image，但replaceImageFile只找currentSlide第一image，實際File最佳化不能明確投遞另一image。沿既有adapter加optional target，為後續選取UI提供必要seam；不開selection UI、drop/paste/crop/insert/dependency/schema。PriorArt DIRECT_REUSE既有PPTSKILLAssets與S4operation；CUSTOM_DELTA只stable target adapter。License/pin沿本repo20c9312、無vendor引入；量測ZIP差額。Why not less：直接registry dataUri繞過File optimizer。Why not more：本輪只adapter，不新增UI/authority/queue。舊單參數API保留、無移除。

## Contract

`replaceImageFile(file, target?)`：未提供target沿原current slide first image。明示target必須exact own-data plain/null-proto `{slideId,elementId}`，合法stable existing image，拒extra/getter/inherited/symbol/foreign/nonimage。驗證在optimizeFile之前，不讀invalid target getter、不得呼叫optimizer。傳undefined相容省略；null invalid。沒有file維持原return null語意。明示target可指另一slide/image，不依current selection。

呼叫時snapshot target值而非caller引用；pending期間caller改target/切頁/export換object不改目的地。完成時確認captured stable image仍存在，使用既有replace-asset operation提交；missing/type改變拒絕，optimizer reject/invalid output不得部分commit。alt/fit/geometry/motion/typography/content其他欄不改。保留result/warnings回傳、same-value no revision/gesture stale既有契約；不增加wholeSpec掃描／serialization在pointer update。不要引入revision registry/新的selection authority。允許helper最小共用驗證，不能兩套mutation。

既有file-input仍單參數相容，不改DOM UI。Node registry/replaceImage contract不變。明確target admission與完成時validation沿既有assets policy，不放寬size gate。

## Acceptance / split

一個true RED先行，再最小實作；mounted targeted驗第二image/跨slide/default/explicit undefined/null/strict/getter0+optimizer0、caller target mutation、async export/switch/missing/type-change/reject/invalid output/noop revision/geometry preservation與export roundtrip；跑既有S4/perf/asset tests。Worker只runtime/tests/tools，single writer；不commit/branch/browser/ZIP/control/evidence/protected。

新增 `--targeted-image-file-regression`，沿existing runner base10pointer+S4fixture rendered image。真browser以File+真optimizer指定第二image，延遲結果前切頁/export/caller target改動仍correct；default第一image相容、invalid admission optimizer0、live DOM decode/alt/fit/geometry、export/offline。API-driven，不宣稱native file picker/OS clipboard。1280→1600，errors0/targetClosed；Mainline正式受管host後四支PGQ串行、ZIP/build/probe/hash/full nonbrowser。

Worker禁止tests/*.test.mjs！只列明targeted檔；full/ZIP/browser由Mainline使用已知selection。歷史S4誤跑不得重演。先CodeGraph，無關fallback rg；讀source<=2000tokens；source decision前讀卡/rules05。原4protected保持hash。節省standard1worker/clean/medium/shared sequential，無fanout；不merge/push/deploy/下一Slice，停Independent Review candidate。同blocker兩次無進展停triage，失敗log保留。
