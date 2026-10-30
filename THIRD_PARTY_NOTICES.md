# Third-Party Notices

根目錄 `LICENSE` 僅授權 PPTSKILL 第一方程式碼、文件與明確標示為第一方的 synthetic public fixtures。第三方程式碼與參考材料維持各自原始授權，不因 PPTSKILL 的 MIT 授權而重新授權。

## Redistribution matrix

| 元件 | 身分／版本 | 是否隨 release ZIP 散布 | 授權與義務 | repo evidence |
|---|---|---:|---|---|
| NumberFlow | `number-flow@0.6.2` | 是，編譯進 `runtime/vendor/number-flow-0.6.2.iife.js` | MIT；散布 substantial portions 時保留 copyright 與 permission notice | `pnpm-lock.yaml`、`runtime/vendor/number-flow-vendor.json`、`runtime/vendor/number-flow-LICENSE.md` |
| esm-env | `esm-env@1.2.2`，NumberFlow transitive dependency | 保守隨 NumberFlow bundle attribution 一併附上；不主張 tree-shaking 後仍有獨立 module boundary | MIT；保留 copyright 與 permission notice | `pnpm-lock.yaml`、`runtime/vendor/esm-env-LICENSE.md` |
| three.js | `three@0.134.0` | 是，編譯進 `runtime/vendor/vanta-three-0.5.24-r134.iife.js` | MIT；保留 copyright 與 permission notice | `pnpm-lock.yaml`、`runtime/vendor/vanta-vendor.json`、`runtime/vendor/three-LICENSE.md` |
| Vanta.js | `vanta@0.5.24` | 是，編譯進 `runtime/vendor/vanta-three-0.5.24-r134.iife.js` | MIT；保留 copyright 與 permission notice | `pnpm-lock.yaml`、`runtime/vendor/vanta-vendor.json`、`runtime/vendor/vanta-LICENSE.md` |
| esbuild | `esbuild@0.28.2` | 否；只在 repo build 階段使用 | MIT；目前不進 release ZIP | `package.json`、`pnpm-lock.yaml`、`evidence/pgq-wp3-s1/prior-art-intake.md` |
| html-slide-builder-oss donor snapshot | repository snapshot | 否；只存在 `research/donors/` | MIT；reference-only，不是 PPTSKILL runtime dependency | `research/donors/html-slide-builder-oss/source/LICENSE`、`research/donors/html-slide-builder-oss/source/NOTICES.md` |

`research/donors/html-slide-builder-oss/source/fonts/OFL.txt` 是 donor snapshot 內保留的 SIL OFL 1.1 授權文字；PPTSKILL public tree 並未散布該 donor 的字型 binary。

## Public asset boundary

- `design/company-style/public-demo-dark/` 是為公開 repository 建立的 synthetic fixture，asset bytes 由 publication-safety guard 固定 SHA-256；它不含舊私人品牌素材。
- `design/materials/golden-covers/` 只保留衍生 manifest、校準紀錄與設計語法。缺少可驗證 redistribution 授權的原始 reference images 不放在 public tree，也不放進 release ZIP。
- `evidence/` 內公開圖片是 PPTSKILL deterministic QA／rendering 的輸出證據；不得用來重新引入第三方 raw reference binaries。

第三方授權全文以各 evidence path 中的 license file 為準。
