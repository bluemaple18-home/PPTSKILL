# EDX-WP1-S3-MOTION — manual geometry 保留 motion

Status: IN PROGRESS
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
