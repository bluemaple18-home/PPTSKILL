# Reviewer A：visual fixture 本輪 host closure

2026-09-29，核對至 08:21 UTC。**本輪 bounded acceptance closure：GO。** 沒有新增阻塞；延續本人 code GO 與四 PNG visual GO。只讀本輪 `host-acceptance-visual-fixture/`、manifest/audit/固定身份資料，未讀另一 Reviewer、重跑 host 或修改 delivery/control。本次只新增本收據。

## 實證

- controller PASS／supervisor exit 0；獨立 client receipt 與 controller 內嵌內容完全相同，client、historyBrowser、PGQ、browserClose exit 均 0，errors/runtimeFailures 空。readinessComplete=true、deadline 25s。
- `pgq.log` 實際 16 個成功項，tests/pass=16、fail/cancelled/skipped=0，708396.900292ms。acceptance 與 controller 內嵌內容深度相等，1280/1600 各 12 checks PASS，console/pageErrors/networkFailures/httpErrors/remoteRequests 空，traceback=false、targetClosed=true。
- 705 scans＝704 runtime＋1 cleanup；1410 journal 行逐對 start/end 驗證連續 id、root、kind、limits、startedMonotonic，**每個 end 去掉 phase 後與 resource-observation 對應 scan 完整相等**；controller diagnostic 又與整份 resource-observation 相等。沒有 unfinishedScans／diagnosticErrors。全數 COMPLETE、attempt=1、recovered=false、events/attemptsDiagnostic 空；本輪真實狀態是 **RECOVERY_NOT_OBSERVED**，不借用舊 id533。
- 固定预算 64MiB／10000 files／TTL3600；實際峰值 31942419 bytes／751 files／950 entries，最長 scan 400.455ms。scanner before/after/current SHA 一致。
- session 與原始 processes.jsonl 完全對上 controller。outer PID/PGID 40646；browser 40647、client 40648 的 started 記錄均 PGID40646，兩者 exited returncode0。client 子命令 PID：history 40667、PGQ40754、close41664；supervisor40640。普通子命令的同 group 繼承沿用已審固定程式；raw 沒有逐一為每個瞬時後代記錄 PGID，不作超出此證據的逐 PID 斷言。
- Mainline 收尾時 fresh-full-ps-pid-ppid-pgid-root observation：2026-09-29 08:18:06.337722 UTC、696 processes、historical_pid40646、matches=[]；cleanup 四項均 true。Reviewer 當前 `os.path.lexists` 確認 root `/private/tmp/aic-b-aa9e394e826f4f6cb1ecb7e0e365dc91` 與 repo `.git/.ai-core-tmp-artifact-isolation.json` 不存在。
- before==after 完整深度相等；再獨立重算目前 75 source、4 protected、ZIP、canonical6、harness8、audit12 SHA 全符。core HEAD `71b774d31b8e7aa9e05786c8dc431c7528dabdc1`，canonical6 亦比對該 commit blob。原 untracked6 按 `owned-group-original-untracked.json` 驗證 bytes/hash 且各自 `git ls-files -- <path>` 為空，均保留。
- FINAL manifest SHA `86d152ec279438e83bf2e95715f9b393c8da54549f15ffee0580e40bbc48c7a6` 符合 before/after；integration/product manifest/client audit 身份均通過。ZIP 2329758 bytes，SHA `862bb19f82b10fab9a244a1c334fed1f39b6edc1ad5c5ff95aebe3cc04daf290`。
- acceptance SHA 仍為先前 visual review 的 `5ca402c122fa8a78d1ed3874aba4e2ad798f79b7f44fc18cf20a5c390b0afc90`；再次重算四 PNG bytes/hash 均符合，candidate==restored==green.measurement。實圖判讀沿用本人 `visual-fixture-review-a-visual.md`，未把 JSON 當新視覺審查。

## 可重播核對與限制

Reviewer 使用 `/Users/matt/ai-core/.venv/bin/python -B -`：`json.loads` 讀三份 receipts/resource、逐行讀 journal；對每個 scan 比較 `journal[2*i+1]` 移除 phase 後的完整物件；以 `hashlib.sha256(Path(...).read_bytes())` 重算上述固定清單；`git rev-parse HEAD`、`git show <HEAD>:<path>`、`git ls-files -- <原untracked路徑>`；以 `os.path.lexists` 查 exact root/marker。以上 assertions 通過。

之後嘗試 `/bin/ps -axo pid=,ppid=,pgid=,command=`，sandbox 在啟動命令時回 `PermissionError: [Errno 1] Operation not permitted: '/bin/ps'`，使該核對 script 最終 exit1；前述 assertions 已完成，不將整支 script 稱為 exit0。未換 runner／提升權限重試。**PID absence 採本輪 Mainline 收尾 fresh observation；Reviewer 此時無法再次獨立查目前 process table。** 原始完整 ps table 未保存於本輪指定 raw，只有該 observation；這是證據粒度與 sandbox 限制，不宣稱 Reviewer fresh ps PASS。若要求重新確認目前所有 PID，交 Mainline 正式環境處理，無需重跑 host。

Chrome lifecycle stderr 非空：包含 allocator、display-link、GCM、GPU mailbox 訊息；未見 Traceback/FATAL/ResourceScanError。此處「無 diagnostic errors」僅指 observer 欄位為空，不宣稱 Chrome 零 stderr；本輪兩組視覺/功能及 PGQ 均通過，未據此新增阻塞。

固定 raw SHA-256：

| 檔案 | SHA-256 |
| --- | --- |
| controller-receipt.json | `8c9e98b6ad07ab4961b984ab152f1dc37827b56fa46e6f9179c1b8ba324f6b41` |
| client-receipt.json | `3d2ee9e536edbbafb75b664d079d06b474ac1d7750a72bbeffabefbc91cab15a` |
| resource-observation.json | `dd33cea040541cb76b842f5e7558e0afa46d8b0082d304e297d5821a4639d2b8` |
| scan-events.jsonl | `7ab736f7e37690bfbca5103096915992a0dc50b376d6ed70a55f5788ec6c2906` |
| pgq.log | `6c2e21709b74336b7de07d48606428762c94277190b516b180d6dd6de2111468` |
| lifecycle/evidence/processes.jsonl | `f9d74c2ecc23f8c7f5a9d3dc1705a2b4926beaa51e100e246802fd7d76aa9fdf` |

既有 I/O P2、Crop F2/P2 保留；沒有宣稱通用 glyph/compliance、1061 fresh suite、push/deploy 或 Core4。本裁決只關閉本輪固定 host acceptance，無新增本範圍 closure 阻塞。完成後停寫。
