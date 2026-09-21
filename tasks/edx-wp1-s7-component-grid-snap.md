# EDX-WP1-S7 — 單一 component 8px 邊緣吸附

Status: COMPLETE — Product `c390d26`；Independent targeted re-review GO，P0/P1/P2/P3=0；S7 closed
Depends on: S5 Independent GO dd74700／closure8dd76cc；S6 architecture evidence 5a937bf、9b0280d與gesture-boundary/decision.md。
traces_to: BACKLOG.md §10.1 guided direct manipulation／invisible snap grid、§10.2 prior-art-first、§10.3 WP1、§10.4 Operation Registry、§10.5 portability。
Trace preflight：上述refs存在；依賴已清；S7唯一ID；acceptance下列可重現；無Critical。

## 固定架構／產品契約

Prior Art：Moveable0.53.0 MIT，既有pinned Snappable。Classification ADAPT；bundle247646/gzip80891已含能力，不新增dependency/vendor rebuild。Why Custom僅vendor payload到既有canonical operation adapter。why_not_less：raw pointer繞過snap，直接target又受transform污染；why_not_more：無需custom quantizer/schema/第二geometry authority。無取代canonical或vendor。

- layout單一已初始化component，增加明示「8px吸附」暫態開關，初始關閉；不是DeckSpec欄位，不export、不記localStorage。關閉時S4/S5行為保持。
- 開啟時從canonical box投影短生命editor-only geometry target，target本身無presentation transform；不改component motion、不可清transform。原始元件selection/hit routing與proxy事件協調，選中後不遮擋toolbar或正常text mode。
- grid origin為slide canonical(0,0)，step8；drag只left/top吸附，SE resize只right/bottom吸附且canonical左上角固定。Off-grid resize尺寸不必8倍數，不新增round/clamp語意。
- proxy只是輸入／preview投影，不能持久保存第二份geometry；canonical仍為既有move-element/resize-element authority。沿begin/update/finish的stale token/revision、finite、cancel與一次提交，不繞過validator。vendor已套矩陣，不再盲除scale。
- preview不得改spec或污染export；pointer未移動不偷偷吸附，pointer回原點須明確no-op，不拿vendor起始off-grid修正當使用者修改。invalid bounds/minimum原子拒絕，不clamp。
- snap開關於gesture期間改變須先取消；選取切換、mode/text、resize/scroll/blur、Escape、pointercancel、stale/deleted、destroy都能取消與清proxy。vendor destroy後立即清引用；重複teardown安全，release不意外提交。
- keyboard仍1px/Shift10px，不受snap量化；保留S5 guardedEscape/IME/modifier/input ownership契約。初始化仍明示，不偷套legacy geometry。
- 不增Selecto、多選、alignment/group/history/AI/schema；不擴成任意rotate/warp。

## 驗收

RED→GREEN public/mounted：開關、off-grid正負/零/返回原點、多次preview、release1筆、cancel/invalid/stale0筆，text/IME/keyboard guards；雙scale與proxy生命周期。若adapter API調整，補既有pointer regression。
Fresh browser1280×720/1600×900：真pointer＋真controls開關，visible元件hit routing、drag/SE各on/off、bounds/最小值、Escape/pointercancel、export-during-preview與offline reopen；chrome/proxy不洩漏、normal/reduced/static geometry及motion（非只有synthetic transform）。errors0、ownedtarget/profile cleanup。
Full non-browser、focused、source hashes、diffcheck、ZIP lifecycle/hash。若geometry/motion/QA seam未改，可沿已review PGQ28 unique並明示inherited；若改則重判受影響browser coverage。效能不得重新引入whole-spec serialization或pointer全deck掃描。

## 執行與停止

standard bounded Worker＋Mainline驗收，依當前native model能力做routing/preflight，shared僅一writer；runtime/component-interaction.js、必要deck-editor chrome與cleanup、tests/tools、evidence/edx-wp1-s7；control/ZIP由主線。
先核對本實體卡及source query再實作；能力/設計阻擋依證據回主線，不再做泛化研究。不merge/push/deploy，不碰四untracked。完成停獨立review candidate，Owner手動交Reviewer；不另開可見review task。

## 開工路由

Branch codex/edx-wp1-s7，base5b767e4；一名clean native Worker，繼承主對話模型/effort（工具無Terra lane，不自行override）。shared single writer，主線期間唯讀準備驗收；Worker freeze後主線接手。Preflight與短prompt見evidence/edx-wp1-s7，無新visible task。

## Motion reset 窄修復

主線完成單檔最小修復，詳 evidence/edx-wp1-s7/motion-reset-repair.md。CSS契約4/4、non-browser337/337；目前14/14 source與4/4 protected hashes仍與motion-reset-hashes.json一致。舊motion blocker計數不重置，motion seam已改，PGQ需fresh受影響驗證。

歷史一次性host授權已消耗。AI Core fixed SHA `2d78d8e18d42156f43f12f0ebc6997914ec64328` 後，Mainline只補未完成的1600×900；`evidence/edx-wp1-s7/mainline-host-1600-after-aicore-20260921-r3/targeted/acceptance.json` 為PASS，normal/reduced/static各5 checks、errors0、Browser.close與lifecycle cleanup通過。1280沿既有fresh PASS，不重跑。

Motion reset後的fresh affected PGQ縮到 `pgq-wp4-s3-content-integrity` 與 `pgq-wp4-s4-required-visibility`；sample-approval/full-deck authority seam未變，保留已review inherited evidence。最新focused S3/S4/S5/S7為158/158 PASS（`evidence/edx-wp1-s7/mainline-focused-after-motion.log`）；full non-browser 337/337仍對應相同14/14 source hashes。`git diff --check` PASS。

Owner後續明示的一次fresh affected PGQ host授權已執行並消耗；readiness PASS後，兩支test因Node預設file concurrency平行執行，managed supervisor回 `NO_GO: resource observation unknown (scan limit)` 並fail-closed終止Chrome。PGQ收到空browser stdout後均以JSON parse error結束，不能判產品FAIL。lifecycle exit2、owned root已回收、post source/protected hashes仍MATCH。詳 `evidence/edx-wp1-s7/mainline-fresh-affected-pgq-attempt.md`。既有S4正式重現使用 `--test-concurrency=1`；下一次若Owner另行授權，只應串行跑同兩支，不改AI Core scanner或容量上限。

Owner再授權一次後依既有正式模式加入 `--test-concurrency=1`：fresh affected PGQ 2/2 PASS；content-integrity約24.3s、required-visibility約136.0s，總約160.5s。Readiness／Browser.close／managed lifecycle均exit0，launcher stderr空，post 14/14 source與4/4 protected hashes MATCH；因此前次scan-limit不再重現，保留為環境歷史證據而非產品FAIL。Fresh ZIP 2,251,917 bytes，SHA-256 `f94e99eeac7627f5c8ef022ec6d600f7922cce87f0271a67beb5740c10adf5ae`；install/smoke/uninstall lifecycle PASS，Gemini CLI缺席只列host capability partial。完整裁決見 `evidence/edx-wp1-s7/mainline-receipt.md`。
