# PGQ-WP3-S3 — Background Effects Runtime

**Status:** COMPLETE — INDEPENDENT REVIEW GO
**traces_to:** `PGQ-D04`, `PGQ-D06`

## Objective

沿用唯一 DeckSpec／renderer／browser editor／export 與 motion capability seam，加入可攜、離線、可銷毀的背景效果 runtime。每個 donor vocabulary item 必須個別回報 `supported | unavailable`；不得以選單名稱冒充 runtime capability。

## Measured dependency baseline

- 採用候選：`vanta@0.5.24`（MIT）＋相容的 `three@0.134.0`（MIT）；兩者鎖 exact version 與 pnpm integrity，正式 HTML 不連 CDN。
- `p5` 路徑維持 license gate：`TOPOLOGY`、`TRUNK` 不打包，回 `unavailable / license_gate`。
- `vanta@0.5.24` tarball 含 `vanta.ripple.min.js`，但 upstream gallery 將它註解、不列入正式 13-effect gallery；`RIPPLE` 先標 `candidate / upstream_unadvertised`，只有真 browser matrix 通過才可 offered。
- 目前可進 browser spike 的 Vanta/Three effects：`WAVES / BIRDS / NET / GLOBE / DOTS / FOG / CLOUDS / CLOUDS2 / CELLS / RIPPLE / RINGS / HALO`。

## Input / output contract

- DeckSpec 新增 optional `composition.backgroundEffect`，與 `composition.motion` 獨立；只允許 effect、`intensity=low|medium|high`、效果真的支援時的 `speed=slow|normal|fast`、`palette=style`。
- Caller 不得傳 selector、shader、任意 options、HTML/CSS/JS、URL、texture path 或自報 provider/status。
- Style palette 由 deterministic adapter 映射到每個效果的真實顏色參數；`WAVES/FOG/CLOUDS/CLOUDS2/CELLS` 不得假設 `backgroundColor` 一定有效。
- Planner 只可提出 capability matrix 中 `supported` 的效果；`none` 永遠 supported。Unavailable effect 保留 structured reason，不偷換效果。
- Renderer 只內嵌一次 pinned Three runtime 與 allowlisted Vanta effect bundle；不連網。Canvas 與 runtime nodes 不進 serialized DeckSpec。

## Acceptance

1. Capability view 列出 `none + 14` 個產品 vocabulary items，各自有 deterministic status、provider、license、speed support 與 fallback；`TOPOLOGY/TRUNK` 明確 unavailable，`RIPPLE` 只有 browser matrix 通過才可 supported。
2. Direct 與 installed `plan-new` 使用同一 capability truth；unknown field、unsupported effect、無效 speed/intensity fail loud 或 truthful unavailable。
3. DeckSpec sanitizer、Node/browser editor、renderer embed、export 與 recipient reparse 保留 allowlisted contract，移除私密／任意 executable 欄位；legacy DeckSpec 不變。
4. 每個 offered effect 在真 Chrome 產生非空 canvas、至少兩個不同時間點的像素證據，且 console/pageerror/network failure 為 0；失敗者降為 unavailable，不冒充通過。
5. Style palette 至少以 warm/light、dark 兩組驗證真參數映射與文字可讀性；`CLOUDS2` light route 必須 unavailable 或 bounded fallback，不可蓋掉深色文字。
6. Replay／切換會 destroy 前一 instance；離頁、forced-static、reduced-motion、WebGL unavailable 與 init failure 都停止運算並保留完整靜態背景／內容。
7. Browser editor save/export 不序列化 canvas/runtime junk；匯出 HTML 離線 reopen 後 canonical background metadata 與 static/dynamic final state一致。
8. `composition.motion` 的 NumberFlow／underline-sweep 可與 background contract 並存，content hash 不變。
9. Fresh ZIP install/smoke/uninstall、single-file offline、20 MiB hard gate、NOTICE/license/pin/checksum、targeted/full regression、syntax 與 `git diff --check` PASS。

## Blocking edges / checkpoints

- 已滿足：MVP CLOSED；PGQ-WP1、WP2、WP3 Slice 1–2 COMPLETE。
- Checkpoint A：dependency + capability spike 通過後，才允許 schema/runtime mutation。
- Checkpoint B：逐 effect browser matrix完成後，才把 effect 標為 offered。
- 本卡完成前不開始 WP4、EDX formal integration 或 whole-deck Slice 4。

## Non-goals

- 不做 foreground effects、任意 shader editor、專業 timeline、逐頁隨機效果或第二套 runtime。
- 不為湊滿 14 種引入 LGPL p5、非官方 RIPPLE artifact、CDN、`@latest` 或低保真替代動畫。
- 不新增 renderer primitive、不改內容、不把 runtime canvas 寫回 canonical truth。

## Verification

- TDD：capability matrix → schema/sanitizer → renderer/runtime lifecycle → installed workflow。
- Browser：逐 effect normal/replay、reduced、forced-static、WebGL unavailable、export/reopen；navigation 前掛 console/pageerror/network listeners。
- Fresh ZIP + host lifecycle + byte/checksum gate；targeted/full regression + syntax + `git diff --check`。

## Closure

- Independent re-review：`GO — PGQ-WP3 Slice 3`；無新 finding。
- 前次 CSS color parsing、recipient Chrome reopen、console/pageerror/network gate 與 reduced-motion teardown findings 均已關閉。
- Focused 6/6、Slice 1 compatibility + Slice 3 13/13、full regression 183/183 PASS。
- Closure 不授權或預設開啟 Slice 4、WP4 或 EDX。
