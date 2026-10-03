# Core6：六張核心功能的 Final Closure

Status: CORE6_CLOSED / FUNCTIONAL_PASS / VISUAL_PASS / INDEPENDENT_CODE_HOST_ZIP_GO / MAINLINE_INTEGRATED / TOTAL_ACCEPTANCE_GO / CORE_PROGRESS_6_OF_6
Branch: `codex/edx-core-6-final-closure`
Base: Core5 `eca7a2b3a9c0fb7cd567b175d5c00ae12e7b5c95`；遠端 `codex/edx-core-5-reset-recompose` 已核對同 SHA。
Traces to: `tasks/edx-core-six-card-closure-plan.md` 第 6 項；`working-spec.md` FR-003／FR-005、SC-002／SC-004；`BACKLOG.md` EDX-WP4 compatibility。

## 目標與邊界

以同一份 DeckSpec 收齊舊資料 migration、新 deck 儲存／離線重開、recipient 只憑交付 HTML 重新解析、完整非瀏覽器回歸、ZIP 實體與雙 viewport 正式 browser 驗收。重用 Core1–5 的 canonical、sanitizer、renderer、editor、export 與受管 host；不新增第七張產品卡、第二份資料正本、新 runtime 或服務。

本卡先驗證既有能力與實際缺口。沒有測得阻塞缺口，不改產品。原 Core1 Crop F2/P2（teardown 已完成副作用後拋錯，observer/load ownership 可能失真）及 Core3 receipt I/O P2 須重新裁決影響與驗收方式；原 finding 不因正常路徑 PASS 自動關閉，也不預先授權 Repair2。原 `tasks/edx-core-six-card-closure-plan.md` 工作樹修改及四個 protected untracked 不納入本卡。

## 驗收契約

1. **來源與身分**：鎖定 base、產品來源、fixture、ZIP、四個 protected 與 AI Core 受管入口的前後 SHA／大小；檢查 HEAD、tracked drift、工作樹例外。任何驗收期間身分漂移即 NO-GO。
2. **Migration／recipient**：至少一份舊格式 fixture 經現有 migration／sanitizer 後保留可辨識的 slide／content／stable identity；crop、group/lock 與 reset/recompose 的已提交結果在新 deck export／reopen 不被丟棄，history 與本機 draft 等暫態資料不夾入交付 HTML。recipient 僅取得交付 HTML 時，能由現有 `extractDeckSpec()` 重建相同 canonical；沒有本機 profile／prompt／路徑／私密原件洩漏。
3. **回歸**：fresh 完整非瀏覽器集合報唯一檔案數、tests/pass/fail/skip；ZIP 建置／探針及包內 runtime 與工作樹核對。失敗保留原始結果，按受影響路徑最小修復與重驗。
4. **正式 browser**：沿既有受管 Chrome／單一 owned group，1280×720 與 1600×900 對完整交付 HTML 驗證可見性、overflow、canonical／DOM、保存／離線重開與 recipient reparse；console、pageerror、network、HTTP、remote request、target、草稿 key、root／marker／程序 cleanup 與四支 PGQ 原始收據齊全。不以 Node 模擬或狀態文案替代。
5. **殘留與裁決**：逐項記錄 Crop F2/P2、receipt I/O P2 的 trigger、影響、既有保護、是否真阻塞及理由；若需要產品修復，先提出最小 delta 與新驗收，不自動啟 Repair2。CODE／HOST／VISUAL 與 ZIP 原始證據獨立複審後，Mainline 才能裁決 6/6。

## 順序與停損

- Frontier A：唯讀 preflight、既有 migration／recipient 路徑及兩個 P2 的證據重判；確認需不需要產品 delta。
- Frontier B：鎖定 cross-feature fixture／recipient/export 契約，跑有界非瀏覽器與 ZIP；只有 A 無阻塞才啟動。
- Frontier C：正式受管 browser／PGQ／清理與獨立複審；只有 B PASS 且產品身分固定才啟動。
- 同類兩次無進展回主線重判，第三次硬停；不以換 harness／executor 重置 blocker。沒有正式 evidence 不宣稱 6/6。未獲另行授權不 merge、push、deploy 或進 production。

## 本機候選與交接（2026-10-01，歷史階段）

- 遷移測得一個真缺口：舊 fixture 會輸出 renderer 已不接受的 `title-body` primitive。產品只把 migration 與兩處缺省值改為既有 `title-points`，不新增 renderer 分支。跨功能契約測試見 `tests/edx-core-6-final-closure.test.mjs`。
- Fresh 非瀏覽器 74 檔、1034/1034 PASS；ZIP 建置與隔離探針 PASS。受管 host 第 04 輪雙 viewport 六項 gates、recipient 匯出重開 PASS；四支 PGQ 16/16 PASS。Browser.close、root／marker／原 PGID 清理及 98 項身分前後一致。
- 第 01–03 輪是驗收工具／執行環境錯誤，原始失敗證據保留，未算入 PASS。第 04 輪是唯一正式通過的 host 收據。完整索引與限制見 `evidence/edx-core-6-final-closure/mainline-candidate-20261001.md`。
- Core1 Crop F2/P2 與 Core3 receipt I/O P2 均維持 OPEN residual；正常路徑通過不代表故障注入已關閉。候選階段等待獨立 code／host／visual／ZIP 複審與 Mainline 裁決，當時未更新為 6/6。

## Mainline 最終裁決（2026-10-01）

獨立複審已回報 **FINAL CODE／HOST／VISUAL／ZIP GO**，且 fresh 74 檔 1034/1034、雙 viewport 六 gate、PGQ 16/16、98 項身分與 14 份 host artifact 的原始證據均再次核對相符。Mainline 裁決 **Core6 本機結案，整體 6/6**；詳見 `evidence/edx-core-6-final-closure/mainline-closure-20261001.md`。上節是候選階段的歷史交接，不再代表目前狀態。Crop F2/P2 與 receipt I/O P2 仍為 OPEN residual；Gemini CLI 缺失只使本機 host capability 為 PARTIAL。此裁決不包含 push、merge、deploy 或 production。
