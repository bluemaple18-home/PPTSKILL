# 六張核心功能整合後總驗收收據

Decision: **TOTAL_ACCEPTANCE_GO / CORE_PROGRESS_6_OF_6**。基準為已推至 `origin/main` 的 `df4068868c0475b3ed1a2959a29f583ebed99ef9`；本收據對應其上僅修正 UI 層級與補驗收控制點 hit-test 的整合版本。最終 commit／遠端 SHA 應以 Git 查核，不以本文件自證。

## 發現與修復

- `feature-host-01`：Core1 1280×720 的 drag 成功，SE resize 期待 600×400、實得 640×480，NOT_PASS；target、Browser.close、root／marker cleanup 正常。
- `feature-host-02`：只作診斷重播，滑鼠在 (1184,624) 的 `pointerdown/mousedown` 實際命中 `.pptskill-editor`；resize 前後 DOM 與 canonical 皆 640×480。這是面板覆蓋 Moveable 控制點，並非交易回退；第二輪仍 NOT_PASS，原始收據保留。
- 最小修復：`runtime/deck-editor.js` 中 layout 模式 `.moveable-control-box` 的 z-index 9999→10001，既有 browser 驗收在 SE resize 前確認 `elementFromPoint` 命中控制點。僅變更 CSS 層級與測試，不更換 geometry、交易、儲存、export、process authority。
- `feature-host-03` 修正後 Core1 1280×720／1600×900 各 45 項 PASS、錯誤 0、targetClosed；`feature-host-04` Core2 27／Core3 12／Core4 13／Core5 8 項在兩個 viewport 各 PASS、錯誤 0、targetClosed。兩輪 supervisor exit 0、Browser.close PASS、owned root 與 marker 清除。

## 最終同版驗證

- 74 檔非 PGQ fresh suite：**1034/1034 PASS，0 fail／skip**；焦點 interaction／Core2／Core3：96/96 PASS。`node --check`、`git diff --check` PASS。
- `pnpm run build:deck` 與 `build:dist` 完成。最終 ZIP SHA-256 `639a679b3fe8042624291b1c33d235c27d572a51426d4374619f166e5b45d294`；`probe:dist` lifecycle／package smoke／profile save／uninstall preservation PASS，Gemini CLI 缺失使 host capability PARTIAL。ZIP 內 `runtime/deck-editor.js` SHA-256 與來源同為 `2cf3c23a3033efafda3392ad07eb9ac2df32601b9694f0502c0816e7853e960a`。
- `evidence/edx-core-6-final-closure/host-acceptance-06/`：最終受管 Chrome、完整 10 頁；1600×900 與 1280×720 的 runtime/contentIntegrity/requiredVisibility/rasterVisibility/geometry/motion 六 gate 全 PASS，issues、console、pageErrors、networkFailures、httpErrors 全 0。匯出 HTML 離線 recipient reopen：10 頁／PASS。1280 montage 已實圖核對，且與修復前 host05 的 montage SHA 相同 `d7f975bf5324bded21cecc7cbf1559b7343fde38fb89f24fa3b884cb966def7a`，此次 CSS 差異限於 layout 模式。四支 PGQ 原始 TAP 1+7+7+1 = **16/16 PASS，0 fail／skip**。client PASS，Browser.close PASS，supervisor exit 0，owned root 與 marker 不存在。
- `identity-before.json` 對 `identity-final.json` 的 98 項 SHA：僅 `runtime/deck-editor.js`、`fixtures/full-deck.html`、`dist/PPTSKILL-0.1.0.zip`、`.zip.sha256` 四項按預期改變；其餘 94 項未變，含四個 protected、AI Core scanner／policy／capacity。`artifact-manifest.json` 保存失敗與成功 host 原始檔的大小、SHA-256；沒有把失敗輪合併成 PASS。

## 保留事項

Core1 Crop teardown F2/P2 與 Core3 receipt I/O P2 仍為 OPEN residual，正常路徑 PASS 不代表故障注入已關閉。本輪未重播 observer ENOENT recovery 或上述故障注入。未部署、未觸及 production。原有 dirty closure-plan 與 protected untracked 未納入交付。
