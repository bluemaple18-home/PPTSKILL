# S4 PERF mutator 盤點（修改前）

- CodeGraph query `runtime/component-interaction.js resolve runtime/deck-editor.js executeOperation applyPatch sync revision` 未命中入口；轉 bounded rg/read。
- `mountComponentInteraction.resolve`：目前每次 begin/update/preview/finish 都 stringify 整份 spec；preview 再 resolve 一次。
- generated `executeOperation`：geometry、title/subtitle/keyPoint；先 mutate 再 clean，失敗 rollback。成功且 canonical 內容不同才增加 revision。
- `applyPatch`：文字委派 executeOperation；component merge + clean + replaceComponent。noop 不替換 DOM、不取消 gesture；invalid 保持原子。
- `syncText`：DOM title/subtitle/keyPoint/text/citation 回寫，只有值不同才增加 revision。
- `replaceImageFile`：最佳化後 dataUri 回寫，只有不同值才增加 revision。
- `move`/`duplicate`/`remove`：投影片順序、複製、刪除及 claims 更新；既有 clearSelection 取消，成功 mutation 仍增加 revision。
- `serializeHtml`：syncText + clean 可替換 spec object；內容相同不增加 revision。export clone 只投影 committed geometry。
- readonly `getDeckSpec`/descriptor/selection/preview 無 revision；getSizeReport/prepareExport/exportHtml/download 依上述 export 契約。
- 最小方法：editor 閉包數字 revision，由 mount 的 getRevision 讀取。canonical 比較僅限冷路徑的成功 mutation/clean 邊界；不在 pointer resolve 做 fingerprint，也不保留 fallback。
- 不新增 schema、dependency、runtime registry；Node public editor 不需要 gesture revision，沿既有回歸檢查 API。
- 主線 baseline-json.json / baseline-json-probe.mjs 不寫入；不執行 browser、PGQ、ZIP。
