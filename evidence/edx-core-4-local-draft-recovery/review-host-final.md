# Core4 正式 host evidence 最終複審

- Reviewer thread：`01a0f06e-9e44-72a2-a014-2499ee5a2d27`（Aristotle）。
- Review root：`evidence/edx-core-4-local-draft-recovery/host-acceptance-04/`。
- 結論：**FINAL HOST GO**。

## Findings

- P1：無。
- P2：無。
- P3：受管 Chrome stderr 含 macOS display、GCM、Crashpad、GoogleUpdater 與 GPU 背景診斷；控制層 errors 為空、所有 commands 無 timeout 且 exit 0，因此本輪非阻塞。後續 receipt 應繼續區分 command timeout 與 Chrome host diagnostics。

## 驗收證據

- Controller `PASS`、supervisor exit `0`、errors `[]`；client `PASS`、exit `0`、errors `[]`。
- 1280×720、1600×900 各 12 checks，共 **24/24 PASS**；真 mouse click 前有 display、尺寸、viewport 與 hit-test 檢查。
- 兩輪的 console、pageerror、network failure、HTTP error、remote request 均為 `0`；`targetClosed=true`、`draftKeyRemoved=true`。
- Offline reopen、restore、replace、Undo、export 路徑完成。
- 四支 affected PGQ 串行執行，合計 **16/16 PASS**，四支 exit 均為 `0`。
- Browser/client 共用 outer PGID `80548`；browser、client return code 為 `0`；Browser.close exit `0`。
- owned root 與 isolation marker 已消失，process observation matches 為 `[]`。
- Before／after／current 九個 identity 一致；ZIP 與 checksum 對上，protected files 未漂移；`git diff --check` PASS。

## 證據限制

Controller exit 沒有獨立 shell-exit 檔，依 `controller-receipt.json` 的 `PASS` 與 controller 的 PASS→0 契約共同判定。Process observation 是收尾時的 point-in-time evidence。此 verdict 只涵 Core4 host closure，不代表 commit、push、merge、deploy 或 production。
