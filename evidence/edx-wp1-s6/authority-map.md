# S6 first-party authority 與後續驗收矩陣

## 已測量的缺口

`runtime/component-interaction.js:58` 將原始 client delta 除 gesture-start scale，`update()` 建 next box；`:154` 只傳 `point(event)`，不採vendor修正。`:144` 明示snappable=false。`operation-probe.mjs` 可用 `node evidence/edx-wp1-s6/operation-probe.mjs` 重跑：scale0.8/1 × drag/resize 共4組，raw7保留7，假設snap8未採用；preview不寫canonical、finish至多一筆，nudge仍1px。

此probe是public controller加假設payload，**不是Moveable實際snap結果或browser可用證據**。

## 最小adapter契約草案

沿現有begin/update/finish，保留target/revision/token驗證、有限值檢查、canonical validator與restore；vendor只能建議next geometry。不能直接將transform/CSS/DOM當authority，不能每次pointer update提交operation。不能在raw換算後再盲除一次scale；需要實際vendor雙viewport事件來決定單位。

後續實作前須以測量鎖定：
- grid origin是slide canonical(0,0)或gesture起點？off-grid元件首次拖曳如何進格，無pointer位移不得偷偷吸附。
- drag使用vendor哪一個不含既有motion transform的位移量；resize是否維持SE錨點、width/height與左上角不變。
- 既有motion有nonidentity transform時vendor尺寸是否污染canonical；必須有normal/static比較。
- grid的8是canonical px；1280×720與1600×900同canonical輸入得到同結果。
- safe-area／minimum仍拒絕非法候選、不以snap為名clamp或洗既有manual override。

## 後續實作驗收（本spike不宣稱完成）

| 範圍 | 必要證據 |
|---|---|
| drag／SE resize | grid on/off、正負delta、off-grid初值、0 delta、雙viewport；真vendor事件→operation→DOM與export一致 |
| cancel／reject | Escape／pointercancel／blur／mode／stale；preview不入export；release最多一筆；非法geometry原子拒絕 |
| keyboard／focus | S5 1px/Shift10px不被grid量化；guardedEscape、IME、modifier、input/chrome保留 |
| motion／scale | identity/nonidentity transform不成第二authority；不要復活S3 suppression |
| portable／cost | 離線export/reopen、editor chrome無洩漏、bundle/metafile/license與ZIP hash、20MiB不放寬 |

Mainline範圍裁決：多選、Selecto、alignment/group/history、AI仍pending，不藉snap擴張。未釐清單位/origin/motion時，只能conditional ADAPT，不能宣布production snap GO。
