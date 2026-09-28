# Observer R2 開工前封板契約

Status：`PREFLIGHT_SEALED / R2_NOT_STARTED / HOST_BLOCKED`。

本文件只封板下一輪 AI Core observer 修復的最小契約；不修改 scanner、不啟 browser、不重跑 host、不跑 PGQ、不 merge／push／deploy。`Repair 2` 的實作仍須 Owner 另行明示核准。

## 裁決

R2 首選方向為：**只在 managed browser runtime resource sampling 中，將一次 descendant `ENOENT` 視為「本次 attempt 無法完成」，在原 scan deadline 與累計 entry budget 內，從同一 owned root 重新做一次完整 recursive observation。最多兩個 attempts。第二次仍不完整即 `NO-GO`。**

這不是 catch-and-continue，也不是把消失 entry 計為 0。第一次 attempt 的 partial totals 不可作為成功 snapshot；任何已觀察到的 budget violation 仍立即 `NO-GO`，不能由 retry 洗掉。

R2 應從 AI Core canonical `c23e46555b73a29f16319c657622acb1acc51e7a` 的 scanner seam 重新做最小 delta；`8e6094582547205db70f6dccce369d694f50154b` 保留為 R1 rejected-for-host candidate，不再疊加 regular-only／same-parent replay 修補。

## 為什麼舊的「整棵樹重試不成立」現在可以重新裁決

2026-09-24 的 zoom-out 在只有 Host04 模糊 `ENOENT` 時拒絕整棵樹重試，理由成立：當時無法證明 entry 類型、parent identity、rename／unlink 或 host 適用性，直接放行會把 unknown I/O 當成安全刪除。

後續新增兩組必要證據：

1. 有界 race fixture 已證明「只忽略 ENOENT」會漏算 rename 後仍存在的資料，所以 catch-and-continue 明確不可採。
2. 真 managed host-smoke-01 證明 R1 的 recover seam 太窄：第 8 次 runtime scan 在 fresh `os.stat` 即遇 `ENOENT`，尚未進 R1 recovery；同時 `profile/Default` 實測有 23 個子目錄，否定 flat regular-only parent 假設。

既有 Rule24／tmp-session 契約本身也明示 resource guard 是**週期性邏輯大小／檔案數取樣**，不是原子 filesystem snapshot；兩次取樣間建立後刪除的瞬間尖峰本來就可能漏見。R2 因此可把「一次失敗 attempt + 一次完整 bounded re-observation」定義為單次 sampling operation 的內部收斂，只要下列安全邊界全部保留。

## 不可退讓 invariants

1. **適用面只限 runtime browser sampling**：必須同時滿足 owned `browser_layout` 且 `limits` 非空。cleanup（`limits=None`）、review、general scanner 行為完全不變。
2. **只允許 descendant `ENOENT` 觸發一次 retry**：root 本身無法 open／stat、owned root identity 不符、parent/root ownership 不明，不得 retry。
3. **最多兩個 attempts**：第一次 descendant `ENOENT` 可重取一次；第二次任何 `ENOENT` 直接 `NO-GO`。不得 loop-until-green。
4. **deadline 不重設**：兩個 attempts 共用原 5 秒 browser scan deadline；retry 本身消耗同一時間預算。
5. **entry budget 不重設**：兩個 attempts 的 traversal entries 累計，仍受 `2 × max_file_count + 1024` 約束，避免以 retry 放大工作量。
6. **已觀察超額為 sticky failure**：任一 attempt 在任一 entry 已取得大小／檔案數且跨過原 ceiling，立即 `runtime budget exceeded`；不得 retry、不得清零後變 PASS。
7. **只有 snapshot totals 可重設**：第一次 attempt 若因可 retry 的 descendant `ENOENT` 中止，該 attempt 的 partial `bytes/files` 只作 diagnostic；第二次完整 traversal 的 totals 才是成功 sample。這不抹除第 6 點已觀察到的 violation。
8. **special/no-follow 邊界不變**：任何實際觀察到的非 allowlist symlink、socket、FIFO 或其他 special entry 仍立即 `NO-GO`；browser special allowlist 不擴充。
9. **未知 I/O 不轉成 retry**：`EIO`、`EACCES`、`EPERM`、非 `ENOENT` 的 `FileNotFoundError`、depth limit、deadline、entry limit、identity mismatch 等仍原樣 fail closed。
10. **不增加第二套 runtime**：不加入 FSEvents／watcher、第二 scanner、第二 supervisor、daemon、ledger、registry 或 filesystem snapshot 子系統；不提高 byte/file/TTL/deadline ceiling。
11. **cleanup 保持嚴格**：Browser.close 後的 cleanup/count path 不使用 runtime retry；無法完整 cleanup observation 仍是 `NO-GO`。
12. **原始事件必須留證據**：成功 retry 不得把第一次 `ENOENT` 從 diagnostic 擦掉；receipt 至少保存 attempt、phase、relative parent/name、errno、elapsed、entries、partial counts、第二次完整 counts 與 final outcome。

## 唯一明示的語意放寬

若 descendant 已被 directory enumeration 看見，但在取得可用 metadata 前消失，R2 允許放棄整個 partial attempt，重新取得一份完整 snapshot。第二份 snapshot 若完整，scanner 不再要求證明消失 entry 原本是 regular、directory、rename 或 unlink。

這代表 R2 接受一個與既有 sampling 模型相同類型的限制：**在兩個 attempts 之間已完全消失的短命 entry 可能不出現在成功 snapshot。** 這不等同於 hostile filesystem 下的完整性保證。現行產品為 Personal / C1 governance；若未來要求 hostile/compliance 等級，這個契約必須重新評估，不能把本次 host evidence 外推成更高保證。

若 Owner 不接受上述唯一語意放寬，則本輪不得實作 whole-scan retry；下一層方案會需要更強的 OS/filesystem snapshot 能力，屬 scope expansion，不能再以 scanner 小修處理。

## Failure-state 驗收矩陣

R2 實作前，以下案例即為固定 acceptance；不得在實作後因方便而重寫：

| 情境 | 必須結果 |
| --- | --- |
| 穩定 mixed recursive tree | 一次 attempt 完整，counts 與 canonical 行為一致 |
| regular entry 在 stat 前消失 | attempt 1 記 ENOENT；attempt 2 完整才可 PASS |
| entry rename 到同 parent 新名 | attempt 1 ENOENT；attempt 2 必須以新名重新計數；不能漏算 |
| entry rename 到其他 parent | attempt 2 recursive traversal 必須在新位置計數；若第二次仍 race 則 NO-GO |
| directory 在 stat 前消失 | 可觸發唯一 retry；第二次完整才可 PASS |
| directory stat 後、open 前消失 | 可觸發唯一 retry；第二次完整才可 PASS |
| 第二次同 parent 或其他 parent 再 ENOENT | `NO-GO`，禁止第三次 |
| observed symlink／FIFO／非 allowlist special | 立即 `NO-GO`，不得 retry |
| EIO／EACCES／EPERM | 立即 `NO-GO` |
| root missing／replaced／identity unknown | 立即 `NO-GO` |
| attempt 1 已觀察 bytes 或 files 超 ceiling | 立即 budget `NO-GO`，不得 retry |
| retry 使 deadline 或 cumulative entries 超界 | scan-limit `NO-GO` |
| cleanup 遇任何 ENOENT／unknown I/O | 維持既有 cleanup fail-closed |
| non-browser scanner 遇 ENOENT | 維持既有 fail-closed |

## 最小實作形狀

只允許修改 AI Core 原 `scan_resource_artifacts()` seam 及直接相關 tests/docs。概念形狀應為：

1. root ownership／descriptor 建立一次並固定 identity；
2. 把現有 recursive traversal 收斂成單次 `scan_once` 語意；
3. browser runtime 第一次 descendant `ENOENT` 只回報 `RETRY_REQUIRED` 類內部結果，不回成功 counts；
4. 清除該 attempt 的 snapshot totals，但保留 deadline、cumulative entries、diagnostic 與 sticky violation；
5. 同 root 重新完整 traversal 一次；
6. 第二次完整才回 counts；否則沿原 error contract `NO-GO`。

不要求保留 R1 的 per-file pin、nlink、regular-only parent、same-parent replay 或 vanished inode search；除非實作時能證明其中某一項仍是上述 invariants 所必需。預設刪除複雜度，而不是移植 R1。

## Why not less / why not more

**Why not less：** catch-and-continue 已有 rename 漏算反例；只在 fresh `os.stat` 補 catch 仍會在 directory open／其他 traversal phase 重現同一類 race；繼續擴 R1 parent replay 會保留已被真 host 否定的 flat regular-only 假設。

**Why not more：**現有需求只是讓 managed Chrome 的週期性 resource sample 在一次正常 namespace churn 下取得完整 snapshot。watcher、FSEvents、APFS snapshot、第二 runner 或提高 ceiling 都超出 measured gap。

**Do not absorb：**不把 browser-specific retry 推廣到 cleanup/general/review；不把歷史 Host04 根因寫成已知；不把一次 host smoke PASS 外推成原子 filesystem 保證。

## 開工與停止條件

R2 若獲 Owner 明示核准，實作只走一次：canonical-base 最小 delta → 上述 failure-state 離線測試 → Mainline fresh verification → **一輪** managed host smoke。host smoke 維持 64 MiB／10,000 files、原 scan timeout、TTL 與 readiness；先只驗 readiness／簡單 test page／runtime scans／Browser.close／supervisor／root+marker cleanup，不先跑 PGQ。

若這一輪 host smoke 再因 scanner observation 契約失敗，停止 scanner patch 線；不得自動開 R3 或再補第三種局部 recovery。回主線判斷是否需要更強的 observation primitive 或改變 runtime resource-control 層級。

Host smoke PASS 也只代表 R2 host applicability；之後才可提出 AI Core canonical adoption。Core3 的雙 viewport／affected PGQ 仍是 adoption 後的下一階段，不與 R2 smoke 混跑。

## 固定證據

- `tasks/edx-core-3-observer-host-evaluation.md`
- `evidence/edx-core-3-undo-redo/observer-zoom-out-20260924.md`
- `evidence/edx-core-3-undo-redo/observer-race-receipt-20260926.md`
- `evidence/edx-core-3-undo-redo/observer-review-r1-20260927/receipt.md`
- `evidence/edx-core-3-undo-redo/host-smoke-01/mainline-receipt.md`
- `evidence/edx-core-3-undo-redo/host-smoke-01/mainline-decision.json`

封板後不再重新討論 R1 是否可繼續補洞；除非出現新的 host evidence 推翻本文件中的 fixed facts。
