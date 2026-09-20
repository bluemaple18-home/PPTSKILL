# S3-MOTION Mainline 驗收紀錄

## Root question／裁決

manual geometry能否保留既有motion transform且不破壞canonical geometry、preview/cancel或portable契約？沿Owner既有主線授權，S4-PERF GO後先處理已量測inherited P2，不擴多選/history/AI。
Base `a5e5d43`，開卡 `a0f5f6f`，branch `codex/edx-wp1-s3-motion`。CodeGraph未命中geometry，限域rg確認componentGeometryStyle與projector caller。standard clean Worker Galileo實作，shared sequential writer；context preflight PASS，Mainline接手前Worker已freeze。無可見task建立或自動傳送外部review。

## 已完成驗證

Worker focused60/60、attach4/4、PGQ非browser子集15/15。主線完整non-browser使用所有tests排除pgq-wp4整組，251/251 PASS、無filter empty-file混算；各focused/subset不另相加。ZIP lifecycle/smoke PASS，2,249,561 bytes，SHA見distribution-measured.json；Gemini CLI缺席為host partial，未為此安裝。

## Browser 首輪失敗／bounded 重驗契約

首輪mainline-browser/acceptance.json在1280×720已通過既有S4十項與兩treatment的normal/reduced/static、第三treatment public operation；restrained-fade-rise normal pointer-commit-cancel終點identity assertion失敗。console/page/network/HTTP/remote errors為0、owned target closed。失敗時end snapshot未保存，不能憑該assertion判定runtime根因。

Mainline首輪途中在同一owned Chrome啟動PGQ不同target，存在動畫背景時序干擾的可能，但未證實根因。保留首輪fail；只補工具diagnostics（visibility、root classes、animation playState/currentTime/timing、assert前保存start/end），不改runtime、不放寬assertion。補測9/9 PASS。等PGQ完成後只做一次single-suite motion重驗；再失敗即停止同類重試，依完整diagnostics回主線。

## 限制／待完成

真browser最終結果、PGQ、owned browser cleanup與source SHA複驗待回填。三treatment為renderer component effect-token seam fixture；restrained-fade-rise預設routing屬supportingCopy，不能宣稱自然style routing全覆蓋。精確canonical marker＋none!important无法區分舊geometry與完全相同的人手inline值；只移除這组legacy suppression，其他declaration/priority保留。

Mainline檢視1280-selected.png確認原有selection/toolbar仍呈現。Worker已close，無並行writer。未merge/push/deploy，未開S5；Independent Review尚未進行，未正式關閉inherited P2。

## 最終 checkpoint／BLOCKED_ENVIRONMENT

PGQ首輪reporter 22 entries：19 PASS／3 FAIL，其中full-deck為file-level failure，不是28 unique cases已完整跑完。Supervisor exit2：resource observation unknown (scan limit)，後續owned process-group observation incomplete。PGQ錯誤包含CDP中斷後unsettled top-level await／JSON parse失敗，不能當candidate correctness結論。

唯讀升權ps核對PID/PGID 74559及exact owned root process matches=0；在repo lifecycle lock下嘗試既有helper回收，但helper拒絕「tmp root is not owned by this helper process」。未改ownership registry、未清unknown isolation、未繞過閘門或另起browser。root仍保留，證據見browser-environment-interruption.json與browser-environment-failure/。single-suite motion重驗尚未開始。

交付狀態：實作checkpoint，非review candidate、非Independent GO、S3 motion P2仍未正式關閉。下一個blocking edge是受管browser owned-root回收／隔離狀態恢復，屬ai-core lifecycle環境，不在本卡PPTSKILL delivery scope；恢復後先single-suite motion診斷，再補PGQ未完成案例。保留既有pass，不為環境問題修改producer。完整nonbrowser251/251與ZIP lifecycle PASS仍有效；真browser驗收不足。

## ai-core回收完成／主線續驗

Owner回傳AI-CORE-TMP-RECOVERY結果，Mainline讀取原receipt並複製為ai-core-recovery-handoff.md；fresh核對舊root與unknown marker均已消失，producer 7/7 SHA一致。ai-core recovery PASS，但其commit被既有devflow fixture阻擋，未宣稱已提交；PPTSKILL不代改ai-core fixture。

在新owned profile單獨執行motion suite，runtime／驗收assertion未改：1280×720與1600×900各31 checks PASS（原S4十項＋三treatment各七項motion/round-trip），console/page/network/HTTP/remote errors均0，targetClosed=true。所有normal起點非identity、終點canonical；reduced/static final geometry與export/reopen通過。證據mainline-browser-retry/acceptance.json含visibility/animation診斷。單獨重驗通過未能單獨證明首輪失敗的因果；首輪fail仍保留，不冒稱兩輪全PASS。

Browser.close正常socket close、supervisor exit0、exact profile/root與isolation marker消失，見motion-lifecycle-cleanup.json。PGQ依pgq-retry-plan.json只補9個未完成具名cases；首輪19個具名PASS不重跑。

## 最終驗收／REVIEW CANDIDATE

- Motion重驗：雙viewport各31 checks PASS，原S4 real pointer與motion public／cancel／commit／preview export／recipient reopen均覆蓋；errors全0。首輪fail仍留存，重驗沒有修改runtime。
- PGQ：原19具名PASS＋approval補驗1/1＋full/visibility補驗8/8，28 unique cases完整PASS；pgq-coverage.json逐case對應logs。不是單輪28/28，不能刪除原環境中止紀錄。
- 完整nonbrowser251/251、focused60/60與ZIP lifecycle/smoke沿本卡同一delivery source有效；主線diagnostic-only工具增補後另跑9/9並完成fresh browser。本輪沒有為省略案例重算空檔PASS。
- 三個新受管session逐一正常Browser.close、supervisor exit0、exact root已消失；最後unknown marker不存在。各lifecycle-cleanup.json記錄完整；舊root由ai-core合法recovery回收，不能混作正常supervisor cleanup。
- Source SHA最終7/7一致；ZIP 2,249,561 bytes，SHA `9eb63de4894f1495d63b351c751d9d776bb5ca5382ed48b9b3a16ebc6cfde58c`。診斷工具不在ZIP打包清單，runtime/packaged QA來源未改，不重建不同版本混淆驗收。四個原untracked hash不變、diff check PASS。
- 取代完成：componentGeometryStyle不再輸出永久transform suppression；projector只清除canonical marker下舊none!important並投影geometry，保留無關inline declaration／priority。無legacy suppression fallback，renderer/public editor/export/reopen皆有回歸。

主線裁決：可交獨立review candidate；S3 motion P2實作修復與主線驗收完成，但正式關閉等待Owner回傳獨立verdict。S3/S4/S4-PERF原GO不改寫。本task沒有修改ai-core、沒有代給fixture修正授權；ai-core commit狀態依回傳仍pending。未merge/push/deploy，S5未開。
