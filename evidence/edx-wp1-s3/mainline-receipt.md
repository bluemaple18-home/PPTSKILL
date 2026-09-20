# EDX-WP1-S3 Mainline 驗收 receipt

## 交付契約

- Base：`b43def29751fa8d964a5fa59d90c77df1fadc729`；branch：`codex/edx-wp1-s3`。
- 只交付 component-only `move-element`／`resize-element` canonical operation；獨立 review 已由 Owner 回傳 GO，適用於 `51494b35e5462311d37d1411793bc14780483359`，尚未整合 main。
- Owner 於本輪授權以可用 GPT-6 Astra 替代原 GPT-5.5 跑道。採一名 high Worker、clean context、shared workspace 單一程式 writer；Mainline 保留裁決與驗收。派工 prompt 1978 bytes，native context gate PASS；未建立額外 task／worktree／registry。
- 既有 optional CompositionSpec seam，未升 schemaVersion；無新 dependency、Moveable／Selecto／Floating UI、interaction UI、history 或 AI bridge。

## 證據與修正

- `red.log` 保留缺少 geometry operation 的 public-interface RED；`focused.log`、`compatibility.log`、`nonbrowser-full.log` 為修正後 GREEN，exact commands 見 `worker-receipt.md`。
- Mainline 自驗補出合法 `constructor` component ID 的 prototype lookup 問題；改為 own-property lookup，Node／browser／renderer 均有回歸。
- `geometry-static-initial.json` 精準拒絕 renderer／browser attribute 順序不一致。統一 canonical 序列化後重建 fixture，沒有放寬 content／geometry／raster gate。
- 最終實機證據只採 `browser-final/acceptance.json`：static／normal × 1280×720／1600×900 四組 PASS，operation／reopen／prototype 的 canonical authority 均通過。先前 `browser/` 為歷史證據，不用來證明最終 candidate。
- `geometry-static.json` 與 `geometry-normal.json` 直接驗證真正 browser export HTML：兩 viewport 的 runtime、contentIntegrity、requiredVisibility、rasterVisibility、geometry、motion 全 PASS；console／pageerror／network／HTTP 均 0。
- 主線目視核對 `geometry-montage.png`，manual component 與 legacy component 皆可見；視覺證據不取代上述 gates。
- `verification-source.sha256` 綁定最終 browser／ZIP 所用 runtime 與 tools，逐檔核對 OK。geometry QA producer 在 PGQ suite 啟動前已凍結；後續 renderer 的 geometry attribute 修正不改無 override 的 PGQ legacy fixture 路徑。

## Fresh ZIP

- `dist/PPTSKILL-0.1.0.zip`：2,155,908 bytes，低於 12 MiB warning／20 MiB hard gate。
- SHA-256：`150a23fa7fe9ab643c80009b5d22b3320811911eb7fade2e952379c61d9c0258`。
- `distribution-build.json`、`distribution-lifecycle.json`：fresh build／install／smoke／uninstall PASS，profile 保留測試 PASS。
- Host capability 為 partial：本機缺 Gemini CLI；這不影響 ZIP lifecycle，亦不宣稱已做 Gemini CLI 實機驗證。

## Browser 生命週期

- Chrome MCP 無可連 DevToolsActivePort；改用已授權的 sandbox 外 `tmp_session.py browser`，未碰使用者既有 profile。
- 初次預設 Chrome 背景活動觸發 64 MiB runtime budget stop，exit 2；`managed-browser/evidence/` 保留記錄，該 owned root 已消失。
- 第二輪仍維持 64 MiB／10000 files／1800 seconds 上限，以本輪 wrapper 停用背景 networking／component update／sync／default apps／extensions／GPU；未放寬容量 policy。實測 profile 約 5.4–10.3 MiB。
- 第二輪透過 owned browser CDP `Browser.close` 正常結束，tmp_session exit 0；兩輪 owned root 均已驗證消失，詳 `lifecycle-cleanup.json`。第二輪最後取樣約 11 MiB，仍低於原上限；每個 test 只關自己的 target。

## 最終主線裁決

- Focused：26/26；compatibility：42/42；non-browser full：214/214；PGQ suite：28/28；full regression 合計 242/242 PASS，無 skip。Focused／compatibility 為重疊驗證，不重複加進 full 總數。
- PGQ 串行命令：`PPTSKILL_DEVTOOLS_ACTIVE_PORT=<本輪 owned port file> node --test --test-concurrency=1 tests/pgq-wp4-s*.test.mjs`，exit 0；涵蓋 installed sample/full-deck、content tamper、required visibility 與 raster rejection。
- Runtime／schema／tools syntax、source SHA、ZIP SHA 與 `git diff --check` PASS。
- 結論：**COMPLETE — INDEPENDENT REVIEW GO**；P0 0／P1 0／P2 1／P3 0。GO 由 Owner 在本 task 回傳，並非 Mainline 自封的獨立 review。
- Reviewed commit：`51494b35e5462311d37d1411793bc14780483359`；source review range 為 base 至該 SHA。後續 closure commit 僅改 control documents，不改 reviewed code／ZIP。
- Reviewer 自行重驗 source SHA、focused 26/26、non-browser full 214/214、diff check 與 ZIP SHA。其受管 Chrome 遭自動安全審核拒絕，native DevTools 無可連 port，因此 PGQ／static／normal browser 部分是核對已提交 evidence，沒有 reviewer fresh rerun；Mainline 本輪 fresh evidence 仍保留原實測來源。
- 殘留 P2：manual geometry 的 `transform:none!important`／`scale:none!important` 會抑制既有 component motion 的 transform 部分，與 descriptor 完整 preserves motion 的宣告有落差。接受為不阻擋 canonical geometry contract 的已知限制；後續修復須補 normal-mode moved-component motion regression，不直接改動本 reviewed candidate。
- Review handoff：`handoff_20260920_edx_wp1_s3_review.md`。

## 邊界與剩餘事項

- 未 merge／push／deploy；四個既有 untracked 原樣保留。
- 首次 geometry operation 的另一半尺寸／位置採 deterministic manual default `{x:800,y:280,width:640,height:480}`，不是 legacy flow box 的 DOM 反推；此限制已明示於 Worker 契約，interaction Slice 不在本輪。
- Review GO 已收到；下一步等待 Owner 指示整合或後續 Slice，不自動 merge／push／deploy。P2 留在本 task 的殘留事項，未另建流程或開卡。
