# WP2-S3 focus/mode bounded repair

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Reviewed candidate 尚未裁決；product `c43e480e9504f9b2da3ff6c1fdc31b30ee81c038`。

## 根因與修改

沿 CodeGraph 查詢沒有命中相關 symbol，改用 bounded source read。focusin 在 layout button 取得焦點時原本會 clearTypographyTarget，隱藏控制列中的字級區，早於 click 的 mode transition。mounted regression 明確重現 focusin 後 hidden=true（RED），最小修正保留 `.pptskill-editor` 內焦點，原 typography scope 保留以維持既有獨立 toolbar fixture；真正 setEdit(false) 與 slide identity change 仍清 target。沒有新增 clipboard/geometry/schema authority；AI Core 未改。

修復後 mounted 新 regression PASS：mousedown/focusin 尚為 edit 且 toolbar 不隱藏；mouseup/click 轉 layout 後清 target；離開 editor 仍清 target；canonical 不變。WP2-S3 targeted 10/10，全 non-browser 442/442；ZIP lifecycle PASS。

真 browser 1280×720、1600×900 各14 checks PASS。按下 layout 後 mode=edit、toolbarHidden=false、focused=true、hit=true；同座標 release 後 mode=layout、toolbarHidden=true，delete 真按鈕可用。來源刪除後 snapshot、export/live clipboard、offline reopen空clipboard均通過。errors/remote 全0，targetClosed=true。

舊版本的按鈕位移未錄得 live 中間 rect，所以不宣稱已 fresh 重現舊版完整 pointer 取消鏈；既有 browser FAIL、mounted RED、修復後同路徑 live PASS 支持 focus ownership 是此 seam 的修復。歷史四輪 FAIL 均保留，未重寫成 PASS。

## 完整性與限制

source9、protected4 及ZIP以source-hashes.json鎖定。ZIP 2,287,440 bytes，SHA-256 `da3d95777124daaf43f70ab7de6a898715d2e2cff28969634694f575ea3119a1`。

IME僅 browser synthetic CompositionEvent，非OS IME。四支affected PGQ串行單輪16/16 unique named PASS；readiness/browser/PGQ/Browser.close/supervisor全exit0，owned root與isolation marker均absent。source9/9、protected4/4、ZIP前後MATCH；詳focus-repair-verification.json。未 merge/push/deploy、未開下一Slice；Independent Review pending。

## Mainline closure

WP2-S3 COMPLETE / INDEPENDENT_REVIEW_GO。Owner回傳獨立review：P0/P1/P2/P3全0，reviewer fresh targeted10/10、full442/442；browser/PGQ為已提交evidence獨立核對。主線fresh核對source9/9、protected4/4、ZIP bytes/hash與product→handoff無delivery drift；reviewed code/ZIP未改。完整verdict見independent-review.md。未merge/push/deploy，未開下一Slice。
