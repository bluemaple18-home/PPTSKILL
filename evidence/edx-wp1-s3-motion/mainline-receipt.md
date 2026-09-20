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
