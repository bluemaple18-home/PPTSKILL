# 核心完整版 1/6：Crop＋Evidence 圖片安全裁切

Status: ACTIVE / ARCHITECTURE_MAPPING
Branch: codex/edx-core-crop-evidence
Base: 01e89d1（S18 主線 closure＋證據格式補正；尚未merge/push）
Owner scope: tasks/edx-core-six-card-closure-plan.md 第1項；原六張計數不增減，不開S19。
Traces to: BACKLOG.md §10.1 Replace-first + Safe Insert、§10.2 Cropper.js prior art、§10.3 EDX-WP2 Content/Asset Editing；working-spec.md FR-003 deterministic validation、FR-005 portable editor safety、SC-002 offline雙尺寸、SC-004 claim來源可定位。

## 本卡完整交付

人手可選單一圖片，開裁切介面、預覽、取消或確認，重設完整原圖；保存／離線重開仍能調整或還原。沿現有executeOperation／stable identity／asset authority，不另造editor model或永久DOM authority。Evidence圖片的來源完整性與重要上下文必須有明確guard；保留完整原圖，不以裁切結果取代唯一Evidence。
原圖dataUri不可因crop重採樣／覆寫；同一geometry／motion與其他內容保留。crop既不是resize，也不能把vendor transformed viewport payload直接寫canonical。
本張包含必要schema/sanitizer、共用Node/portable contract、renderer、UI、export/reopen、測試、vendor及驗收；Mapping/Implementation/Acceptance只是本卡內階段，不能拆新主卡。

## 已測得缺口及最小研究

2026-09-24 Mainline CodeGraph查crop/image只回無關symbols，限域rg確認：image component只有id/type/alt/dataUri/fit；沒有crop或Evidence image分類。claims/sourceRefs是deck/slide層級，不能自動當圖片provenance。既有replace-asset只投影img src/alt/object-fit；normal renderer與portable各有markup seam，必須同一純投影契約。
官方Cropper.js API提供selection與image transform；目前docs顯示2.2.0，但尚未核registry pin／license／bundle，不能宣稱已採用。參考 https://fengyuanchen.github.io/cropperjs/api/cropper-selection.html 與 https://fengyuanchen.github.io/cropperjs/api/cropper-image.html 。

先完成同一卡mapping：
1. cropper selection→原始像素／normalized rect的轉換，非方圖、縮放／位移／兩viewport；與canonical component geometry分離。實測前不得直接採vendor event。
2. 比較保留原圖的最小投影方法，說明與replace/fit/geometry/motion的相容性及export尺寸成本。禁第二份全DeckSpec或per-pointer whole payload serialize。
3. Evidence guard：不得把「原圖還在」等同「裁切沒遮標籤」，也不能虛構OCR／自動語意驗證。比較既有分類缺口下的保守policy、顯式人手確認與必要的protected region；選最小足夠方案並明示能力界線。
4. runtime-native優先；若native control不能滿足互動需求，採exact-pinned MIT Cropper.js薄adapter。核原始授權／integrity／dependency與portable成本，不採CDN或latest。
主線先裁決mapping再實作；不把研究artifact當production驗收。

## 驗收契約

- 原圖保留、合法crop/reset、非法範圍／NaN／零尺寸／wrong target原子拒絕；Node/portable一致。
- 使用多色且含軸／標籤的非方image fixture，正確比對裁切內容，不能再用1×1白圖冒稱像素驗收。
- Evidence guard對缺少分類／確認、保護區被裁掉、換圖後舊確認、原圖取回有具名驗證；語意人工確認與程式幾何檢查分列。
- Cancel/Escape、stale identity、slide switch、async decode、busy chooser/dialog／gesture、失敗rollback、單次revision與selection清理均沿既有契約。
- Replace預设保存既有geometry與crop意圖；若原圖變更導致Evidence確認失效，必須明示且重新驗證，不能默默沿用舊來源確認或移除原Evidence。
- schema/sanitizer/renderer/editor/export/recipient reparse一起保存，舊deck不受影響；20MiB不放寬，export無cropper chrome／transient state。
- scoped與full nonbrowser、fresh ZIP lifecycle；正式managed browser雙viewport 1280×720/1600×900，真pointer與pixel／computed assertions、errors0、targetClosed；四支affected PGQ串行16與完整cleanup。
- Review依實際風險；不默認新增每個子階段Reviewer。主線驗收後停獨立candidate，未授權merge/push/deploy。

## 範圍及回退

不做Group/Lock、Undo/Redo、draft/recovery、Recompose、video、AI bridge、任意rotate/skew／image filter。原始image不可被不可逆替代。單branch順序writer；source/ZIP/protected基準沿S18記錄，開始實作前另存本卡baseline。
初始委派只做唯讀mapping與自有隔離probe，輸出 /private/tmp/pptskill-core-crop-mapping.md；禁改repo/AI Core、禁browser launch／install／build／git mutation。主線同時收尾S18證據，不重複Worker研究。
