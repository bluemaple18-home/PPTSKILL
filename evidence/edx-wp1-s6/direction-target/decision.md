# S6 方向語意／獨立 geometry target 驗證

狀態：MAPPING / ARCHITECTURE VALIDATION。兩項假設已有本輪實測結論；不是production review candidate，不要求Independent GO。

## 方法與可重播證據

`PPTSKILL_DEVTOOLS_ACTIVE_PORT=<owned portfile> node evidence/edx-wp1-s6/direction-target/probe.mjs`；分析重播：`node evidence/edx-wp1-s6/direction-target/verify.mjs`。
沿前輪pinned Moveable0.53.0 fixture；2 viewport × 3 static transform × 3 mode × drag/SE resize =36組。Mode為預設多邊、限制方向、限制方向＋無transform geometry target。Drag只left/top，resize只right/bottom；所有mode皆grid8。off-grid起始(803,283,637,477)，requested與observed canonical delta本輪全部(10,10)。沒有production Operation提交，DOM也未套用vendor候選。

geometry target是fixture短生命editor-only div，從固定canonical樣板投影，其父slide有viewport scale，target自身無presentation transform；每case重建並destroy舊vendor/移除舊proxy。沒有新canonical store。此probe直接點proxy/handle，**沒有證明產品的visible element→proxy hit routing**。

## 結論

| 接法 | 實測 | 裁決 |
|---|---|---|
| default多邊 | none drag(811,291)，不是左上角8格點 | 不符合預期drag語意 |
| 只限制方向 | none drag(816,296)；scale(.8)為(816.3,296.3)，translateY20為(816,292) | 方向有作用，但無法隔離presentation transform |
| 方向＋獨立geometry target | 兩viewport／三transform全部drag(816,296,637,477)，resize(803,283,645,485) | 本矩陣內transform隔離及固定SE anchor成立，保留為adapter候選 |

Resize語意必須明確：右邊803+645=1448、下邊283+485=768均落8px格線；**width645/height485本身不是8倍數**。不應為了讓尺寸整除而增加自製量化或移動左上角。

verify.mjs deterministic檢查36組actual delta、presentation CSS/offset box不變、18對viewport同結果、12組proxy invariant與direction-only反例。verification.json PASS；採集receipt console/page/network/HTTP/remote各0，targetClosed=true。cleanup exit0、root absent、marker absent；source/fixture/vendor hashes已存。

## 範圍與下一個判定點

這是固定box＋正向單次pointer事件＋靜態transform，不能擴張為motion lifecycle、full-deck整合、跨多次preview、negative/zero、safe-area、export、keyboard/IME或效能PASS。

主線裁決：`5a937bf` 的直接payload否決保留；本輪支持「以canonical box投影的短生命geometry target＋指定吸附邊」作**候選架構**，尚不啟動production implementation。下一個必要bounded驗證是同fixture的negative/zero、多次preview及proxy teardown／不污染canonical；若繼續產品整合，先明訂hit routing、operation與export cleanup契約，不新增第二authority，不暫停或清除presentation motion。

Reviewed S5 source5、ZIP與四個既有untracked hash均不變。未merge/push/deploy；不Independent GO。
