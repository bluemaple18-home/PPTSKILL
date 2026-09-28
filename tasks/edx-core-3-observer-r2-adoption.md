# Core3 observer R2：AI Core canonical 採用裁決

Status：`CANONICAL_INTEGRATED_VERIFIED / DECISION_COMPLETE / CORE3_ACCEPTANCE_PENDING`。

目標：對固定 R2 候選作出可執行的 canonical 採用裁決，交回明確的 GO／HOLD／NO-GO 與整合、回退、驗證邊界。此卡完成代表裁決完成，不代表 canonical 已啟用或 Core3 已驗收。

Owner 於 2026-09-28 指示「開卡吧」；本輪只建立任務卡。Mainline 仍由本 Codex task 負責，未另建 task、未轉交完整專案責任。此卡不授權 merge／push／activation／deploy／browser／PGQ。

## 固定輸入與依賴

- traces_to：`evidence/edx-core-3-undo-redo/observer-r2-preflight-contract-20260928.md` 的「不可退讓 invariants」及「開工與停止條件」；原 spec 無 US/FR 編號，不新增第二套 registry。
- 基線：AI Core canonical `c23e46555b73a29f16319c657622acb1acc51e7a`。
- 候選：`4edd0747a25b13920b3ab1ead99895a99dbe8964`；僅 scanner/tests/docs 三檔，從 canonical 建立，未疊 R1。
- scanner SHA256：`0e411a0c970ae17f9fac805b5d3010ebc0742a5b6b774eb15b8c06137ffe8edf`。
- 候選所在：`<workspace-root>/.work/ai-core-observer-r2-20260928`；可攜 artifact：`evidence/edx-core-3-undo-redo/observer-r2-candidate.bundle`，需要上述 base，另有 `.patch.gz`。
- 已完成：33/33 scanner、14/14 harness；兩名獨立 review 與窄複核 GO，B-01 errno 留證缺口 CLOSED。
- 已完成單次 managed host smoke：7 次完整 runtime scan、Browser.close／supervisor exit0、cleanup/root/marker/PID 核對完成。**RECOVERY_NOT_OBSERVED**；不得寫成真 host 重播 ENOENT 已修復。
- 證據 checkpoint：PPTSKILL `3545308`；完整入口 `evidence/edx-core-3-undo-redo/host-smoke-r2/mainline-receipt.md`。

本卡 frontier：上述離線與單次 host 證據已齊，可立即開始唯讀採用評估。canonical 實際整合尚未執行；Core3 雙 viewport／四支 affected PGQ 仍由「canonical 採用及身分驗證完成」阻擋，不得先跑。

## 工作範圍

1. 唯讀核對執行當下 canonical HEAD、工作樹、候選 commit／bundle／三檔 hashes 與保存證據。canonical 若偏離 base，列出實際衝突及受影響契約，先 HOLD；不得自動 cherry-pick、merge 或重做 R2。
2. 明確裁決：既有「非原子取樣」保證、離線 ENOENT 反例與本次 host smoke，是否足以採用此固定候選。保留短命 entry 盲區與未自然觸發 recovery 的限制；不得藉等待真 race 額外重跑 smoke。
3. 給出具體整合與回退方案：哪些檔案／Git ref 會改、使用哪個既有整合接點、如何保存整合前 HEAD／dirty 狀態，以及回退後如何核對 scanner identity。禁止 destructive reset、clean 或覆蓋他人未提交檔；不在本卡實際執行。
4. 列出採用後最小驗證：canonical 實際載入的 scanner 與 reviewed bytes 一致、直接 scanner 回歸符合原契約、launcher/policy/sensor 未漂移、產品／ZIP／protected 未變。原測試身分仍相符時引用既有證據，不為裁決重跑全 suite。
5. 交回採用 decision receipt；若建議採用，明列待執行的 canonical 整合與驗證，不能把「GO 建議」標成「已採用」。真正採用完成後，才交回既有 Core3 host-evaluation 卡接續產品驗收。

允許寫入只限本卡狀態及 `evidence/edx-core-3-undo-redo/observer-r2-adoption-decision.md`；不得改 AI Core delivery、產品或歷史 raw evidence。這是 bounded control artifact，由 Mainline 直接處理，不預設新增 Worker／Reviewer。

## 驗收與停止條件

- Receipt 有 GO／HOLD／NO-GO、固定候選與實測 canonical 身分、理由、證據引用、未驗證項、具體整合／回退／驗證方案及交回條件。
- 清楚區分四個狀態：採用建議、canonical 已整合、host applicability、Core3 產品驗收；不得互相替代。
- 舊 R1 `8e60945` 繼續保留 rejected-for-host 歷史，不再補洞；R2 不改 deadline／累計 entries／sticky exceeded／cleanup-general／special allowlist。
- 不要求新增第三輪 smoke，不因 RECOVERY_NOT_OBSERVED 自動退回重跑。若證據不足，只列出具體缺口並 HOLD。
- R2 唯一 smoke 已用完；若後續出現新的 scanner observation contract 失敗，停止 scanner patch 線，回 observation primitive／runtime resource-control 層裁決，不自動 R3。
- 驗證卡片引用及 `git diff --check`；純控制文件無需新增程式測試。

## 主要證據

- `tasks/edx-core-3-observer-r2.md`
- `tasks/edx-core-3-observer-host-evaluation.md`
- `evidence/edx-core-3-undo-redo/host-smoke-r2/mainline-decision.json`
- `evidence/edx-core-3-undo-redo/host-smoke-r2/mainline-verification.json`
- `evidence/edx-core-3-undo-redo/observer-r2-review-a.md`、`observer-r2-review-a-recheck.md`
- `evidence/edx-core-3-undo-redo/observer-r2-review-b.md`、`observer-r2-review-b-recheck.md`

回交：本卡裁決完成後，下一個 frontier 是已獲授權的 canonical 整合；整合及身分驗證完成，才解鎖 Core3 既有雙 viewport／affected PGQ。未啟用前維持 `CANONICAL_ADOPTION_PENDING / CORE3_ACCEPTANCE_PENDING`。

## 2026-09-28 整合實測

Owner 明示「那做吧」後，Mainline 依裁決 cherry-pick 固定候選；canonical integration commit `28cad2d3beaaf32de2f62d0c08396aaba789ea01`。三檔 SHA 全吻合、launcher/policy/sensor 不變、既有 untracked 保留、實際載入 canonical scanner 路徑已核對，fresh 33/33 scanner regression PASS。證據：`evidence/edx-core-3-undo-redo/observer-r2-integration-verification.json`。原 decision receipt 保留裁決當時 NOT_INTEGRATED 事實；本節為最新狀態。Core3 正式驗收由 `tasks/edx-core-3-observer-r2-integration.md` 接續。
