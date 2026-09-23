# WP2-S14 Mainline acceptance

Status: MAINLINE_ACCEPTANCE_PASS / INDEPENDENT_REVIEW_PENDING
Candidate: `e595b84638da36fc73c2e6c7cc31ff1f05f57962`
Runtime product: `a3d1cdb40514ceaf5a9497d3efdd0c324eab958f`
Base/main/origin-main: `b08c4d34cb7ff950a6bf0ab70f4fe172f270f186`
Branch: codex/edx-wp2-s14-edit-text-component

## 裁決與範圍

root question：既有 edit-text 能否以 stable identity 原子更新 text component，沿 S13 同一文字政策且不擴 S1 direct UI？Mainline 驗收通過。blocker：無；fork：無。下一步為獨立 review；GO 前不得稱 closure。不 merge/push/deploy S14、不開 S15。

Node／portable 共用 exact edit-text request 與 1–500 Unicode codepoint text validator，只更新 canonical type=text。Mounted 原地純文字投影、setter before/after throw rollback、同值 no-op、成功一次 revision／取消 preview／清 selection；角色文字 UI 與既有 File adapter 邊界保持。詳 task 與 mainline-check.md。

## Fresh verification

單一 clean Worker scoped 最終 **122/122 PASS**，S14 新增 **29** cases。Mainline **71 檔 full non-browser 763/763 PASS**；build／installed ZIP lifecycle PASS。這些在 runtime product 上執行；後續 candidate 僅修 browser fixture，runtime/tests/ZIP 無變動，沒有冒稱修 fixture 後又重跑 full。

正式 managed host retry：1280×720／1600×900 各 **69 records PASS**（base10＋S8 image40＋S13 text13＋S14 6）。S14 含初始化 geometry、snap false/true × drag/resize 四組真 pointer preview 中 API edit 取消、invalid/no-op 保留，以及既有／新增／跨頁／escape／setter rollback／synthetic IME／export offline。console/page/network/HTTP/remote 全0、targetClosed=true。兩張截圖已實檢，固定框文字裁切限制見 visual-check.md。

四支 affected PGQ 串行 **單輪16/16 unique PASS**。readiness／Browser.close／supervisor exit0，owned root 與 isolation marker 不存在。Source **6/6**、protected **4/4**、ZIP hash MATCH，ZIP 內兩個 runtime 與 source byte-match。詳細 artifact hashes、checks、cleanup 見 host-final-verification.json 與 host-harness-repair/controller-receipt.json。

ZIP：2,296,447 bytes，SHA-256 `0749990f26a6f65619d23744802d38e67428a4c90ce99e52fd4891b65b27c74b`。

## 失敗歷史與證據

Worker RED **11/26 pass**、中間 **23/26** 與 scoped119 均保留；中間修正為 fixture／既有 Node role policy 期待，沒有放寬產品契約。worker-receipt.md／worker-*.log 保留細節。

首輪 host-acceptance 是 FAIL：1280 既有63 records通過，S14第一組 gesture start 失敗；asset fixture 沒給 portable-quote geometry，interaction.begin 無有效 rect。主線查實際 source.html 後，只補既有 UI initialize-layout 與 canonical geometry assertion。`a3d1cdb → e595b84` 僅 tools/edx-wp2-s14-browser-cases.mjs；runtime/tests/ZIP 不變。首輪 target／Browser.close／supervisor／owned-root cleanup 通過，未跑1600或PGQ，沒有覆寫成一次全綠。host-triage.md及host-acceptance/保存原證據。

完整原始 logs 另存 .gz，raw-log-hashes.json 綁定原始 bytes；文字 logs 只移除行尾空白以通過 git diff --check。S8/S13 歷史環境 I/O 根因仍未知，不因本次成功宣稱修復。

## 驗收邊界

這是 API-driven text-component edit-text；component 仍 contentEditable=false，未新增文字 toolbar／native IME／OS clipboard。IME 證據為 synthetic lifecycle。固定 geometry 無自動縮字或避障 claim。Worker 自稱 review candidate 的 scoped 狀態已由 Mainline 更正，只有正式驗收後才達本狀態；本 receipt 不是 Independent GO。
