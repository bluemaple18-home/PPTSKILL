> **最新有效裁決：fixture修復後Core3已重新關閉（FUNCTIONAL_PASS / VISUAL_PASS），見 [visual-fixture-closure.md](visual-fixture-closure.md)。** 下方a3c93c8過早closure及其撤回聲明均為歷史，不作本輪證據。

> **已被 Owner 視覺P1裁決取代：FUNCTIONAL_PASS / VISUAL_NO_GO。** 下方為a3c93c8當時歷史結論，不能再作Core3 clean GO；a3c93c8不得推送，核心恢復2/6。修復契約：`../../tasks/edx-core-3-visual-title-repair.md`。

# Core3 Undo／Redo：Mainline closure GO

日期：2026-09-29。**CORE3_CLOSED / HOST_ACCEPTANCE_PASS / RECOVERY_OBSERVED**。六張核心主卡已完成 **3/6**，剩3張；Core4尚未開工。

產品固定 packaged `9ce7396a481621960f6f2c89ff7fcf352c0e515a`／code `f3d8a11865a5af25f34a08a5b65dccb3fed6914f`；本輪沒有產品 delta。AI Core canonical `71b774d31b8e7aa9e05786c8dc431c7528dabdc1` 已整合 scanner R2 與同群組 client 接點。

## 關卡證據

| 驗收 | 已成立的證據 |
| --- | --- |
| 產品 code review | `review-round-08.md` 原A/B CODE GO，固定bytes未變；不冒稱本輪重審全部產品 |
| Nonbrowser／distribution | 原1061/1061、ZIP lifecycle及75source byte match，固定hash引用；本輪再次75/75、protected4/4、ZIP MATCH |
| Client薄接線 | A/B獨立GO；Mainline FINAL後offline13/13。Chrome/client/普通descendants共用原outer group，唯一停止與cleanup authority不變 |
| Browser | 本輪唯一正式host，1280×720與1600×900各11項PASS；真toolbar／Ctrl+Shift+Z／group-lock replay／export offline reopen；errors空、targets關閉 |
| PGQ | 四支串行16/16、0fail、0skip；原raw退出0 |
| Observer | 706 scans、journal逐筆一致、無failed/unfinished；scan533真before_stat ENOENT→attempt2成功，entries945→1891，RECOVERY_OBSERVED |
| 容量與清理 | 原64MiB/10000/3600；峰值31950380bytes/751files；Foundation admission前後PASS；browser/client/supervisor/close全部0；root/marker消失、fresh group/root matches空 |
| 收尾獨立核對 | `host-owned-group-review-a-host-closure.md`、`host-owned-group-review-b-host-closure.md` 均GO，未發現固定Core3範圍仍有blocking evidence；僅唯讀核對本輪raw，沒有重跑host |

完整host主線收據：`host-acceptance-owned-group/mainline-receipt.md`；37份raw artifacts的SHA索引：`host-acceptance-owned-group/mainline-verification.json`。A/B code與host evidence verdict分開保留，不把offline mock算host、也不把本輪host說成Reviewer親自再跑。

## 保留限制

- Mapping A/B共通非阻塞P2：產品非零後單次receipt I/O故障，client scalar可由7改2，但原7留存、NOT_PASS、PGQ不啟動；本輪未觸發。原findings與probes保留，沒有假稱已修。
- 原Crop F2/P2仍OPEN，交第6張Final Closure重新判定，不藉此關閉、不提前授權Repair。
- Scanner仍是非原子取樣；短命entry盲點與Rule24既定契約相同。真recovery位於managed tmp子目錄，不宣稱精確重播原R1 Default path或hostile/compliance。
- Chrome全程序stderr有背景訊息，原log完整保留；產品頁面error arrays空不代表瀏覽器全程序零stderr或零背景網路。
- 本輪只有功能runtime驗收，未增加原生OS IME或視覺設計品質宣稱。

## 推送與交付邊界

Owner「先推上去再繼續吧」已先完成兩個fast-forward push並核對遠端：AI Core main `71b774d3`、PPTSKILL Core3 `b20ee40`。之後本輪新增的接線／review／host證據與本closure形成local checkpoint，不混稱已在前一推送內。原兩repo共6個untracked檔bytes保留。canonical無tracked drift；產品／ZIP／protected不變。未merge PPT main、未deploy／production、未開Core4。

本輪bounded接線的回退是revert此local checkpoint；不刪歷史證據、不reset/clean、不修改已推canonical或產品。下一frontier僅為原第4張Local draft＋recovery，尚未啟動。
