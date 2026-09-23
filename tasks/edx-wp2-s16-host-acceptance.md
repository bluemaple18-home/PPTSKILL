# WP2-S16 Host acceptance

Status: PASS / INDEPENDENT_REVIEW_PENDING
Parent: tasks/edx-wp2-s16-edit-text-ui.md
Product: f5db0c03b61bbcbb2285f95562d8a3ef986a9ee0
Type: evidence-first browser acceptance；scope已選text component的dialog UI，非direct inline／native OS IME／auto-layout。

前置：正式AI Core managed host且actual CODEX_SANDBOX空；禁止unset或修改capacity/Rule24/readiness。12秒logical-line parser。source/protected4/ZIP freeze；host controller只屬本輪ownedroot，既有其他browser不碰。沿Foundation admission、runtime monitor及managed teardown；所有FAIL原樣保存。
步驟：掛listeners先於navigate；--edit-text-ui-regression，1280×720／1600×900依序，base10＋S16。真pointer選取/open/save/cancel與CDP輸入；invalid/noop/stale/IMEguard/chooser/gesture/exportdraft/offlineedit/insert模式復原按parent契約。Synthetic故障／CompositionEvent獨立標示。toolbar/dialog截圖實檢，不替代console/page/network/http/remote runtime records。
再跑四支affected PGQ content-integrity/sample-approval/full-deck-qa/required-visibility，--test-concurrency=1串行，預期16個unique named。若targeted失敗即停止PGQ，不盲retry。
成功：兩viewport所有claim PASS、errors0、targetClosed；PGQ單輪16；readiness/Browser.close/supervisor exit0，exactownedroot/marker不存在；sources/protected/ZIP前後一致。證據evidence/edx-wp2-s16/host-acceptance、source-hashes.json、host-final-verification.json。
失敗：無合法host為HOST_BROWSER_PENDING，非產品FAIL；同類兩次無進展回主線重判，第三次不得再試。不得將projection或前輪evidence寫成本輪fresh。完成停Independent Review pending，不merge/push/deploy S16，不開S17。
回報：product SHA、focused/full/ZIP/雙viewport/PGQ/cleanup，區分fresh與inherited、歷史FAIL、限制與remaining blocker。

最終證據：host-snap-repair；雙viewport42/42、PGQ16、cleanup/source/protected/ZIP PASS。host-acceptance FAIL與host-pointer-retry主線中止NOT_PASS仍保留，詳host-triage.md。
