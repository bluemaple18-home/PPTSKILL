# EDX-WP1-S4 Mainline receipt

狀態：REVIEW CANDIDATE。主線驗收已完成，Independent Review 尚未執行。以下保留各階段紀錄；最終裁決以本文件末段為準。

## Root question／bounded decision

S3 在 `20b54ac64c99682a20c0af1a71ceb7b4fa6de406` 已 Independent Review GO；本輪只補 single-component Moveable pointer → S3 operation → portable export/reopen 路徑。stacked branch `codex/edx-wp1-s4`，不 merge／push／deploy、不開 S5。S3 已知 motion transform P2 延續，不修復或宣称已解。

## Delegation／source boundary

Owner 要求主線繼續且決定派工；沿既有 Astra 替代授權。一名 native clean-context Worker，共用工作樹 sequential code writer；Mainline 寫 control/evidence 並負責 fresh browser／最終 ZIP 收證。preflight 見 mainline-preflight.json；四個原有 untracked 的比對基準見 preexisting-untracked.sha256。

## Dependency measured exception

`moveable@0.53.0` 的 upstream lock closure 含未用的 react-selecto/selecto；Mainline 容許留在 package install／lock，不改上游 dependency metadata。禁止 direct Selecto import、bundle 或功能。實測初探 esbuild 16 inputs、0 Selecto inputs，見 transitive-boundary-probe.json；仍須由正式 vendor build/verifier 證明，初探不能代替最終驗收。

`croact@1.0.4` tarball 無獨立 LICENSE，但實際 `dist/croact.esm.js` 開頭含 Copyright (c) Daybrush、license: MIT、version: 1.0.4 與官方 repo URL。Mainline 要求 pinned fallback 保留原始 banner、source hash，另明示標準 MIT permission text 的補充来源，不虛構 upstream LICENSE 檔／年份。其他 bundled dependency 仍各自檢查 attribution。Worker 負責正式產物與 verifier。

## 待驗收

- producer freeze、focused／compatibility／non-browser full、syntax／diff。
- fresh owned Chrome：真 pointer drag/SE resize、cancel/no-op/invalid、mode/legacy initialization、preview export、offline reopen/re-edit；雙 viewport。
- 最終 export static/normal geometry/content/raster/motion gates；PGQ browser full。
- ZIP build/install/smoke/uninstall、actual bytes/SHA、source manifest before/after。
- owned browser lifecycle cleanup；僅四個既有 untracked 保持原樣；獨立 review handoff。

## 主線 fresh 驗證（PGQ 尚在執行）

- Worker source SHA 16/16 符合後執行；主線 verification-source.sha256 再包含既有 geometry/spec/QA/ZIP seam，共21檔。
- focused 25/25、compatibility 53/53、non-browser full 225/225 PASS。
- browser-attempt-1/acceptance.json：1280×720、1600×900 全部PASS，真 pointer drag/SE resize、Escape/no-op/invalid、preview export、offline reopen/re-edit、模式互斥；console/page/network/HTTP/remote request全0，各自target已關。首次fresh run即通過，不需repair。
- 最終真匯出為 browser-attempt-1/1600-reopen-export.html；geometry-static.json、geometry-normal.json 在兩viewport runtime/content/required/raster/geometry/motion全PASS。主線檢視geometry-static.png與geometry-montage.png；文字可見且無裁切。Motion gate PASS不代表S3 transform P2已修。
- 新ZIP 2,248,891 bytes，SHA-256 `4aa7fa8a683b57b49a1d6a3ad2ea87b77f0312f1731b724abfb240d9ac47402c`；build與實測一致，lifecycle/package smoke PASS。Host capability partial：Codex/Claude可辨識，Gemini CLI缺席，不能聲稱Gemini host已測。
- 本輪 .tools/edx-wp1-s4 下載cache已移除；四個原有untracked hash全部符合。
- PGQ仍執行中；owned Chrome尚待suite完成後清理。

- 主線另檢視 browser-attempt-1/1280-selected.png：選取框、右下handle與既有toolbar正常，文字可讀。Worker已完成交付並關閉，後續僅主線control/驗收收尾。

## PGQ 環境中止／bounded retry

首輪 pgq-browser.log 26/28 PASS，最後 installed qa-full-deck 與 required visibility 失敗；同時 owned browser supervisor exit 2，明確回報 `NO_GO: resource observation unknown (scan limit)`。既有 lifecycle 對一般profile使用100ms觀測窗或entry上限，訊息本身不區分哪項觸發，不能宣稱磁碟滿或產品錯誤已確診。profile已清理，見 browser-environment-interruption.json 與 managed-browser/evidence。

主線維持原64MiB/10000files/1800s限制，以新owned profile重驗2個受影響case；test-name-pattern另外匹配一項已通過的coverage test。不修改producer、不調整lifecycle閘門、不重跑已通過的26項。重驗結果待 pgq-browser-retry1.log 完成；不能將首輪26/28寫成單輪28/28。

## 最終裁決／evidence boundary

**READY FOR INDEPENDENT REVIEW**；不是 independent GO，不是 S4 closure。

- PGQ 重驗 exit 0、3/3 PASS（pgq-browser-retry1.log）。兩個受影響 case 均已重驗通過；相同來源 28 unique PGQ cases 全覆蓋。首輪 26/28 與環境中止均保留，不偽稱單輪28/28。首輪 log 僅清除2行 trailing whitespace，失敗文字未改。
- Full regression coverage：non-browser 225/225＋PGQ 28 unique cases；focused25／compatibility53為重疊子集，不能相加成額外測試。
- `source-check-after.log`：21/21 source SHA一致；final ZIP SHA與distribution-measured.json一致。未在測試後改 producer。
- `lifecycle-cleanup.json`：原 profile 已由失敗時 supervisor 清理；重驗 Browser.close 嘗試在退出時回 WebSocket ErrorEvent，但 supervisor 最終exit0且owned root不存在。兩個exact owned roots均已獨立確認移除，未碰其他browser。
- `main` 保持 `b43def29751fa8d964a5fa59d90c77df1fadc729`。本卡branch從S3 closure相依疊加；四個既有untracked hashes不變，本輪下載cache已清除。
- 限制：既有S3 motion transform P2保留；Gemini CLI未安裝，host capability partial；獨立review尚待Owner交付。無merge／push／deploy，下一Slice未開。
