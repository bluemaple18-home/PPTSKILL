# S5 guarded-Escape repair

狀態：修復完成，targeted Independent re-review pending；尚不宣稱 GO。
Root question：guard 是否涵蓋 Escape 且不破壞普通 pointer cancel？blocker：reviewed be7b0bd 的唯一P2。Fork：無；主線採 minimal bounded 直接修復，不增派工或子系統。

Production diff 只將既有 composing/isComposing/229/Ctrl/Meta/Alt/input ownership guard 移至 Escape 前。沒有改 guard 判斷本身。CodeGraph 本輪未命中 interaction，沿 bounded source read 核對。

- red.log：新增 drag/resize guarded-Escape 測試在舊 source 失敗；focused.log 修復後73/73 PASS。測試覆蓋 modifier、IME flags/lifecycle、event target/activeElement輸入與chrome；保留selection/gesture/spec，普通Escape則取消且release不提交。
- nonbrowser.log：262/262具名PASS。命令沿主receipt的focused/full命令，無filtered empty-file計數。
- browser/acceptance.json：fresh1280×720、1600×900各20checks PASS，console/page/network/HTTP/remote各0、兩targetClosed=true。新增真CDP guardedEscape於drag/resize、輸入focus，普通Escape沿原pointer cancel；composition lifecycle仍synthetic，不宣稱原生OS IME。
- build.log、zip-probe.json：ZIP lifecycle/package smoke PASS。SHA-256 `54970f58ed04fe1b523ac605e1d5a0b02ec976326fbc8d72312c0cdaf80965f7`。host capability partial（Gemini CLI不在PATH）照實保留。
- browser-close.json / cleanup.json：Browser.close、supervisor exit0、owned root absent、isolation marker absent；未並行Node/ZIP與browser。
- source-sha256.json：最終5 source；reviewed-source-sha256.json：舊review候選5 source。untracked-sha256.json：四個既有檔hash不變。red.log僅去reporter行尾空格，失敗內容保留。

歷史 NO-GO、browser scan limit與focus failure保留。PGQ維持S3-MOTION的28 unique inherited evidence，沒有本輪fresh PGQ。
下一步：Owner手動交targeted re-review，重點檢查guardedEscape與普通cancel。未merge/push/deploy；無新visible review task。
