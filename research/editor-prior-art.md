# PPTSKILL Post-Generation Editor Prior Art

**Research ID:** EDX-20260914  
**Status:** OWNER-APPROVED DIRECTION / IMPLEMENTATION NOT STARTED  
**Scope:** 後期直接編輯的 8 項 Owner 決策，Prior-Art-First 對照；不是 library lockfile，也不是 runtime receipt。

> Source verification note：本輪已以 GitHub repository metadata / LICENSE / project docs 重新核對核心候選：Moveable、Selecto、Cropper.js、browser-fs-access、idb-keyval、Immer、NumberFlow、Motion、Floating UI、Vanta、p5.js、Lexical、Excalidraw。活躍度只代表截至 2026-09-14 repo 未封存與有近期 repository activity evidence；不等於維護品質保證。`Pinned Version` 與實際 bundle size 必須在 implementation spike 時另外量測，不得以 `main` / `latest` 直接進正式包。

## 0. 核心規則

後期 Editor 不允許「看到功能就自己手刻」。每張實作卡在進 code 前必須填：Prior Art、Classification、License、Pinned Version、Bundle / Portable Cost、Why Custom、Acceptance。沒有證據說明 OSS 不適用，就不能以 `CUSTOM_DELTA` 重造 drag/resize/selection/crop/history/persistence/motion/odometer/floating-toolbar 等通用 primitive。

產品仍維持一個 portable `deck.html`、一個 DeckSpec/StyleSpec/CompositionSpec 正本、一個 editor runtime 與同一條 sanitizer/export。OSS 只能提供通用 primitive；PPTSKILL 自己寫的部分只限 domain glue：stable identity、operation scope、manual override precedence、Evidence 保護、QA invalidation、portable round-trip、optional AI host bridge contract。

## 1. Owner 已通過的 8 項

1. Guided Direct Manipulation：可 drag/resize/snap，但不是無治理 Canva canvas。
2. Direct Text Editing + Role-based Typography + Manual Override + Copy/Paste Style。
3. Replace-first + Safe Insert：文字／圖片／影片；圖片拖入／貼上；Evidence crop 警示。
4. Multi-select + Smart Alignment + Invisible Snap Grid + Lightweight Group/Lock。
5. Safe Editing History：Undo/Redo、local draft、edit-start recovery、能力存在時 external-change detection；不假裝 file:// 一定可偵測磁碟變更。
6. Role-aware Motion Inspector：效果／速度／強度／順序／replay；不做專業 timeline；背景 effects 獨立。
7. Human Intent Preservation：content patch 不洗 manual layout；recompose 才能明確取代；所有可直接操作元素需要 stable identity。
8. Progressive Contextual Editor + Unified Operation Registry + Optional AI Bridge：HTML 本身無 AI 依賴；有 host bridge 才能 inline AI，否則外部 AI 讀 deck.html。

## 2. Prior Art Map

分類：`DIRECT_REUSE / ADAPT / REFERENCE_ONLY / CUSTOM_DELTA / SHOULD_NOT_ADOPT`。

| Source | License / repo evidence | Classification | 吸收 | 不吸收 / gate |
|---|---|---|---|---|
| `daybrush/moveable` | MIT；repo 描述直接列 draggable/resizable/groupable/snappable | **ADAPT / P0 candidate** | drag、resize、group transform、snap guides；以 stable element ID 接 PPTSKILL operation | 不採 warp/任意 rotate 作一般預設；不能直接讓 library DOM state 成 canonical；先量 bundle 與 1600×900 scaling |
| `daybrush/selecto` | MIT；repo 定義 mouse/touch drag-area selection | **ADAPT / P0 candidate** | marquee selection、Shift/多選選取，和 Moveable 同生態 | 不把 selection state export；selection chrome 不進 DeckSpec |
| donor `html-slide-builder-oss` editor | repo snapshot；研究材料，非已安裝 dependency | **ADAPT** | 8px grid、align/distribute、arrow nudge、IME text edit、style copy/paste、undo/redo、first-edit backup、trash restore、page management、動畫 editor 實戰 guardrails | 不吸收 HTML-as-only-truth、Python editor/server、任意 HTML、runtime download `@latest`、mtime conflict 假設到純 portable HTML |
| `floating-ui/floating-ui` | MIT；repo 定義 floating element positioning/interactions | **DIRECT_REUSE candidate** | contextual toolbar / inspector 的 anchor、flip、shift、viewport collision | 不把它當 editor state；只解浮動 UI 定位 |
| `fengyuanchen/cropperjs` | MIT；活躍 JS image cropper | **ADAPT / P0 candidate** | crop/move/zoom/fit UI，接現有 browser asset optimizer | Evidence 圖需 PPTSKILL policy：裁切不得抹掉 claim context；不把 crop result 當原始 Evidence |
| `GoogleChromeLabs/browser-fs-access` | Apache-2.0；repo 明示 File System Access API + legacy fallback | **ADAPT / P1 candidate** | open/save capability、FileSystemFileHandle 存在時的 external-change/fingerprint seam、fallback save-as | 沒有 handle 時不得宣稱可檢查 mtime；portable 基本能力不能依賴它 |
| `jakearchibald/idb-keyval` | repo `LICENCE` 明示 Apache-2.0；IndexedDB promise key/value helper | **DIRECT_REUSE candidate** | local draft / edit-start recovery 的小型 durable storage | 先 probe `file://`/browser persistence；失敗時 UI 不得顯示「已自動儲存」；不升級成 app DB |
| `immerjs/immer` | MIT；官方 patches 文件有 `produceWithPatches` / inverse patches，並列 undo 用途 | **ADAPT / P0 candidate** | operation 後的 patches/inverse patches、Undo/Redo、replay；可把一個 pointer gesture coalesce 成一筆 history | 不用 Immer patch 取代 PPTSKILL Operation Registry；不把 undo stack export 到 deck.html |
| `barvian/number-flow` | MIT；repo 定義 animated number for TS/JS/React/Vue/Svelte；source 有 `trend`、`respectMotionPreference`、prefix/suffix | **DIRECT_REUSE / ADAPT P0 candidate** | Owner B odometer 的 digit rolling、方向、format/prefix/suffix/reduced motion；PPTSKILL 補 slide-enter/replay、old/new evidence mapping | 不讓 NumberFlow 成數值真相；canonical 數值仍在 content；先驗負值、小數、百分比、pp、locale 與 portable bytes |
| `motiondivision/motion` | MIT；2026 repo 仍活躍，JS/React animation library | **ADAPT candidate** | 若 native WAAPI/CSS 不足，用於 sequence/easing/transform composition/replay | 和 Anime.js 最多選一個；先 benchmark native path、bundle 與 single-file cost，不預設引入 |
| `tengbao/vanta` | MIT；animated 3D backgrounds；donor 亦採 Vanta vocabulary | **ADAPT** | 14 類背景效果的真正 runtime family、lifecycle、per-effect options；StyleSpec 色彩 adapter | 不採 CDN/runtime `@latest`；逐 effect pin/checksum/offline；不是所有 effects 都同一 backend |
| `processing/p5.js` | LGPL-2.1（GitHub license metadata） | **LICENSE GATE / REFERENCE UNTIL CLEARED** | donor 的 TOPOLOGY/TRUNK 等 p5 backend 只有通過 legal/bundle review 才可帶入 | 不能因 donor 能跑就直接包進商用 ZIP / single HTML；需確認 LGPL 動態/靜態打包義務與替代 backend |
| `facebook/lexical` | MIT；2026 repo 活躍，extensible text editor framework | **REFERENCE_ONLY initially** | IME、selection、accessibility、editor-state design 可做測試/參考 | PPTSKILL 文字框目前不需要完整 rich-text document model；避免 Lexical state 與 DeckSpec 雙正本；有真正 rich-text gap 再升級 |
| `excalidraw/excalidraw` | MIT；活躍 whiteboard | **REFERENCE_ONLY** | selection、grouping、history、keyboard、contextual UX、recovery 行為的成熟案例 | 不嵌整個 whiteboard/canvas，不取代 DeckSpec/CompositionSpec，不做 collaboration stack |

### 暫不選為 primary 的替代方案

- `interact.js`：drag/resize/snap 的 benchmark 候選；與 Moveable 二選一，不同時帶兩套 transform runtime。
- Anime.js：一般 motion benchmark；與 Motion 二選一。若原生 CSS/WAAPI 足夠，兩者都不引入。
- GrapesJS：網站 builder / command/component model 可參考，但不適合做 canonical deck editor；避免拉進 Style Manager / web-builder architecture。
- Theatre.js Studio：專業 timeline/editor 方向太重；不符合「每個人都能用」與 portable 單檔目標，最多研究 property/timeline UX，不整套吸收。
- tldraw：只有完成目前 SDK license 與嵌入條款審查後才可再評估；目前不列 dependency candidate。

## 3. 8 項能力的工程落點

| Owner decision | Prior art first | PPTSKILL CUSTOM_DELTA only | Existing seam |
|---|---|---|---|
| EDX-D01 Direct manipulation | Moveable + Selecto；donor grid/nudge | geometry override mapping、safe-area/QA、allowed roles、manual override priority | `runtime/deck-editor.js`, CompositionSpec, geometry gate |
| EDX-D02 Text/typography | donor IME/contenteditable/style copy；Lexical reference | role-based StyleSpec mapping、bounded typography overrides、overflow invalidation | editor + StyleSpec + sanitizer |
| EDX-D03 Replace/Insert | Cropper.js；browser clipboard/file primitives | DeckSpec component insertion IDs、Evidence crop policy、portable video limits、safe placement | `deck-editor.js`, asset optimizer, asset policy |
| EDX-D04 Selection/alignment | Selecto + Moveable snap/group；donor align/distribute | Operation Registry for align/equal-gap/group/lock；group relationship in spec | editor + CompositionSpec |
| EDX-D05 History/recovery | Immer patches + idb-keyval + browser-fs-access；donor backup/undo lessons | operation coalescing、draft capability probe、source fingerprint semantics、no-history export | editor + save/export path |
| EDX-D06 Motion inspector | NumberFlow；existing motion; donor animation rules; Vanta; optional Motion | PPTSKILL role mapping, motion metadata, slide lifecycle, Style color adapters, QA invalidation | `motion-primitives.js`, renderer/editor, PGQ-WP3 |
| EDX-D07 Human intent | No generic OSS can define PPTSKILL precedence | stable element IDs、content/visual/recompose scopes、manual overrides、destructive conflict contract | DeckSpec/CompositionSpec + local patch + sanitizer |
| EDX-D08 Contextual editor/ops | Floating UI；Excalidraw/GrapesJS as UX references | unified operation registry、selection-scoped AI request contract、optional host bridge capability | `deck-editor.js`, CLI adapters / future bridge seam |

## 4. Unified Operation Registry — 必做，不做三套 mutation

Toolbar、keyboard、AI bridge 都只能呼叫同一 registry。至少包含：

`move-element / resize-element / edit-text / set-typography / copy-style / paste-style / replace-asset / insert-element / delete-element / align-selection / distribute-selection / group / ungroup / lock / unlock / set-motion / reorder-slide / duplicate-slide / delete-slide / reset-slide / recompose-slide`。

每個 operation descriptor 必須定義：input schema、allowed target roles、mutates scopes、preserve scopes、destructive flag、confirmation rule、undoable、QA invalidation、portable serialization、fallback/unsupported reason。滑鼠 drag 從 pointerdown 到 pointerup 算一筆，不把 100 個 move event 變 100 次 Undo。

AI bridge 不是 `deck.html` 基本依賴：無 bridge 時 editor 全功能人工可用，AI 改動回到外部 Codex/Claude/Gemini 讀取 HTML；有 bridge 時也只能回 bounded operation payload，不接受任意 HTML/JS/CSS patch。

## 5. Stable Identity / Manual Overrides — schema repair

現有 components 已有 ID，但 `keyPoints` 仍主要由 array index 定位。要支援 point reorder / typography / animation / drag，所有可直接操作 presentation element 必須有 stable identity。先做 backward-compatible schema proposal；舊 DeckSpec 可讀，新版另存不可把 identity/overrides 丟失。

Manual override 不另造第二套 layout DB。有效 presentation spec 應仍由 CompositionSpec + bounded overrides 表達；content patch 保留 geometry/typography/motion overrides，visual patch 保留 content，`recompose-slide` 才能明確取代相關 layout overrides。若 recompose 會丟人工調整，operation 必須宣告 destructive scope 並提示。

## 6. Safe Editing History — acceptance contract

- Undo/Redo 是 operation-level，redo branch 在新 mutation 後正確清除。
- local draft/recovery 只在 browser capability 真實可用時宣稱成功；storage failure 可降級為 session history + leave warning。
- first real mutation 建立 edit-start recovery snapshot；`Reset this slide`、`Restore edit-start deck`、`AI recompose` 是三個不同操作。
- external-change detection 僅在能持續持有/重新讀取 file handle 或等價能力時啟用；普通雙擊 file:// 的 fallback 仍是 Save As New，不假裝有 mtime watch。
- history、selection、editor chrome、backup、draft 全部不進 portable HTML。

## 7. Motion-specific donor rules

沿用 donor 實跑發現的 guardrails：動畫不可把 live 中間值序列化為 canonical；rAF/background-tab failure 必須 force final state；離頁 reset 才可 replay；transform 應 compose 既有 transform；reveal 的 failsafe 在 hide 時就武裝；多選 animation order 應重新編為連續序；editor order badges 屬 chrome 不出檔。

PPTSKILL 的改造點：canonical DeckSpec 不等於 animated DOM，正式 preview 可以在 slide presentation layer 執行，但任何 animation transform/opacity/text intermediate state 禁止回寫 canonical。Reduced motion 直接顯示完整終態。

## 8. Dependency / License / Bundle Gate

任何 candidate 在 merge 前都要固定版本與 integrity/checksum，保存 repo/license/NOTICE；不使用 runtime `latest`。對每個 library 量測實際 minified/gzip 與最終 inline bytes，而不是用 repo size 猜；最終仍受 12 MiB warning / 20 MiB hard fail。

優先允許 MIT / Apache-2.0 等 permissive dependency，但仍需 NOTICE/attribution 處理。LGPL-2.1 的 p5.js 單獨走 license review；未通過時 TOPOLOGY/TRUNK 標 unavailable 或尋找同語意 permissive backend，不因此把其他 Vanta effect 全部卡死。

## 9. Execution grouping — 不開成 8 套 editor

建議只開 4 個增量包：

1. **EDX-WP1 Editor Core:** stable identity + Operation Registry + Moveable/Selecto/Floating UI + contextual selection + manual override round-trip。
2. **EDX-WP2 Content/Asset Editing:** text role/IME/style copy + replace/insert + Cropper + group/lock/alignment + sanitizer/export round-trip。
3. **EDX-WP3 History/Motion:** Immer/idb/browser-fs capability + Undo/Redo/recovery；NumberFlow + motion inspector；與 PGQ-WP3 background work 共用 Vanta adapter，禁止第二套 motion runtime。
4. **EDX-WP4 Human Intent / Compatibility:** scoped patch precedence、destructive confirmation、old/new DeckSpec migration、recipient AI replay、optional AI bridge contract、full browser/geometry/size/security regression。

順序在 BACKLOG 決定；本文不插隊目前 `P0-R11-R1`，也不宣稱以上 dependency 已選定或 package 已加入。每個 candidate 仍需 spike + bundle/license/browser evidence 後才能從 ADAPT/CANDIDATE 轉為 DIRECT_REUSE/INSTALLED。
