# PGQ-WP3 Slice 3 Receipt — Background Effects Runtime

**Verdict:** READY FOR INDEPENDENT REVIEW

**Branch:** `codex/pgq-wp3-s3`

**Base:** `main@1d2be4dd96053ca651f846786ce1f36ecf76e1f4`

## Delivered

- `plan-new` 新增獨立 `backgroundSignals`／`backgroundPlan` 與 truthful capability view；background 不與 foreground motion 混成第二套 workflow。
- 產品 vocabulary 共 `none + 14`：WAVES、BIRDS、NET、GLOBE、DOTS、FOG、CLOUDS、CELLS、RIPPLE、RINGS、HALO 為 browser-verified supported；CLOUDS2 因 npm package 未攜帶 pinned noise texture而 unavailable；TOPOLOGY／TRUNK 因 p5 LGPL-2.1 license gate unavailable。
- `vanta@0.5.24` 與 `three@0.134.0` exact pin，MIT license 文本、來源 checksum、bundle checksum／bytes 由 deterministic build manifest 驗證；portable HTML 不連 CDN。
- Optional `composition.backgroundEffect` 只保留 effect、bounded intensity、實際支援時的 speed 與 `palette=style`；shader、selector、URL、provider 與私密 metadata 不進 canonical output。
- Style palette 經 deterministic per-effect adapter 轉為 Vanta 真參數；renderer 只在 deck 真有背景時內嵌一次 vendor/runtime。
- Runtime 以 slide visibility 建立／銷毀 instance；replay 先 destroy；BIRDS／HALO 補明確 GPU target disposal；reduced-motion、forced-static、WebGL unavailable、factory/init failure 都 fail closed 為完整靜態頁。
- Browser editor duplicate/delete、save/export 與 recipient reparse 沿既有 seam；live canvas、inline runtime style 與 state 不序列化回 canonical HTML。

## Browser evidence

- Dependency spike：`vanta-capability-spike.json`；11/11 candidate 均建立 800×450 canvas、兩幀像素 hash 不同、destroy 後 canvas=0，console/pageerror/external network=0。
- 正式 renderer：`browser-acceptance.json`；11/11 effects 均 `running`、animated pixels=true、replay 後單一 canvas、forced-static 後 canvas=0。
- Reduced motion：state=`reduced`、canvas=0；WebGL disabled：state=`webgl-unavailable`、canvas=0。
- Light palette：WAVES runtime 正常，title computed color `rgb(33, 27, 22)`，slide background `rgb(248, 241, 230)`；dark palette 覆蓋全部效果。
- Browser editor duplicate：2 layers／2 running canvases；delete 後回到 1 layer／1 canvas，沒有 frozen clone 或 orphan runtime。
- Browser export：serialized layer canvas=0、state=`static`、canonical effect=`waves`；HTML 852,022 bytes；console/pageerror/external network=0。

## Verification

- Slice 3 focused：5/5 PASS。
- Slice 1 compatibility + Slice 3：12/12 PASS。
- Full regression：182/182 PASS。
- Syntax checks、`git diff --check`：PASS。
- Vanta/Three portable bundle：778,559 bytes；SHA-256 `c3ce4c1144610e85c14144c19c9676b889c58cd746d88ccd1a4e0d1a6fcdef5b`。
- Fresh ZIP：2,116,772 bytes，低於 20 MiB；SHA-256 `ec3dce8032afded30c18a563ec138c4f4396e102ac2b36822c95de47997d5778`，由 `final-zip-sha256.txt` 與 `dist/PPTSKILL-0.1.0.zip.sha256` 同時鎖定。
- Fresh package smoke/install/uninstall lifecycle：PASS；Codex／Claude Code recognized；Gemini CLI missing，維持 UNVERIFIED。

## Deferred boundary

- CLOUDS2 只有在 pinned texture 進正式 dependency/license/checksum gate 後才可重評；本 slice 不以其他圖或 fallback 冒充。
- TOPOLOGY／TRUNK 不打包 p5；license gate 未通過前維持 unavailable。
- 不含 EDX、WP4、whole-deck motion consistency、任意 shader/CSS/JS、foreground effect、新 renderer primitive 或專業 timeline。
- 本 receipt 是 review candidate evidence，不是獨立 review GO，也不把 PGQ-WP3 宣告 COMPLETE。
- P0-R11 的 `824471ae…` receipt 保留為當時 MVP reseal 的 immutable historical evidence；本 Slice 的 candidate checksum 不回寫成 P0 已驗收事實。
