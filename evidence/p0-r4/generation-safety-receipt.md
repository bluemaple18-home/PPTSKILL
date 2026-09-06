# P0-R4 Bounded Generation Receipt

- 日期：2026-09-06
- 狀態：PASS

## Evidence

- 15 頁即使 runtime 宣告可一次處理 15 頁，也會拆成至少兩個 generation units。
- batch size 由 runtime capability 傳入，不設跨模型固定值。
- 每個 unit 只含 compact deck anchors、本批 outline 與前後鄰頁的 id/title；不重送已生成的完整頁面內容。
- direct 與 staged 模式共用相同 safety boundary。
- 選配 sample preview 只允許 1～2 頁，且保留產生剩餘內容前的核准點。
- 單頁內容 patch 只改目標 slide；其他 slide content hash 不變。
- composition patch request 不攜帶 slide content，套用後 content hash 不變。

## Verification

`pnpm test`：27 tests pass；`git diff --check`：pass。
