# S4 bounded performance Worker receipt

狀態：FROZEN／交 Mainline browser、ZIP 與獨立 review；不是 GO。
工作名稱：EDX-WP1-S4-PERF → bounded revision 已完成 → Worker 驗證通過，外部驗收待主線。
Base/HEAD：`5ae8bb806cef7a3b11916daabb4b7b8bcc3ebece`；branch `codex/edx-wp1-s4-perf`；未 commit。

## 變更與範圍

- 修改前入口／mutator 盤點見 `worker-mutators.md`。CodeGraph query 未命中入口，才 bounded rg/read `component-interaction.js`、`deck-editor.js`。
- mount `resolve` 改讀 editor 閉包 revision；移除 whole-spec JSON fingerprint，沒有 fallback。preview 再 resolve 也不序列化、不讀 asset。
- revision 只在 canonical 語意改變時增加。成功 operation、legacy patch、DOM 文字同步、圖片替換、slide 排序／複製／刪除皆涵蓋；失敗／readonly／noop 不假增。clean/export 換 object 本身不計 revision。
- canonical equality 比較只在冷路徑 mutation/clean；getter、pointer update／preview 不比較整份 spec。geometry 提交與 export 原有 sanitizer、clone、serialization 成本仍存在，本卡沒有宣稱消除它們。
- legacy noop component patch 不替換 DOM／清 selection。invalid component 被 sanitizer 移除時，先驗證 candidate，失敗 rollback；只補本卡 atomic mutation 邊界，未改 schema allowlist。
- 原有 async race：optimizer await 期間 export 會換 spec，原程式對 captured detached component 回寫。加 revision 後還可能假增 counter。因此按 captured slide/component identity 重新找 live image；消失則拒絕、不回寫，不跟隨使用者換頁。只此 bounded 修補，未新增 async lifecycle。
- revision 不進 DeckSpec／portable HTML；沒有 dependency/schema/motion/QA authority/vendor 變更。

## Exact files（8 檔，已 freeze）

1. `runtime/component-interaction.js`
2. `runtime/deck-editor.js`
3. `tests/edx-wp1-s4-managed-browser-attach.test.mjs`
4. `tests/edx-wp1-s4-perf.test.mjs`（新增）
5. `tools/edx-wp1-s4-browser-acceptance.mjs`
6. `tools/edx-wp1-s4-perf-browser-cases.mjs`（新增）
7. `tools/edx-wp1-s4-perf-mounted.mjs`（新增）
8. `tools/edx-wp1-s4-perf-probe.mjs`（新增）

完整 patch 含新增檔：`worker-diff.patch.gz`（主線以gzip無損封存，避免patch context空白觸發diff check）。完整 SHA：`worker-source-before.json`、`worker-source-after.json`，8/8 相同；HEAD 未變。兩個 runtime SHA：

- component-interaction：`cf08b4c437b8dddb37df7afd81213c6ad1d481551762a1b83fcdd92e5aa2de5b`
- deck-editor：`0af4a9e5d74cf14338ef72302dd17aa358ef15deb16fcf727d4ac95e61a868f8`

Worker evidence 僅 `evidence/edx-wp1-s4-perf/worker-*`。主線 `BACKLOG.md`／任務卡／baseline 兩檔與原四個 untracked 未由 Worker 寫入；舊 S4 evidence 未寫入。

## RED → GREEN 與證據界限

- `worker-red.log`：修正 fixture 後、修改 runtime 前的 13 tests，8 pass／5 預期 fail。三個大小各 20 次 mounted update，payload reads／serializations／whole-spec serializations 都是 **40**。另外兩個 failure 為 legacy noop 取消 gesture、invalid legacy patch 原子性。
- 早期 fixture 的越 safe-area 座標、觀測 getter 缺 setter 是 mock 準備錯誤，已在上述正式 RED 前修正；不計產品回歸。正式 RED 的 image 缺失是 invalid patch 經 sanitizer 移除後拋錯的 runtime 行為，不是 export fixture 少建 image。
- `worker-async-red.log`：17/18 pass，唯一 failure 為 async asset × readonly export 換 object 的 live-target race；後續加入刪除／換頁測試。
- `worker-green.log`：最終新測試 19/19 pass。大 payload spec 比較採 SHA／geometry metadata，避免後续失敗 dump dataUri；原始 RED log 保留不改寫。
- mounted harness 直接執行正式 `buildDeckEditorRuntimeScript()`，使用正式 mount、editor mutator 與 public API；DOM／Moveable event source 是 double，沒有替換 revision 邏輯。覆蓋 hot path、semantic stale（含不同 slide、change-then-revert）、readonly／noop／invalid、sync、asset、slide、target replacement/deletion、cancel/mode、export 後合法 release、至多一次與 extract/reopen。
- 這些不代表 browser layout/vendor pointer 已驗收。真 pointer 仍沿原 S4 attach runner，沒有刪除或削弱既有 assertion。

## 成本證據

主線 `baseline-json.json` 固定 source `05295d3853364157a6da0ae30459eebc26bf11c5`；Worker 不重跑／不覆寫。

| payload | 主線 JSON.stringify p50 ms | Worker mounted update+preview p50 ms | Worker measured updates | payload reads／serializations |
|---|---:|---:|---:|---|
| 1 MiB | 0.598833 | 0.044500 | 101 | 0／0 |
| 6 MiB | 3.407833 | 0.044083 | 101 | 0／0 |
| 12 MiB | 6.924375 | 0.038208 | 101 | 0／0 |

兩欄量測範圍不同，不能當同一 benchmark 的加速倍數，也不是 browser frame benchmark。各 30 次 warmup；時間純診斷，gate 只有 reads／serialization 全零與合法 release。after 完整來源 SHA／p95／max 見 `worker-after.json`。

## Freeze 後驗證

- Focused：`node --test tests/edx-wp1-s4-*.test.mjs tests/edx-wp1-s3-bounded-geometry.test.mjs`，**45/45 PASS**，`worker-focused.log`。
- **Non-browser subset（非 full）**：37 檔中 **222/222 PASS**，原 log 檔名 `worker-nonbrowser-full.log` 不代表 full coverage。**Omissions：24 個 ZIP-coupled cases**，完整清單 `worker-nonbrowser-plan.json`，精確 argv `worker-nonbrowser-command.json`。Node 25 skip-pattern 不把未執行案例列入摘要。另 `tests/pgq-wp4-*.test.mjs` browser/QA 整組未執行。
- 非 browser fixture-only 產出 366217 bytes，`worker-fixture/source.html`、`worker-fixture.log`；沒有 navigate／browser process。
- 原與 PERF attach mock failure-path 均驗 navigation 前 listener、owned target cleanup、禁止 spawn；屬 focused 子集。
- `node --check` ×8、`git diff --check` PASS；source SHA before/after 8/8 一致，`worker-syntax-diff.log`。
- Focused 與新測試是 non-browser 結果子集，不相加。未執行 fresh browser、PGQ、ZIP、install/deploy；不沿用旧 receipt 冒稱本輪 fresh。

## Mainline 可重現命令

在 `<repo-root>` 使用既有 Node/toolchain。after 非 browser：

```sh
node tools/edx-wp1-s4-perf-probe.mjs evidence/edx-wp1-s4-perf/mainline-after.json
```

主線受管 Chrome 已就緒後，指定其既有 DevToolsActivePort；工具只 attach、不 spawn，只清自己 target：

```sh
PPTSKILL_DEVTOOLS_ACTIVE_PORT="<managed-profile>/DevToolsActivePort" node tools/edx-wp1-s4-browser-acceptance.mjs evidence/edx-wp1-s4-perf/mainline-browser --perf-regression
```

此命令保留 S4 的 1280×720／1600×900 真 drag/resize、cancel、noop、invalid、committed export、offline reopen assertions，再跑 readonly/noop/export 後 release 與 public/legacy/sync/geometry/asset stale cases。沿用 console/pageerror/network/HTTP/remote/Traceback 收集與 owned target cleanup。新增 browser cases 本輪只有 syntax／fixture／attach mock 驗證，主線必須實跑，不能以 mounted 結果代替。

若需原 fixture 單獨重播：

```sh
PPTSKILL_DEVTOOLS_ACTIVE_PORT="<managed-profile>/DevToolsActivePort" node tools/edx-wp1-s4-browser-acceptance.mjs evidence/edx-wp1-s4-perf/mainline-s4-browser
```

主線接手補測：沿 `worker-nonbrowser-command.json` 的同一 37 檔案集，把精確 `--test-skip-pattern=` 改為 `--test-name-pattern=`，僅補 24 個 ZIP-coupled cases，與 222 PASS 記 unique union；Worker 不重跑已通過子集，不因 permission 改來源。正式 dist ZIP lifecycle 與本卡 review 仍屬主線。回退可逐檔依 `worker-diff.patch.gz`（主線以gzip無損封存，避免patch context空白觸發diff check） 反向套用，勿覆蓋主線 control 或原 untracked。
