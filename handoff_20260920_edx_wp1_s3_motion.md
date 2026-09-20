# S3-MOTION Mainline checkpoint

## Root question／current state
manual geometry保留motion且不破壞canonical contract。branch `codex/edx-wp1-s3-motion`，base `a5e5d43`。實作checkpoint，非review candidate。Mainline責任仍在本task，不轉交使用者裁決下一Slice。

## Evidence／blocker
讀 `tasks/edx-wp1-s3-motion-preservation.md`、`evidence/edx-wp1-s3-motion/mainline-receipt.md` 與 browser-environment-interruption.json。focused60、nonbrowser251、ZIP lifecycle PASS；motion首次browser第三treatment終點失敗，end未存且同時PGQ另開target，根因未定。Mainline補診斷但未重驗。PGQ中途Chrome resource scan limit退出，reporter19PASS/3FAIL非全28具名案例。

## Waiting conditions／next step
受管Chrome owned root `/private/tmp/aic-b-0fe6c1feeb8c41f58361299a7e64ef1d` 仍存在，unknown isolation保留；PID/PGID 74559與root process matches=0，既有helper因跨程序ownership拒絕cleanup。不得篡改helper registry、移除隔離標記或換入口繞過。需先以授權的lifecycle恢復途徑確認回收，再同一producer單獨重驗motion，補未完成PGQ。不要因environment failure重寫runtime或重跑已通過nonbrowser。

## Limits／fork
S3/S4/S4-PERF原GO保持；S3 motion P2尚未正式關閉；S5 pending。未merge/push/deploy。4原untracked不動，Worker已關閉。未取得完整browser evidence前不交外部review verdict、不自動開／傳review task。
