# EDX-WP1-S3-MOTION — manual geometry 保留 motion

Status: CLOSED — Independent Review GO；reviewed `68eace85123993db84a03c4e75aeb9415ae7e47f`
Base: `a5e5d43`；branch `codex/edx-wp1-s3-motion`。
類型：standard bounded follow-up；Mainline裁決先關閉已量測的preserves契約缺口，再擴充WP1功能。
traces_to: BACKLOG.md §10.5 content-only/manual override preservation、§10.6 transform composition；evidence/edx-wp1-s3/independent-review.md inherited P2；evidence/edx-wp1-s4-perf/independent-review.md。

## 目標／邊界

component move/resize後，brand-device-accent、image-zoom-settle、restrained-fade-rise等既有transform motion仍能播放；動畫結束與reduced/static的geometry符合canonical override。沿既有renderer/projector，不新增wrapper authority、schema、dependency、operation或motion種類。
why_not_less：繼續保留!important會違反descriptor preserves motion。why_not_more：不需要多選、Selecto、history、AI bridge或全面motion重構。
Blocking edges：S3/S4/S4-PERF皆Independent GO，依賴已清。其他WP1功能pending，不在本卡。

## 實作／退場

限域runtime/component-geometry.js與runtime/deck-editor.js及必要對應tests/browser工具。先RED驗證舊geometry style壓制motion；清理旧inline geometry transform衝突後只project canonical position/size，禁止保留!important suppression fallback。不得清除無關inline style或更改motion canonical資料。核對preview/cancel/commit/export clone及renderer所有caller。
本次取代：geometry永久transform suppression → 一次清理舊geometry／preview inline衝突與非motion position/size projection。退場條件：Node/public editor、live/export/reopen及normal/reduced/static regression通過。任何geometry準確性退化不得以motion修復抵銷。

## 驗收

- regression RED→GREEN；focused S3/S4/perf與完整non-browser（排除有明確browser需求的PGQ工具）具名case PASS；source SHA與diff check。
- Mainline fresh owned browser attach-only：1280×720、1600×900；move/resize後normal motion開始有非identity transform、結束canonical rectangle正確；reduced/static保持final geometry。需public operation與至少S4 real-pointer regression，export/reopen保留geometry與motion。console/page/network/HTTP/remote error=0，owned target/profile清理。
- 本卡觸及geometry/motion seam：重驗相關PGQ browser compatibility，不可只沿用S4證據；記錄實跑範圍與不足。
- producer freeze後fresh ZIP/lifecycle與SHA。P0/P1=0才可交review candidate，GO由Owner外部review回傳，不自開或傳送可見review task。

## 派工／限制

1個clean native Worker，shared sequential single writer；Mainline在Worker完成前只唯讀與管理既有受管browser，不平行寫repo。實作由Worker，控制文件由Mainline。既有Owner核准Astra替代不可用5.5沿用，不更動主對話模型。
Worker只寫delivery檔與evidence/edx-wp1-s3-motion/worker-*；不寫本卡/backlog，不build dist、不commit、不merge/push/deploy。Mainline於交接後檢查diff、browser與ZIP。保留4既有untracked。兩次同類無進展即停報具體證據。

## 主線 checkpoint

實作完成，focused60/60、完整nonbrowser251/251與ZIP lifecycle PASS；fresh browser首輪motion終點失敗待判根因，PGQ遭受管Chrome資源觀測中止。owned process audit=0，但helper跨程序ownership拒絕cleanup；root與unknown isolation保留，不繞過。詳見 `evidence/edx-wp1-s3-motion/mainline-receipt.md`。恢復browser環境後由Mainline補single-suite motion與PGQ，未達review candidate。

## 最終驗收

ai-core合法回收後，motion單獨重驗1280×720／1600×900各31 checks PASS、errors全0；PGQ 19＋1＋8＝28 unique PASS，原環境fail保留。三個新session正常回收、source7/7、ZIP SHA及四個原untracked不變。詳見mainline-receipt.md與pgq-coverage.json。S3 motion P2待獨立verdict正式關閉；候選交Owner帶去review，不自行開／傳可見task。

## Independent Review closure

Owner回傳GO：P0/P1=0、0 new P2、P3=0；S3 inherited motion-transform P2正式關閉。reviewer fresh focused60／bounded nonbrowser237／source7通過；主線251與browser/PGQ為已提交evidence核對，詳見 `evidence/edx-wp1-s3-motion/independent-review.md`。reviewed code／ZIP保持；既知legacy同值辨識限制保留，首輪失敗原因未證實。
