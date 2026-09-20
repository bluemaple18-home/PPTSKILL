# S5 主線 receipt

狀態：REVIEW CANDIDATE；Independent Review pending。下方 checkpoint 與失敗證據保留；最終結果以「續驗與最終驗收」為準。

## 變更與驗證

- 單一 component 的方向鍵1px、Shift10px，沿 move-element；輸入、composition、修飾鍵、stale target、bounds、gesture guard；不新增 schema/vendor/history。
- Worker 首次 provider 502（ENOTFOUND chatgpt.com）。重送其實恢復並留下測試草稿；Mainline 關閉後成為唯一 writer。worker-red.log 是錯誤 import，不能算功能 RED；修正入口後 mainline-red.log 為行為 RED，mainline-green.log 7/7 PASS。
- focused.log：70/70 PASS；nonbrowser.log：259/259 PASS。命令：`node --test tests/edx-wp1-s3*.test.mjs tests/edx-wp1-s4*.test.mjs tests/edx-wp1-s5*.test.mjs tests/p0-vq1-motion-baseline.test.mjs tests/p0-vq3-s3-motion-effects.test.mjs`；全套：`node --test $(rg --files tests -g '*.test.mjs' | rg -v '/pgq-wp4-')`。
- ZIP build、host probe lifecycle/package smoke PASS；Gemini CLI 不在 PATH，host capability partial，非 ZIP lifecycle 失敗。ZIP SHA-256：`3d5a5959bf8e5ad376994ab6370de2c34ebda4bdd62ac150130622f74d0ab4d2`。
- 原四個 untracked SHA 均與既存紀錄一致；source-sha256.json 保存五個交付 source hash。

## Browser 阻擋與界線

受管入口先宣告 owned profile，之後因 resource observation unknown (scan limit) 退出2；harness 未取得 DevToolsActivePort，ENOENT 保留於 mainline-browser.log。沒有成功 attach 或 navigation，因此 console/page/network/HTTP/remote 與雙 viewport checks 均未驗證，不能記0或PASS。source.html 僅是產生的 fixture。

lifecycle-cleanup.json 確认 owned root 已不存在、isolation marker 不存在；不需上輪 recovery 流程。依 browser-acceptance-flow 啟動失敗停止，本輪未盲重試。此環境失敗不證明 S5 regression，也不構成 S5 browser acceptance。

PGQ 僅沿 S3-MOTION Independent GO 的28 unique inherited evidence，並非 S5 fresh。checkpoint 當時新 browser cases 尚未執行；composition lifecycle 用 synthetic event 配真 CDP arrow，不能宣稱原生 OS IME 驗證。deck.js 屬另一 legacy renderer，沒有宣稱本 full-deck 有該翻頁功能。

## checkpoint 當時的下一步

在可成功啟動的受管 browser session 續跑 `PPTSKILL_DEVTOOLS_ACTIVE_PORT=<本輪owned portfile> node tools/edx-wp1-s4-browser-acceptance.mjs evidence/edx-wp1-s5/browser-retry --keyboard-regression`，保留本輪失敗、核對雙 viewport／export／pointer，再正常關閉並驗證清理。若發現 source 問題，修復後重跑受影響測試、重建ZIP與hash。通過後才整理獨立 review candidate，交 Owner 手動帶走。

未 merge／push／deploy，未建立或代傳可見 review task。

提交檢查：mainline-red.log 僅移除 reporter 空白行尾空格，保留失敗內容；staged diff check PASS。

## 續驗與最終驗收

- browser-retry 與 browser-diagnostic 定位到真實 focus 問題：選取元件之後 activeElement 仍為 layout button；ArrowLeft/Up 未 preventDefault，既有 chrome guard 因而略過。這是本卡產品缺口，並非 geometry 拒絕提示被覆蓋。
- 修復只在 select 已解析合法元件後，對 editor chrome 的 activeElement 呼叫 blur；不改一般輸入焦點政策、不新增 tabindex。mounted 回歸測試驗證直接 chrome focus 不處理，選取元件後可微調。focus-red.log 與 focus-green.log 初版 double 未標 chrome，失敗屬測試 fixture，不能算有效產品 RED；browser-diagnostic 才是產品 RED。
- focus-final.log：71/71 PASS；nonbrowser-final.log：260/260 PASS（全具名，無 filtered empty-file 計數）。命令沿上列 focused 與全套命令。
- browser-focus-fix：1280×720 完整19 checks PASS；1600×900 中途 CDP timeout／fetch failed。受管入口因 scan limit 退出2、root 正常清除。當時有 Node 全套測試並行，但未證明其為 scan limit 根因。
- browser-isolated/acceptance.json：不並行 Node/ZIP 測試的 fresh 完整重跑；1280×720 與1600×900 各19 checks PASS，console/page/network/HTTP/remote 各0，兩 targetClosed=true。包含真鍵盤1px/10px、repeat、modifier/229、輸入與chrome guards、safe-area拒絕、真drag/resize互斥、離線export/reopen、text mode與deleted target。composition event 為 synthetic lifecycle probe，不是原生 OS IME。
- browser-close.json 與 final-lifecycle-cleanup.json：最終 Browser.close，supervisor exit0、owned root absent、isolation marker absent；前一失敗 root 亦 absent。沒有繞過資源限制或任意手刪暫存。
- distribution-final-build.log / distribution-final-host-probe.json：ZIP lifecycle/package smoke PASS；ZIP 2,250,264 bytes，SHA-256 `82943f8c5c7ab3f0069b5755f1c1105ed2f4998024ae85eb73a15f6c013fb707`。Gemini CLI 未在 PATH，host capability partial 如實保留。
- source-sha256.json 為最終五個 source hash；checkpoint-source-sha256.json 保存先前 hash。四個既有 untracked SHA 不變。所有 source 在最終 browser/ZIP 後未改。
- PGQ 沿 S3-MOTION GO 的28 unique inherited evidence（19+1+8），不宣稱 S5 fresh，也不宣稱單輪28/28；geometry/motion authority 未變。

下一步：Owner 手動將 handoff 交獨立 Reviewer；尚無 Independent GO，不 merge／push／deploy。不再重跑同一已通過組合。
