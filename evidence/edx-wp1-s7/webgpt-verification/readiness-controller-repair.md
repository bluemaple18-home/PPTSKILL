# S7 host controller readiness repair

狀態：`TEXT_FIXTURE_PASS / NO_BROWSER_LAUNCH`。

本檔只修正上一輪 ad-hoc host controller 的 readiness 判斷規格；沒有修改 PPTSKILL product、AI Core lifecycle、Rule 24、capacity sensor 或任何安全閘門。

## 已確認缺陷

原 controller 使用：

```bash
[ -s "$PORTFILE" ] && [ "$(wc -l < "$PORTFILE" | tr -d ' ')" -ge 2 ]
```

`wc -l` 計算 newline bytes，不是 logical lines。有效的 Chrome `DevToolsActivePort`：

```text
49613
/devtools/browser/11744ea9-31ad-43fb-823e-92fd50454cad
```

若第二行沒有 final newline，原條件得到 `wc -l = 1`，會 false-negative；Python/Node 的 `splitlines()` / `trim().split('\n')` 則可正確解析兩欄。

## Text fixture matrix

本輪只在 `/private/tmp` 建立文字 fixture，poll interval 20 ms、fixture deadline 300 ms；沒有啟動 Chrome。

| case | 原 `wc -l` | contract parser | outcome |
| --- | --- | --- | --- |
| empty | not ready | not ready | timeout |
| only port line | not ready | not ready | timeout |
| two lines, no final newline | **not ready** | **ready** | confirmed false-negative |
| two lines, final newline | ready | ready | pass |
| delayed second line, no final newline | **still not ready** | **ready at ~91 ms** | confirmed false-negative |
| wrong/missing path | not ready | FileNotFoundError | bounded wait |
| directory/read error | not ready | IsADirectoryError | bounded wait |
| supervisor exits before ready | not ready | not ready | supervisor-exit branch |
| invalid port 99999 | not ready | invalid_port | bounded wait |
| invalid endpoint | not ready | invalid_endpoint | bounded wait |

原 host run 沒有保存逐 poll 的 port-file bytes/stat/mtime，因此這證明 controller **能**產生本輪 exit 28 症狀，但不能倒推當時 Chrome 實際檔案一定缺 final newline。

## 最終 controller（主線修正 deadline）

可執行檔：`evidence/edx-wp1-s7/webgpt-verification/readiness-controller.mjs`。
單一Node程序內以 performance.now() 計算12,000ms deadline；read與poll sleep均計入，不再每輪另起Python。使用logical lines並驗port／endpoint；missing/read error bounded wait；supervisor退出27，deadline28。讀取受剩餘時間timer與AbortSignal限制，不接受deadline後的ready。

只觀察caller提供的owned port檔與supervisor PID；不launch/kill browser、不掃描tmp、不從stderr猜port、不接管lifecycle。CLI成功stdout只有port與endpoint兩行，診斷JSON輸出stderr。原caller繼續擁有TERM/wait與finally cleanup；沒有把清理搬入新runtime。

下次取得明示browser授權後，替換原controller的240次loop：

```bash
if PARSED=$(node "$REPO/evidence/edx-wp1-s7/webgpt-verification/readiness-controller.mjs" \
  "$PORTFILE" "$SUP_PID" 2>>"$OUT/readiness.log"); then
  READY=1
else
  LRC=$?
  case "$LRC" in
    27)
      if wait "$SUP_PID"; then SUP_RC=0; else SUP_RC=$?; fi
      echo "LAUNCHER_EXIT_BEFORE_READY rc=$SUP_RC portfile=$PORTFILE"
      cat "$OUT/launcher.stderr"
      exit 27
      ;;
    28)
      echo "DEVTOOLS_NOT_READY portfile=$PORTFILE"
      kill -TERM "$SUP_PID" 2>/dev/null || true
      wait "$SUP_PID" || true
      exit 28
      ;;
    *)
      # 程式本身異常亦由caller既有finally/trap回收；不得留下owned session。
      kill -TERM "$SUP_PID" 2>/dev/null || true
      wait "$SUP_PID" || true
      exit "$LRC"
      ;;
  esac
fi
```

保留原host launcher的finally/trap與managed lifecycle；只替換readiness段。12秒指進入waitForPortFile後的monotonic時間，cleanup與Node啟動不納入readiness窗口。事件迴圈/OS排程延誤可能令返回稍晚，不宣稱即時系統硬保證；逾時結果一定拒收。kill(pid,0)沿原supervisor存活觀測能力，不額外宣稱能辨識PID重用或所有zombie情況。

## 主線驗證

`node --test tests/edx-wp1-s7-readiness-controller.test.mjs`：19/19 PASS，見 readiness-controller-tests.log。含有/無final newline、CRLF、無效port/endpoint、空/半寫檔、延遲第二行、讀取錯誤、慢讀取計入deadline、剩餘sleep縮短、遲到ready拒收、supervisor讀取前/中退出27、真文字檔，以及實際timer中斷永不完成的read。

時間分支以可控clock測試，另有30ms實際timer案例；不冒稱已實測完整12秒host等待或Chrome。沒有啟browser，原host retry授權仍已消耗。
