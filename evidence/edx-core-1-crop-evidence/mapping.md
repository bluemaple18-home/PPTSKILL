# PPTSKILL 第 1/6 卡 readonly crop mapping

2026-09-24；契約：`tasks/edx-core-1-crop-evidence.md`，本卡內 mapping，不開新主卡。
Repo：`/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical`。
Owner 最新狀態：control/evidence commit `45d6e0c`，delivery `84ea938` 不變；這兩個 SHA 依 Owner 提供，未另外做 diff 驗證。開工讀取時 checkout 顯示 `01e89d1`，不拿它覆蓋最新交接。
狀態：研究交回，等待同卡 implementation；沒有修改 repo／AI Core，沒有 git mutation、install、build 或 browser launch。

## 單一最小推薦

**完整原圖仍在 `image.dataUri`；normalized source crop 經共用純函式轉成 SVG viewBox data URI，投影到原有 `figure > img` 的 src。** 保留 img node、alt/object-fit、figure identity、geometry、motion；衍生 SVG 不得回寫 dataUri，不做 bitmap 重採樣。

**Evidence 使用 contain＋人工分類／確認＋一個保護矩形；未分類不得確認裁切。** decorative 可 cover。換圖即讓確認失效；原 Evidence source-changing replace 在舊來源保留政策未裁決前原子拒絕。這個拒絕是安全界線，不是整卡 replace 驗收完成。

## 1. canonical／投影／既有接法

提案必要欄位（未實作）：

| 欄位 | 用途與限制 |
|---|---|
| `crop: {x,y,width,height}` | 原圖 normalized rect；finite、x/y≥0、width/height>0、右下界≤1。非 geometry、非 viewport px |
| `sourceSize: {width,height}` | 正且有合理上限的解碼尺寸，支撐同步 renderer intrinsic ratio；必須核對來源，不能相信 caller 自填 |
| `imageSafety.classification` | evidence／decorative；缺省 unknown，不從 claims/sourceRefs 猜 image provenance |
| `imageSafety.protectedRect` | Evidence 必需：人手框住所有重要軸／標籤／圖例／來源註記的單一 source-normalized AABB。無需陣列／OCR |
| `imageSafety.reviewDigest` | 人工確認後，綁來源、sourceSize、crop、effective fit、classification、protectedRect 的固定順序 tuple；僅防 stale，不證明來源真實性 |

設原圖 W×H，crop=(x,y,w,h)，X=xW、Y=yH、CW=wW、CH=hH。衍生 SVG 固定模板：

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="CW" height="CH"
     viewBox="X Y CW CH" overflow="hidden">
  <image x="0" y="0" width="W" height="H" preserveAspectRatio="none"
         href="經驗證且 XML attribute escape 的原圖 data URI"/>
</svg>
```

SVG base64 後為 img.src，object-fit 對裁後 intrinsic ratio CW/CH 生效；無 crop 時直接使用原 dataUri。固定模板只接受驗證過的資料，不接 caller 任意 SVG／CSS。這是數學與 source mapping 推論，未經 browser pixel 驗證。

接點已限域讀取：

- `runtime/deck-spec.js` 的 image sanitizer、`runtime/deck-editor.js` 的 portable sanitizer：現在只留 id/type/alt/dataUri/fit，新增欄位目前會被丟掉；應接同一薄 contract。
- `schemas/deck-spec.schema.json` imageComponent：additionalProperties=false，須新增 optional crop/safety/sourceSize；舊 deck 沒 crop 照舊。
- `runtime/asset-replacement.js` validate/update/project：現有 update 只改 dataUri/alt/fit，project 直接設定 src/alt/object-fit；改接共用 image projection，replace 必須失效舊確認。
- `runtime/full-deck-renderer.js:64` normal markup 與 `runtime/deck-editor.js:509` portable markup：兩者都要接同一 projection，不能只改 replace。
- `runtime/deck-editor.js:569–576` portable replace：沿 candidate＋src/alt/style snapshot rollback、同一 img node、單次 revision。新增 crop 沿 executeOperation，不讓 DOM 成 authority。
- `runtime/deck-editor.js:501–503` export：clone 從 canonical 重投影 image，去 crop chrome／preview；`runtime/deck-spec.js` recipient extract 再 sanitize 保留新欄位。Node/portable 的 generic patch 等寫入口也不能繞過 guard。

保存／移除／replace：

- confirm：完整原圖逐字不變；一次提交 crop/sourceSize/safety/review；pointer 只更新單張 transient preview，不 stringify 全 deck。
- cancel：清 transient，不改 canonical/revision。reset「完整原圖」：移除 crop/review，明確 fit=contain，保留分類／保護框；否則舊 cover 仍可能遮原圖。geometry/motion 不動。
- component deletion：附屬 crop/safety 一起移除，不建 registry；Evidence 刪除授權語意仍沿主線契約。
- 非 Evidence replace：保存 normalized crop 意圖與 geometry/motion；新 decode 更新 sourceSize，清 review／舊保護框，分類回 unknown。無 review 的 crop 僅為 pending 意圖，投影完整新圖＋effective contain，明示待重確認；export/reopen 同規則。
- Evidence replace：現有一個 dataUri 無法同時保留換前來源。政策未裁決前拒絕 source-changing replace，原圖/crop/revision 都不動；不得只清 review 卻默默丟舊 Evidence。
- fit/crop/分類/保護框變更失效舊 review；Evidence cover 拒絕。review 缺省可表示安全 pending；畸形 rect／欄位必須拒絕。

成本：原 dataUri 字串 D bytes、SVG 模板 M bytes，base64 衍生 src 約 4/3(D+M)。原 canonical＋markup 約 2D，改後约 7D/3，主要圖片負荷增加 D/3（約原兩份的 16.7%）；不是零成本。20MiB 應實算最終 HTML，不能用 ZIP 或公式替代。

## 2. selection → source：何時不能直寫

[CropperSelection API](https://fengyuanchen.github.io/cropperjs/api/cropper-selection.html) 提供顯示 selection 座標；[CropperImage API](https://fengyuanchen.github.io/cropperjs/api/cropper-image.html) 提供 ready、center 與 transform matrix。事件包含尚未套用／可取消的變更，不能把 vendor payload 當 canonical。

以 canvas Bx×By、原圖 W×H、中心對齊為例：

```text
k = min(Bx/W, By/H) for contain；max(...) for cover
ox = (Bx-kW)/2；oy = (By-kH)/2
localX = z*k*sourceX + cx + z*(ox-cx) + panX
clientX = viewportLeft + viewportScale*localX
sourceX = (selectionX - 完整平移量) / 完整縮放量
normalizedX = sourceX/W；其餘軸與寬高同理
```

只允許正向 axis-aligned scale＋translation，反算四角；旋轉/skew/flip/singular matrix 拒絕。不能用 canvas 大小直接除 selection。非方圖、contain 留白、cover 負 offset、zoom/pan、transform-origin、外層 scale／scroll 都使直寫錯誤；decode 未完成或 source 已換也不能提交。

若 `$getTransform()` 已包含初始化 fit，不能再乘 k；必須用 exact vendor 實測 matrix 所屬座標、origin、layout/padding/border。selection 與 imageRect 要在同一座標系；img element 有留白時不能把整個 element box 當圖像內容。CSS pixel 不應無端乘 devicePixelRatio。

**可重播 probe**：`node /private/tmp/pptskill-core-crop-probe.mjs`。
結果 `/private/tmp/pptskill-core-crop-probe.result.json`：**PASS，16 組／120 assertions，math-only**。
涵蓋橫 1200×800／直 600×1200、contain/cover、1280×720／1600×900 假設外層 scale、zoom 1/1.6、pan(23,-17)、client offset；另有手算錨點、非法 rect/matrix、留白越界、保護框與等尺寸換圖 stale digest。

手算：1200×800→480×360，crop=(.2,.15,.5,.6)。contain selection=(96,68,240,192)；cover=(78,54,270,216)。前者直接除 canvas 得 (.2,.1889,.5,.5333)，不是原 crop。

部分代數 selection 超出 viewport：probe 證明公式可逆，不證明 UI 可達。沒有圖片 decoder、多色 fixture、pixel sampling、repo import 或 Cropper；SOURCE-A/B 是 identity 字串。**沒有 adapter／Node-portable parity／browser 驗證。**

## 3. Evidence 最小 guard 與換圖失效

缺分類不能猜 decorative，缺確認不能裁；Evidence 必須人工圈重要上下文、确认完整原圖與結果預覽。程式驗 protectedRect 包含於 crop、合法 source/crop、review 綁定及 contain。人工是否漏標、真假、語意、跨元件/effect 遮蔽都不在幾何 guard 能力內。

probe 反例：600×480 子圖再 cover 到 500×200，source 最終可見 rect=(.2,.3,.5,.3)。保護框=(.25,.16,.1,.04) 在 crop 裡，卻被 cover 遮掉。故保留原圖／只驗 crop 包含皆不足；Evidence contain 可避免再加 geometry-dependent guard。

確認綁來源內容而非 elementId／尺寸，等尺寸換圖也失效。async ready 和 confirm 前再核 target、source、revision、current slide、selection/busy；不同於現有 replace 測試允许等待期間切頁仍寫原 stable target，不能直接照搬為 crop 契約。候選 decode failure 應在 commit 前處理，不能僅靠同步 setAttribute rollback。

## 必要未知與 why-not-less

1. **SVG src 格式實證**：[SVG image context](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image) 支援內嵌 data URL，但未證明本 repo 所有格式。[SVG image element](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/image) 提醒 animated GIF 行為未定義。nested SVG、GIF/WebP 動畫、EXIF、尺寸核對與 offline pixel 都待同卡驗證；未通過須拒絕 crop，不靜態化原圖。同步 Node／file:// portable 的 hash 與 decode 接法亦待確認。
2. **舊 Evidence replace 的保留政策**：主線須指定既有保留接點，或明示核准最小來源保留欄位／替換政策；本輪不新增 history、provenance registry、DB。先拒絕的界線不能當作整卡完成。
3. **Evidence cover**：推薦 contain；若主線要求 cover，必須增加最終可見 source rect 和 geometry/fit 變更失效驗證，不能只放行 enum。
4. **native / vendor**：native numeric/range、鍵盤/accessibility controls＋原圖與結果預覽，是 why-not-less 的起點；尚未證明可滿足真 pointer selection 全契約。若 native 互動不足才用 exact-pinned Cropper 薄 adapter。尚未核 license/integrity/dependencies/bundle，官方版本標示不等於採用。此輪不續查。

只改 object-position/cover 不足以表達任意 crop＋contain；clip-path 單用不會將子圖重新 fit。CSS img 位移方案需 layout/resize/clip 協調，未證明更小；inline SVG 會改 img 結構；canvas 增加重採樣。故優先上述 SVG src，但不把數學推論當 renderer 實證。

likely files：五個已授權來源檔；可選新增薄 `runtime/image-crop.js` 共用 validation/math/projection/guard，沿現有 portable serialization，不是新 runtime/model。擴充 `tests/edx-wp2-s4-replace-asset.test.mjs`／export suites 及本卡 crop fixture。現有 replace 測試含 AA==/BB== 字串，只能支持契約 seam，不能冒充像素驗收。其餘 optimizer/size/cleanup/vendor 接點等 implementation 授權後才最小續查。

研究路徑：先實體卡→CodeGraph 指定 repo 查 crop/image/replace（只回不相關 symbols）→授權檔 bounded rg；只讀兩支相鄰測試。未全 repo 掃描。context map 在已查精確候選位置未找到，未擴查，以 Owner／卡片限域為準。
**停止：三問 mapping 已交回；等待同一卡 implementation 指令。**
