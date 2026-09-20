# S5 主線 checkpoint

狀態：IMPLEMENTED / BROWSER ACCEPTANCE BLOCKED；Independent Review 尚未開始。

## 變更與驗證

- 單一 component 的方向鍵1px、Shift10px，沿 move-element；輸入、composition、修飾鍵、stale target、bounds、gesture guard；不新增 schema/vendor/history。
- Worker 首次 provider 502（ENOTFOUND chatgpt.com）。重送其實恢復並留下測試草稿；Mainline 關閉後成為唯一 writer。worker-red.log 是錯誤 import，不能算功能 RED；修正入口後 mainline-red.log 為行為 RED，mainline-green.log 7/7 PASS。
- focused.log：70/70 PASS；nonbrowser.log：259/259 PASS。命令：`node --test tests/edx-wp1-s3*.test.mjs tests/edx-wp1-s4*.test.mjs tests/edx-wp1-s5*.test.mjs tests/p0-vq1-motion-baseline.test.mjs tests/p0-vq3-s3-motion-effects.test.mjs`；全套：`node --test $(rg --files tests -g '*.test.mjs' | rg -v '/pgq-wp4-')`。
- ZIP build、host probe lifecycle/package smoke PASS；Gemini CLI 不在 PATH，host capability partial，非 ZIP lifecycle 失敗。ZIP SHA-256：`3d5a5959bf8e5ad376994ab6370de2c34ebda4bdd62ac150130622f74d0ab4d2`。
- 原四個 untracked SHA 均與既存紀錄一致；source-sha256.json 保存五個交付 source hash。

## Browser 阻擋與界線

受管入口先宣告 owned profile，之後因 resource observation unknown (scan limit) 退出2；harness 未取得 DevToolsActivePort，ENOENT 保留於 mainline-browser.log。沒有成功 attach 或 navigation，因此 console/page/network/HTTP/remote 與雙 viewport checks 均未驗證，不能記0或PASS。source.html 僅是產生的 fixture。

lifecycle-cleanup.json 確认 owned root 已不存在、isolation marker 不存在；不需上輪 recovery 流程。依 browser-acceptance-flow 啟動失敗停止，本輪未盲重試。此環境失敗不證明 S5 regression，也不構成 S5 browser acceptance。

PGQ 僅沿 S3-MOTION Independent GO 的28 unique inherited evidence，並非 S5 fresh。新 browser cases 尚未執行；composition lifecycle 用 synthetic event 配真 CDP arrow，不能宣稱原生 OS IME 驗證。deck.js 屬另一 legacy renderer，沒有宣稱本 full-deck 有該翻頁功能。

## 下一步

在可成功啟動的受管 browser session 續跑 `PPTSKILL_DEVTOOLS_ACTIVE_PORT=<本輪owned portfile> node tools/edx-wp1-s4-browser-acceptance.mjs evidence/edx-wp1-s5/browser-retry --keyboard-regression`，保留本輪失敗、核對雙 viewport／export／pointer，再正常關閉並驗證清理。若發現 source 問題，修復後重跑受影響測試、重建ZIP與hash。通過後才整理獨立 review candidate，交 Owner 手動帶走。

未 merge／push／deploy，未建立或代傳可見 review task。

提交檢查：mainline-red.log 僅移除 reporter 空白行尾空格，保留失敗內容；staged diff check PASS。
