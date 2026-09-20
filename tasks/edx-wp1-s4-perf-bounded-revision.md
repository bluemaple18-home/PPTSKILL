# EDX-WP1-S4-PERF — pointer revision 成本界定

Status: REVIEW CANDIDATE — Mainline 驗收完成；Independent Review pending
類型：standard bounded performance follow-up；review candidate後停，不開S5。
Base: S4 GO closure `5ae8bb8`；branch `codex/edx-wp1-s4-perf`。
traces_to: tasks/edx-wp1-s4-single-component-interaction.md 操作契約4–7；evidence/edx-wp1-s4/independent-review.md 新P2。

## 目標／主線裁決

移除每次pointer update的whole-DeckSpec stringify與preview重複序列化。獨立review量測12MiB約2.8ms/stringify，影響large-image deck；這是已量測gap，不為成熟度擴功能。
why_not_less：只節流pointer不能移除payload線性成本且可能改gesture語意。why_not_more：沿既有editor閉包revision或bounded target revision，不建立registry/FSM/第二canonical state。S3 motion P2、Selecto、多選、snap、history、AI bridge均不動；不新增dependency。

## 契約／退場

- pointer update與preview resolve不得JSON.stringify／hash／clone整份spec或走訪asset payload；成本不隨圖片dataUri長度成長。
- stale guard維持原有語意：gesture開始後canonical semantic change（含public executeOperation、legacy patch、文字同步、asset replace、slide/component變更）、target替換／刪除／模式切換仍取消，不覆寫新state。請先限域列出mutator入口再選最小revision方法。
- preview／selection／noop／getDeckSpec／內容未改的export不得冒充semantic mutation；preview時export仍保存committed geometry，後續合法release應可提交。
- revision僅ephemeral local work，不進DeckSpec／portable HTML，無新schema、operation、vendor更新。
- 本次取代：whole-spec JSON stale fingerprint→bounded revision。正式hot path舊實作移除，不保留fallback雙路。public caller、Node/browser API、export/reopen回歸後退場完成。

## 驗收／證據

- public-interface RED先證明hot path會觸碰整份payload，再GREEN；mounted integration或generated browser public API驗證revision，不能只測抽象adapter假的revision。
- 覆蓋上述semantic mutation vs readonly/preview/export，stale/cancel/noop/invalid原子性、commit至多一次。1/6/12MiB controlled payload benchmark列baseline/after，asset payload讀取／serialization次數為deterministic gate；timing為診斷，無跨機固定ms門檻。
- Mainline fresh managed Chrome：重播S4雙viewport真pointer export/reopen；新增大payload或mounted hot path成本證據與stale mutation browser regression。保留console/page/network/HTTP/Traceback與owned target cleanup。先listener再navigate，不spawn unmanaged browser。
- producer freeze後focused＋non-browser full、syntax/diff、source SHA前後一致；fresh ZIP build/lifecycle/bytes/SHA。PGQ authority/QA/geometry/vendor未改時，既有S4 GO的PGQ28unique只作繼承證據，不冒稱本卡fresh；若變更觸及那些seam再擴測。
- 只一個clean Worker、shared sequential code writer；Mainline處理control、baseline診斷與fresh browser/ZIP。Astra沿Owner既有替代授權；不另派Review/Repair線。

## 範圍／阻擋

可改 runtime/component-interaction.js、runtime/deck-editor.js、對應tests與bounded probe工具/evidence。若需改schema/geometry/vendor/QA authority則回Mainline，不自行擴範圍。原4untracked與S4 reviewed evidence/ZIP保持到本卡明示final ZIP rebuild；不commit/merge/push/deploy由Worker執行。兩次同類無進展停止；修法未保持stale契約不得宣告完成。

Next: Worker實作與非browser驗證→Mainline真browser/ZIP→獨立review candidate。回報結果/驗證/風險與exact files，不宣稱獨立GO。

## 主線 bounded 補充

Mounted async asset×readonly export RED顯示export換spec object時原captured component可能已detached；容許以captured stable slide/component identity在await後重找live target，使asset寫入及revision一致。失效/刪除target不回寫；不做全async生命週期重構。Legacy invalid patch僅補本卡revision所需原子rollback，不擴schema契約。證據見worker-async-red.log；由同一Worker修正，不新Repair線。

## 主線結果

- focused45/45 PASS。完整non-browser為245個具名案例：Worker221＋Mainline補跑24。Node原始摘要222/51各含1/27個filter後空檔PASS，不計為case；nonbrowser-coverage.json列完整名單。
- mounted 1/6/12MiB hot update+preview payload reads／serialization全0；時間只診斷，不宣稱browser FPS或跨benchmark倍數。
- fresh Chrome 1280×720/1600×900：S4原有真pointer/export/reopen及新增readonly/noop/invalid/export後release、public/legacy/sync/geometry/asset stale全PASS，console/page/network/HTTP/remote request全0。
- 新ZIP 2,249,243 bytes，SHA `eca0af886794934f3d862a9ad0e140226b693e007c361dfc2218fda9ac4dde85`；lifecycle/smoke PASS，Gemini CLI缺席仍為host partial。
- 8檔source SHA前後相同，owned browser supervisor exit0/profile已清，4既有untracked hash不變。PGQ-WP4僅繼承S4 GO evidence，不冒稱fresh。
- 本卡取代已完成：正式pointer resolver無whole-spec fingerprint fallback；runtime以ephemeral revision讀取，cold commit/export原有完整驗證保留。獨立review未執行，S3 motion P2仍保留；不merge/push/deploy、不開S5。
