# Reviewer B — visual fixture 本輪 host closure

日期：2026-09-29。裁決：**GO（僅本輪 bounded acceptance）**，無新增阻塞。未讀另一 Reviewer 收據；未啟動／重跑 host、Chrome、PGQ，未修改 source／control。

接續本人的 `visual-fixture-review-b-code.md` 與 `visual-fixture-review-b-visual.md`。正式執行由 Mainline 完成；本次 fresh 工作為原始產物、目前檔案身份與 OS 清理狀態核驗，不宣稱重新執行產品測試。

## 實際核驗

- Controller PASS、errors 空、全部 checks true；supervisor/client/history browser/PGQ/browser-close 均 exit 0。原始 `pgq.log` 有 16 個通過項，summary tests/pass=16、fail/cancelled/skipped/todo=0（708396.900292 ms）。雙 viewport 各 12 checks PASS、targetClosed=true，console/page/network/HTTP/remote-request 錯誤均空。
- **705 scans：704 runtime + 1 cleanup，全數 COMPLETE、attempt=1；本輪沒有 recovery**（RECOVERY_NOT_OBSERVED）。JSONL 每個 start/end ID 為 1…705；所有 end 移除 phase 後，與 resource-observation.scans 逐筆完全相同。unfinishedScans、diagnosticErrors、scan events 均空；trace 僅 call/return。未引用舊 #533。限制為 64 MiB／10000 files／TTL 3600；runtime 最大掃描 400.45487496536225 ms，記錄未超預算。
- 本輪 acceptance 與 controller 內嵌 browserAcceptance 完全一致，SHA 與本人已實際 view_image 的四 PNG visual receipt 相同。四 PNG 重新計算 bytes/SHA 全吻合，source.html SHA 吻合；RED=false、GREEN=true，candidate/restored/green 完整 measurement 相等，title/rightquote invariance 保持。既有四張實視結論適用本輪，沒有僅憑 JSON 代替看圖。
- 原始 session/processes 與 controller 內嵌記錄一致：outer PGID=40646，browser PID=40647、client PID=40648 的 started PGID 同為 40646，兩者 exited=0；supervisor PID=40640 exit=0。client TMPDIR/TMP/TEMP 指向同一 owned root 的 tmp。
- 現查 `/private/tmp/aic-b-aa9e394e826f4f6cb1ecb7e0e365dc91` 與 repo git-common-dir 下 `.ai-core-tmp-artifact-isolation.json` 均不存在（lexists=false）。B 的 fresh 全表 ps：observed_at_ns=1790670021629698000、704 rows；已知 PID `[40640,40646,40647,40648,40667,40754,41664]` 對 pid/ppid/pgid 與 root command 的 matches=[]。一般 sandbox 的 ps 被拒不作證據，後以獲准唯讀 `/bin/ps -A -ww -o pid=,ppid=,pgid=,stat=,command=` 成功取得非空全表，未發送 signal。
- before==after；目前 75 source、protected 4、ZIP、core 六檔均與記錄相符，產品檔亦與原凍結 manifest 相符。ZIP 2329758 bytes，SHA `862bb19f82b10fab9a244a1c334fed1f39b6edc1ad5c5ff95aebe3cc04daf290`。canonical HEAD=`71b774d31b8e7aa9e05786c8dc431c7528dabdc1`。原 untracked 六檔（PPT 四、ai-core 二）逐檔仍與 `owned-group-original-untracked.json` 的 SHA 相符；未把新增 evidence 算成原六檔。
- 現行 FINAL manifest、audit、integration verification、harness 與 audit 所列檔案 hashes 均通過比對；client/controller bytes 沿用已審版本。

## 固定 evidence 身份與重播

下列檔案相對 `host-acceptance-visual-fixture/`；SHA-256：

| 檔案 | SHA-256 |
|---|---|
| controller-receipt.json | `8c9e98b6ad07ab4961b984ab152f1dc37827b56fa46e6f9179c1b8ba324f6b41` |
| resource-observation.json | `dd33cea040541cb76b842f5e7558e0afa46d8b0082d304e297d5821a4639d2b8` |
| scan-events.jsonl | `7ab736f7e37690bfbca5103096915992a0dc50b376d6ed70a55f5788ec6c2906` |
| client-receipt.json | `3d2ee9e536edbbafb75b664d079d06b474ac1d7750a72bbeffabefbc91cab15a` |
| pgq.log | `6c2e21709b74336b7de07d48606428762c94277190b516b180d6dd6de2111468` |
| undo-redo/acceptance.json | `5ca402c122fa8a78d1ed3874aba4e2ad798f79b7f44fc18cf20a5c390b0afc90` |
| lifecycle/evidence/session.json | `5676402ddea6df2030e35c2fff769594e4e52cd003db365896ea0004aadda081` |
| lifecycle/evidence/processes.jsonl | `f9d74c2ecc23f8c7f5a9d3dc1705a2b4926beaa51e100e246802fd7d76aa9fdf` |

同層 FINAL manifest SHA=`86d152ec279438e83bf2e95715f9b393c8da54549f15ffee0580e40bbc48c7a6`；audit SHA=`9d8664ef3f7e4aaeb567e591a6eb2f45819ed09736364e6a74a18bc74306b873`；原六檔 baseline SHA=`239dd2f4ea1d9f7c93f6b545a0214587601057e5ac71cd631aac9283ffe6455f`。

可從上述 host evidence 目錄用 `/Users/matt/ai-core/.venv/bin/python -B` 重播核心一致性斷言（唯讀）：

```python
import json
from pathlib import Path
read = lambda f: json.loads(Path(f).read_text())
c = read('controller-receipt.json')
d = read('resource-observation.json')
j = [json.loads(s) for s in Path('scan-events.jsonl').read_text().splitlines()]
assert c['before'] == c['after']
assert c['diagnostic'] == d
assert c['client'] == read('client-receipt.json')
assert c['browserAcceptance'] == read('undo-redo/acceptance.json')
assert [{k:v for k,v in r.items() if k != 'phase'} for r in j if r['phase'] == 'end'] == d['scans']
assert len(d['scans']) == 705
assert not d['unfinishedScans'] and not d['diagnosticErrors']
```

目前 absence 為上述 fresh snapshot 的時點證據；未宣稱未來永久不存在。本輪沒有 recovery 故不聲稱 fresh recovery 覆蓋；failure 注入不重跑。既有 receipt I/O P2 與 Crop F2/P2 維持原裁決，通用 glyph/compliance、整體產品重審與 Core4 均不在此 GO 範圍；沒有 push/deploy。完成後停寫。
