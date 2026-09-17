# PGQ-WP4 Slice 2 Receipt — Representative Hard Gate and Repair Budget

**Verdict:** REPAIR 1 READY FOR INDEPENDENT RE-REVIEW

**Branch:** `codex/pgq-wp4-s2`

**Base:** `main@2e0b832`

## Delivered

- 新增 pure `evaluateRepresentativeQa()`；只消費 Slice 1 stable sample identity、allowlisted hard checks、local repair history 與 optional last-success reference。
- 四個 Layer-1 codes 固定為 content integrity、geometry、static readability、animation interference；每個 sample slide 必須完整覆蓋，缺漏、重複、sample 外 slide、未知欄位或狀態皆 fail loud。
- Verdict 只由 gate 派生：全 PASS 才 pass；NOT_RUN／UNKNOWN blocked 且不消耗 budget；fail 才可回 repair。
- Issue identity 固定為 `slideId + code`。Repair history 不接受 caller 自報 issue ID／attempt／verdict，action 必須逐次符合 bounded sequence。
- 同 issue 最多兩次：第 1／2 次回 deterministic action 與 attempt number；完成兩次仍 fail 時 blocked，保留 last-success reference並要求人類選擇。
- Geometry／readability 重用既有 D09 layout repair vocabulary；content fail 先 restore approved content，animation fail 先 force static。Gate 不執行 mutation。
- `workflow-cli.mjs qa-sample` 使用同一 pure gate；PASS／blocked／repair 分別以 exit code 0／2／3 供 automation 判讀。
- Packaged Skill 與三個 thin adapters 只加入唯一 CLI contract，沒有複製決策邏輯。

## Verification

- TDD RED：新 focused suite 初始因 gate module 缺失而失敗；Repair 1 的偽造 sample roles 在修補前亦精確 RED。
- Slice 2 focused：6/6 PASS。
- Slice 1＋PS-002/R6 compatibility：21/21 PASS。
- PGQ targeted＋PS-002/R6：87/87 PASS。
- Full regression：195/195 PASS。
- Syntax 與 `git diff --check`：PASS。
- Fresh ZIP：2,124,775 bytes，低於 20 MiB；SHA-256 `19d164d7ded203102528737b7be224221885ceea79f88f3f8f0e7cfd5122c647`。
- Fresh install/smoke/uninstall lifecycle：PASS；三個 adapter registration ready。
- Browser：NOT_APPLICABLE。本 slice 未改 renderer、DOM、CSS、browser editor 或 motion/background runtime，不以 pure gate 測試冒充 browser PASS。

## Deferred boundary

- Hard check receipt 的產生仍沿用既有 content／geometry／browser evidence tools；本 slice 不新建 evidence service 或偽造 runtime evidence。
- 不做實際自動 repair、Layer-2 advisory、Layer-3 Owner calibration、scope-aware feedback persistence、sample freeze/invalidation 或 full-deck orchestration。
- 本 candidate 尚未獨立 review、merge 或 push；不宣告 Slice 2 或整個 WP4 COMPLETE。

## Independent review repair

- Reviewer 發現 hard gate 只核對 slide IDs，未驗證 Slice 1 role shape；偽造「單張 typical」或「雙張 typical」可在 checks 全 PASS 時繞過 Stress QA。
- Repair 1 在 gate 入口驗證完整 sample public contract：只接受 1 筆 `both` 或 2 筆 ordered `typical`／`stress`；同時驗證 sample／entry allowlist、version、approval/full-deck flags 與 bounded unique reason codes。
- Direct 與 installed `qa-sample` regression 均證明偽造 shape fail loud；其餘 gate semantics 不變。
