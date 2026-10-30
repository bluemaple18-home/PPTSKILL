# P0-R2 Grill Me and Outline Gate Receipt

- 日期：2026-09-06
- 狀態：PASS

## Evidence

- 所有素材必須標記 reviewed，否則 Grill Me blocked。
- 一次只保留一個 active question，且每題附建議答案。
- 已由素材回答的決策面不重問；即使四面向齊全，仍至少做一次核心主張壓力測試。
- Outline 每頁只有 `id`、`title`、`subtitle`、3～5 個 `keyPoints`。
- 1～15 頁可進人工確認；16 頁以上 blocked；缺欄與重複 ID fail。
- 未經 `approvedBy: human` 確認不得放行。
- 未明確授權外部來源時，`sourcePolicy` 固定為 `user-provided-only`。

## Verification

`pnpm test`：22 tests pass；outline schema JSON parse：pass；`git diff --check`：pass。
