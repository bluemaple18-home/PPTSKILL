# Core3 正式受管產品驗收：PASS

日期：2026-09-29。固定 AI Core canonical `71b774d31b8e7aa9e05786c8dc431c7528dabdc1`；產品 packaged `9ce7396a481621960f6f2c89ff7fcf352c0e515a`／code `f3d8a11865a5af25f34a08a5b65dccb3fed6914f`。

本輪只有一次正式 host run，無額外 smoke／重試。沿原 tmp_session browser -- client 入口，Chrome 15546、client 15554 共用 outer PGID 15537；browser/client raw exits 均0。client 映射 generic managed port 至 PPT port，固定產品與四支 PGQ 都以普通 child 繼承同群組，沒有第二個 supervisor／signal controller／cleanup authority。

## 產品與清理

- 1280×720、1600×900 各11項 PASS；含真 toolbar、Ctrl+Shift+Z、group-lock replay、export/offline reopen。console/page/network/HTTP/remote errors 均空、traceback false、targetClosed true。IME 未增加原生 OS 測試；不作視覺設計品質宣稱。
- 四支 PGQ 串行 **16/16 PASS、0 fail、0 skip**，706156.966541 ms；raw log `pgq.log`。Browser.close、client、supervisor、controller 均退出0。
- exact root `/private/tmp/aic-b-3cd6b953fafb49d3aa2e39b0ce5eff28`、isolation marker 均消失；fresh full ps 的 root/outer group matches 空。非僅以正常 exit 推論 cleanup。
- 前後 AI Core 六檔、產品75來源／4 protected／ZIP一致；canonical tracked clean、兩 repo 原6個untracked SHA保留。原 nonbrowser1061與round08兩審CODE GO按固定bytes引用，未重跑、未改寫成fresh。

## 真實 ENOENT 恢復：RECOVERY_OBSERVED

705次 runtime＋1次 cleanup，共706 scans；705 COMPLETE、1 RECOVERED_COMPLETE，無FAILED／unfinished／diagnostic error。原始 journal 的每個 end 與 diagnostic 完全一致。

runtime scan **533**：第一次 attempt 在 `tmp/pptskill-geometry-wd8uUi` 的 before_stat 遇 `FileNotFoundError errno=2`，已觀察 entries945、partial bytes30586501/files747。第二次 whole-scan 使用同一root、同一總deadline，累計entries **1891**；30.442ms內完成，counts31252760/748。完整三層exception event及單一attempt診斷保留，沒有去重抹掉原始原因。

這證明本輪 managed runtime 真的走到一次 bounded ENOENT recovery；不是舊 smoke 已觀察 recovery，也不是原 R1 Default entry 的精確重播。取樣非原子／短命entry盲點仍是既定契約，不外推 hostile/compliance。

原64MiB／10000 files／3600s保持；scan觀察峰值 **31950380 bytes／751 files**。Foundation admission available 前74737777838、後74602671278 bytes，原 projected reserve gate 通過；詳 controller receipt，不以 raw free 代替 admission。

## 審查與限制

mapping A/B均GO，同一非阻塞P2保留：產品exit7後單次receipt EIO可使client scalar exit變2，原7仍留存、NOT_PASS且不啟PGQ。本輪未觸發。未修此P2，不新增Repair。原Crop F2/P2仍交Final Closure重判。

client/controller維持review固定hash。Mainline只調整pending拒絕測試為explicit fixture，使FINAL後可重播；fresh13/13、更新manifest test hash並FINAL，詳 `../host-owned-group-mainline-admission.json`。

可重現入口（需新的獨立輸出卡及manifest，不覆寫本輪）：原始確切command在 `controller-receipt.json`；raw artifact bytes/SHA256索引在 `mainline-verification.json`。此收據為host驗收PASS；Core3整卡裁決另見mainline closure，不預先把待審收尾當成完成。未deploy／production、未開Core4。
