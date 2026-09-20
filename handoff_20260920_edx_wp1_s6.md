# S6 browser mapping handoff

Branch codex/edx-wp1-s6-snap-spike。S5 GO與production/ZIP不變。
Fresh fixture-only browser24組採集完成，錯誤0／target/profile cleanup PASS；詳 `evidence/edx-wp1-s6/browser-mapping/decision.md` 與receipt.json。直接vendor payload→canonical方案REJECT；transform會改尺寸/錨點，預設多邊snap不保證左上角8px格點。requested7與實際pointer取整值須分開。

唯一下一frontier：fixture限制drag left/top、resize right/bottom的vendor方向設定，及無presentation transform的editor-only geometry target候選；仍不修改canonical/runtime，先證明vendor可表達grid與固定SE anchor。不得手刻quantizer或復活transform suppression。研究尚不能宣稱production snap可用。

首輪hidden handle失敗已定位與保留，updateRect初始化後採集成功；static transform不是motion lifecycle驗收。無負向/多次preview/export效能PASS宣稱。
未merge/push/deploy；四個既有untracked不變。
