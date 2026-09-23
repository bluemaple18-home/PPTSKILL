# EDX-WP2-S14 — API-driven 文字元件 edit-text

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Base/main/origin-main: b08c4d34cb7ff950a6bf0ab70f4fe172f270f186（S13 GO closure已FF/push/readback MATCH）
Branch: codex/edx-wp2-s14-edit-text-component
traces_to: BACKLOG §10.1 decisions2/3/7/8、§10.3 WP2、§10.4 edit-text。
Dependencies: S13 text insertion、WP1-S2 stable identity、WP2-S1 role direct text已GO，無未解blocking edge。只開S14，不開S15。

## 裁決與邊界

Measured gap：S13新增text後，descriptor與Node/browser edit-text仍排除component；只能走舊component JSON patch，沒有stable-ID同一operation路徑。CodeGraph未命中相關symbol，限域rg確認deck-editor.js角色allowlist與component geometry分支。最小增量為existing edit-text的text-component variant，不新增operation/writer/registry。少於此無法供後續文字UI共用canonical seam；更多UI/contenteditable/雙擊/IME adapter/typography/group/history本輪不吸收。無取代舊renderer或JSON editor；不擴arbitrary patch。

## 契約

1. Node／portable公開executeOperation：`{operation:'edit-text',target:{slideId,elementId},value:string}`。existing role title/subtitle/keyPoint路徑與值政策不改；component只允許canonical type=text，新舊元件皆可、無需geometry。image/citation/table/chart/missing target明確拒絕，不轉型。descriptor允許component但文字說明／preserves應正確表達只改text欄位，不再宣稱整個components永遠不變。不能靠mutated public descriptor擴authority。
2. text-component value沿S13同一1–500 Unicode code points語意，保留non-NFC/空白/換行/HTML-like、不trim/truncate/coerce。最少helper共享S13 validator（可在existing image-insertion contract暴露局部validator），不得第二套text政策。edit-text envelope/target精確plain/null-proto/crossrealm data-descriptor，getter0、unknown/symbol/hidden/非法prototype拒絕；S9image/File nonenumerable舊契約不變。subtitle既有空字串及role字長規則不收緊。
3. stable pair指定slide與allocated elementId，不用current selection作authority；long-ID/hash collision、同component ID不同頁、reorder後一致。保留id/type/membership、其他components/其他頁、geometry/typography/motion/background/style/slots/order。canonical與DOM正文escape、不得建立script/img/a；沿existing text renderer的視覺樣式。Node/portable descriptor一致。
4. portable先validate candidate與目標唯一connected slide/root/text node，elementId與canonical text/edit-target一致；missing/duplicate/detached/mismatched DOM、清理驗證/DOM projection throw皆不得partial canonical/DOM/revision/selection/gesture mutation。以in-place純文字project保留既有root identity，成功後一次revision；相同value為no-op、不改DOM/revision/gesture/selection。DOM setter先改再throw亦需rollback。
5. 成功實質修改後取消active drag/resize preview不commit、清selection；mode/current slide不變，舊geometry/其他DOM roots保留。invalid/noop不能cancel gesture。composingText存在時component edit-text拒絕，沿S1 composition guard，role既有未sync DOM text不由此API偷偷提交/洗掉。
6. S1 direct-text UI仍只title/subtitle/keyPoint；component仍contentEditable=false，沒有新雙擊／toolbar／IME能力。現有S1 tests的UI排除維持。S13原插入/不可directeditable assertions維持；只有舊WP1-S2「API不允許任何component」assertion依新契約改成text正向＋nontext負向，不弱化其他拒絕。
7. export/offline reopen全文、stable ID、manual geometry與原內容保持，可再edit/insert/move；edit transient不進export，沿既有20MiB gate。API-driven，不宣稱原生OS輸入／clipboard；固定geometry非自動縮字／避障。

## 實作與驗收

允許Worker：runtime/deck-editor.js、runtime/image-insertion.js、tests/edx-wp2-s14-edit-text-component.test.mjs、tests/edx-wp1-s2-stable-identity-operation-path.test.mjs（只intentional API契約assertions）、tools/edx-wp2-s14-browser-cases.mjs、tools/edx-wp1-s4-browser-acceptance.mjs。若其他實體test有舊API排除需附path/line回Mainline裁決；無關UI不得改。Mainline owns docs/evidence/ZIP。
先真RED再minimalGREEN。Fresh scoped:S14/S13/S8/S9/S1/WP1-S2六檔（實體明列）；全量=既有70 explicit non-browser＋S14。跨realm/malformed/getter0、length、同值no-op、type拒絕、跨頁長ID、DOM failure rollback、gesture snap false/true drag/resize、IME拒絕與role legacy皆有測試。
Browser flag --edit-text-component-regression：既有base＋S13（含S8）＋S14雙viewport1280×720/1600×900。API更新existing及new/cross-slide text、escaped text、invalid/noop、真pointer gesture途中edit取消、原幾何不提交、element identity保留、export offline reedit、component不可directeditable。event/fixture與真pointer/keyboard分清楚，errors0、targetClosed、兩張UI截图實檢。
PGQ四支content-integrity/sample-approval/full-deck-qa/required-visibility串行--test-concurrency=1，16unique；freshbuild/ZIP lifecycle/source/protected/ZIP/cleanup/diffcheck。FAIL保留，先定位再裁決，不盲retry；無host停HOST_BROWSER_PENDING，不unset sandbox/裸開Chrome。預期只受此slice影響的路徑，不額外fanout。

## Routing／交付

標準bounded extension，單一clean native Worker fork_context=false、medium inherited model（工具無指定低階lane，不冒稱Terra）；shared sequential product writer。Mainline同步備驗收/control，不平行改product。Worker只scoped，不跑browser/PGQ/full/ZIP、不commit/merge/push/deploy/子agent。同類兩次無進展停、Repair2回Owner成本裁決。最後停review candidate，不把Mainline驗收稱IndependentGO。回退可revertS14 commits，S13主線不改寫。

## 驗收交付

Candidate `e595b84638da36fc73c2e6c7cc31ff1f05f57962`；scoped122/full763、雙viewport各69、PGQ單輪16、source6/protected4/ZIP/cleanup PASS。首輪fixture FAIL與harness-only修復完整保留。詳evidence/edx-wp2-s14/receipt.md與handoff_20260923_edx_wp2_s14_review.md。尚非Independent GO；未merge/push/deploy、未開S15。
