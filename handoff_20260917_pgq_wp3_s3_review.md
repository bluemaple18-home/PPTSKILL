# PGQ-WP3 Slice 3 — Independent Review Handoff

## Root question

PGQ-WP3 Slice 3 的 truthful Background Effects Runtime 是否符合既定 capability、portable DeckSpec、browser lifecycle、offline、license 與 20 MiB 契約，可給 `GO` 進入整合？

## Goal

對 `main@1d2be4dd96053ca651f846786ce1f36ecf76e1f4..codex/pgq-wp3-s3` 做獨立唯讀 review。若有 correctness finding，只退回最小 repair；若無 blocking finding，回覆 `GO — PGQ-WP3 Slice 3`。

## Current state

- Branch：`codex/pgq-wp3-s3`
- Base：`1d2be4dd96053ca651f846786ce1f36ecf76e1f4`
- Task-card commit：`a6457cf`
- Implementation／review-candidate commit：`169662db255306d5c06bf382a9a0d286fff0ff8b`
- Review repair commit：`cc7d259`
- Status：`INDEPENDENT REVIEW GO`；closure write-back 已授權，等待整合後驗證與 push。
- Worktree 在建立本 handoff 前為 clean；本 handoff 應是唯一後續 control artifact。

## Constraints and preferences

- Review only；不要直接 repair、merge、push、deploy，除非 Owner 另行明示。
- 不開 WP4、EDX formal integration、WP3 Slice 4 或新 renderer primitive。
- 不把 donor artifact 存在視為 supported；逐 effect 以 capability truth 與 browser evidence 判定。
- 不引入 p5、CDN、`@latest`、任意 shader／CSS／JS／selector／URL／provider 欄位。
- P0-R11 的 `824471ae…` receipt 是當時 MVP reseal 的 immutable historical evidence；本 Slice 使用自己的 candidate checksum，不把新 ZIP 偽寫成舊 P0 驗收事實。
- Gemini CLI 維持 missing／UNVERIFIED，不因 ZIP lifecycle PASS 而宣稱真 CLI replay PASS。

## Completed actions

- 新增唯一背景 capability／planner seam：`runtime/background-effects.js`。
- DeckSpec、Node/browser editor、renderer、export/reparse 與 installed `plan-new → render-new` 已接通 optional `composition.backgroundEffect`。
- Exact pin `vanta@0.5.24`＋`three@0.134.0`；deterministic bundle、manifest、MIT licenses、checksum／bytes gate 已加入 distribution build。
- Offered 11 effects：WAVES、BIRDS、NET、GLOBE、DOTS、FOG、CLOUDS、CELLS、RIPPLE、RINGS、HALO。
- Unavailable：CLOUDS2=`texture_artifact_not_bundled`；TOPOLOGY／TRUNK=`license_gate`。
- Runtime 支援 IntersectionObserver lifecycle、replay destroy/reinit、forced-static、reduced-motion、WebGL unavailable、init failure；BIRDS／HALO 有額外 GPU target disposal。
- Browser editor duplicate/delete 會建立／銷毀正確 instance；export 移除 canvas、live style 與 runtime state，保留 canonical metadata。
- Packaged Skill 與 Codex／Claude Code／Gemini adapters 已寫入相同 background allowlist 邊界。
- Review repair 已補齊合法 CSS palette 解析、運行中 reduced-motion cleanup、真實 recipient Chrome reopen，以及 console／network failure gate。

## Evidence

- 主 receipt：`evidence/pgq-wp3-s3/slice-3-receipt.md`
- 正式 browser receipt：`evidence/pgq-wp3-s3/browser-acceptance.json`
- Dependency spike：`evidence/pgq-wp3-s3/vanta-capability-spike.json`
- Candidate ZIP checksum：`evidence/pgq-wp3-s3/final-zip-sha256.txt`
- Task card：`tasks/pgq-wp3-s3-background-effects-runtime.md`
- Focused：6/6 PASS。
- Slice 1 compatibility + Slice 3：13/13 PASS。
- Full regression：183/183 PASS。
- 真 Chrome：11/11 effects normal/replay/static PASS；light、初始與動態 reduced、WebGL unavailable、duplicate/delete、export cleanup、recipient reopen PASS；console/pageerror/network failure/external network=0。
- Duplicate → delete → export → recipient reopen：1 slide／1 unique ID／1 layer／1 running canvas，canonical effect=`waves`。
- Fresh ZIP：2,118,846 bytes；SHA-256 `cc8133aca38a1ccbab402332c85784d31146a0030e7b3b1a1d5b6e26f4b7225c`；package smoke/install/uninstall PASS。
- Syntax 與 branch-range `git diff --check` PASS。

## Independent review focus

1. Planner 是否可能把 unavailable effect 偷換成其他 effect，或以 caller 自報欄位繞過 capability truth。
2. `composition.backgroundEffect` 是否完整 allowlist；private／executable metadata 是否可從 pre-render、browser editor 或 recipient reparse 洩漏。
3. Style color mapping 是否真的使用 effect 支援的參數；light route 是否仍保留可讀文字。
4. reduced-motion／forced-static／WebGL unavailable／init failure 是否完全不初始化或確實 destroy，不以 `speed=0` 假裝停止。
5. Replay、離頁、duplicate、delete、pagehide 是否留下 orphan canvas、rAF 或 GPU target；特別檢查 BIRDS／HALO。
6. Browser export 是否可能序列化 live canvas／inline style／中間 runtime state，或使 reopen 後 canonical metadata 漂移。
7. Portable HTML 是否只有本地 file request；Vanta／Three pin、license、checksum 與 20 MiB gate 是否一致。
8. Slice 1 NumberFlow、Slice 2 underline sweep、WP2 planning chain、legacy deck 是否有回退。

## Reproduction commands

```bash
node --test tests/pgq-wp3-s3-background-effects.test.mjs
node --test tests/pgq-wp3-s1-motion-numberflow.test.mjs tests/pgq-wp3-s3-background-effects.test.mjs
pnpm test
node tools/pgq-wp3-s3-browser-acceptance.mjs
pnpm build:dist
pnpm probe:dist
git diff --check 1d2be4dd96053ca651f846786ce1f36ecf76e1f4..HEAD
```

Browser command 需要可啟動本機 headless Chrome；reviewer 必須以 receipt 內容和實際 command exit code 判定，不得只看 Chrome process 已啟動。

## Blocker

無已知產品 blocker。獨立 re-review 已給出 `GO — PGQ-WP3 Slice 3`。

## Candidate fork

- `GO`：回主線做 closure write-back、整合與 push；只有 Owner 明示授權才執行。
- `REQUEST CHANGES`：只修可重現 finding；不重做 Slice 3、不擴大 vocabulary。
- 若 reviewer 只無法啟動 Chrome，但沒有產品 finding：標記 review-environment limitation，不得把既有 browser receipt 自動降為產品失敗，也不得假裝 fresh browser rerun 已完成。

## Remaining work

1. Closure write-back：已完成。
2. Merge／push：Owner 已授權；整合後重跑 focused、full、browser scope、ZIP lifecycle 與 `git diff --check`。
3. Slice 3 關閉後再判斷是否真的需要薄 Slice 4；不得預設新增。

## Key decisions and resolved questions

- RIPPLE 雖未列於 upstream gallery，但 pinned artifact 經正式 renderer Chrome matrix 通過，因此標為 `supported / upstream_unadvertised_browser_verified`。
- CLOUDS2 的 JS 存在不等於可離線使用；缺 pinned `noise.png`，所以維持 unavailable。
- TOPOLOGY／TRUNK 不因 donor vocabulary 要求而吸收 LGPL p5；維持 license gate。
- 背景 runtime 是 presentation layer；canonical truth 仍只有 DeckSpec metadata，canvas／動畫中間態永不回寫。
- Intentional static fallback 是完整結果，不以替代動畫冒充原 effect。
