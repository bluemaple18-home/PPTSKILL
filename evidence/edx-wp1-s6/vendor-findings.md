# Native Worker vendor 查證 — 主線核對版

Worker Mendel（clean／唯讀）；無改檔、安裝、browser或commit。CodeGraph未命中vendor後bounded rg。主線另外重跑verifyMoveableVendor並核對drag/grid來源。

本repo內來源：`node_modules/.pnpm/croact-moveable@0.9.0_croact@1.0.4/node_modules/croact-moveable/dist/moveable.esm.js`（以下E），types為`node_modules/.pnpm/react-moveable@0.56.0/node_modules/react-moveable/src/types.ts`（T）；lockfile471–477固定依賴鏈。

- E1487–1503／T2582–2587：snappable + enableSnap共同啟用，陣列另篩able。
- E5233–5295、5480–5514／T2651–2660：snapGridWidth/Height預設0，guidelines包含clientLeft/Top與snapOffset，snapContainer預設container。原點不是天然slide canonical(0,0)。
- E2950–2962：先將snap offset加到distX/Y，再算beforeTranslate/translate；E2975–2988的beforeDist為扣掉startValue後位移。E494–507與472–478：兩種translate走不同矩陣，不能任意互換。
- E3552–3554、3595–3624／T1263–1299：resize先snap bounding size再套限制；width/height為CSS尺寸，含內嵌drag以處理固定邊位移，不等於保證canonical box。
- E11561–11563、7052–7057：一般drag已有rootMatrix逆轉換，不可無條件再除viewport scale。
- E13402–13409與runtime/vendor/moveable-0.53.0.iife.js182：既有bundle包含Snappable。E1505–1510預設吸附四邊，不是左上角簡單量化。
- `runtime/vendor/moveable-LICENSE.md:429`：Moveable0.53.0 MIT；croact授權401起。metadata/input/metafile/attribution沿既有pinned evidence。

主線實測bundle247646 bytes，gzip80891，SHA `9d4aedaf4a7535b53b3a3c850e4372c149b1e5cc9845268f84c92649222ee053`；verifyMoveableVendor PASS，見vendor-verification.json。已包含能力不代表adapter零成本；未量測Snappable個別bytes、啟用效能或真browser結果。
