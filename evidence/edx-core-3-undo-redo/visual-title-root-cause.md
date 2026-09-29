# 主標題碰撞：根因確認，修復範圍待Owner改判

**ROOT_CAUSE_CONFIRMED / FUNCTIONAL_PASS / VISUAL_NO_GO**。a3c93c8不推送，核心2/6；本文件不是修復完成或重新關卡。

Owner指出的視覺遮擋確實存在，但實測根因是Undo／Redo驗收fixture的A/B疊在標題上。原標題、source.html、兩份reopen-export的title都是「成果，不鎖在工具裡」，沒有BI。harness把A/B放在(120,120)/(360,120)，renderer正常把這兩個manual geometry元件渲染到slide上。selected.png拍於Undo專項之前，所以它們覆蓋主標題；A混進「果」，B混進「在工」，看似字形錯亂。

## 單變因正式host對照

每個viewport獨立重載相同原export HTML，原始檔前後SHA相同。Mainline已直接看六張PNG；字框相交僅作量測，不冒稱glyph ink檢測。

| case | 1280×720 | 1600×900 |
| --- | --- | --- |
| 原樣 | A/B都與標題相交、畫面重疊 | A/B都與標題相交、畫面重疊 |
| 只tracking改0 | 仍相交，且標題換行，A/B仍混入文字 | 仍相交，且標題換行，A/B仍混入文字 |
| 原tracking不變，只A/B top=600 | 標題恢復可辨識，兩個相交面積均0 | 標題恢復可辨識，兩個相交面積均0 |

移A/B時title完整snapshot（文字、font、tracking、bounds）與rightquote完整snapshot逐物件不變；不是靠改字體、viewport、選取框或標題位置藏掉問題。保留-.075em（computed -4.05px）仍可清楚閱讀原中文標題，故取消負字距不是本P1的根因修復。

完整raw：`visual-title-diagnostic-r1/diagnostic.json`，六張 `*-original.png`／`*-title-tracking-zero.png`／`*-fixtures-top-600.png`。cleanup：`visual-title-diagnostic-r1/cleanup-verification.json`；browser/client/supervisor0、root/marker消失、fresh group/root matches空。diagnostic結果只稱CAPTURE_COMPLETE，不當產品PASS或PGQ重跑。

初版診斷在第二case因Chrome把零letter-spacing序列化為normal而assert中斷，原script/log/首張PNG存`visual-title-diagnostic/`，exit1、browser0，root/marker/group已確認清理。唯一一次診斷修正只接受CSS等價的normal/0px，另寫client-r1與新目錄，沒有放寬重疊判定、修改scanner或掩蓋失敗。

## 待確認的最小修法

只將 `tools/edx-wp1-s4-browser-acceptance.mjs` 內A/B的y:120改為y:600，x／尺寸／標題font／copy／產品runtime不動。新增標題與可見A/B的bounding-box不相交gate；A/B必須仍存在且在頁內，不用隱藏fixture避測；保留兩viewportPNG人工核對。原位置須RED，新位置GREEN，重跑雙viewport與affected四PGQ，再裁決是否關卡。

此方案改驗收fixture，不是產品變更；75產品來源／四protected／ZIP目前全部SHA不變。Owner先前明示font/spacing-only與新ZIP，實測根因不在該scope，已請Owner確認是否改採上述fixture/gate方案；回覆前不套用修復、不改產品、不重跑PGQ。

原AI Core71b774d3、已推b20ee40、舊功能與真ENOENT recovery證據保留；原receipt I/O非阻塞P2與Crop F2/P2仍保留。

## Owner接續指示

Owner在白話說明fixture方案後指示「繼續？」；現已授權只修fixture與gate、重跑雙viewport／affectedPGQ，產品與ZIP不動。上文待確認描述為診斷完成當時狀態；本輪開始實作，驗收完成前仍VISUAL_NO_GO，不push。
