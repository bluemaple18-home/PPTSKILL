# EDX-WP1-S4 — 單一 component Moveable interaction

**Status:** COMPLETE — Independent Review GO
**Base:** `20b54ac64c99682a20c0af1a71ceb7b4fa6de406`（S3 GO closure；stacked branch，不 merge main）
**traces_to:** `BACKLOG.md 10.1 Decisions 1/7/8`、`10.2`、`10.3 EDX-WP1`、`10.4–10.8`

## Mission／主線裁決

讓使用者在 portable HTML 既有 editor 內，以真實 pointer gesture 移動／縮放單一 component；所有提交都走 S3 `executeOperation()`，export／offline reopen 重建同一 canonical geometry。Owner 已要求主線繼續並決定派工；S3 GO 滿足另切 interaction card 的 checkpoint。S3 不 merge，本卡接在其 closure 上；完成後停獨立 review candidate。

Measured gap：S3 已有可驗證的 operation，但沒有使用者可操作的 geometry UI。why_not_less：只包 vendor 或只做 synthetic event 不能閉環使用者路徑。why_not_more：單一 component 不需要 Selecto／多選／通用 registry／history。S3 motion transform P2 已接受，不能以本卡順手修 motion 系統。

## Prior art／成本

- Moveable `0.53.0`，MIT，S1 **GO / ADAPT**；registry integrity `sha512-71jS9zIoQzMhnNvduhg4tUEdm23+fO/40FN7muVMbZvVwbTku2MIxxLhnU4qFvxI4oVxn75l79SbtgjuA+s7Pw==`，LICENSE SHA `77f98221f8531e87aa227c0a8d63c17c903dd4d36daf24bdc48296b09e06a25e`。
- S1 minified 248,913 bytes／gzip 81,518 bytes 是研究基線，本卡重測真 bundle／inline HTML／ZIP。來源與證據：`research/edx/wp1-editor-core-dependency-spike.md`。
- 本卡授權 exact package／lockfile／bundled vendor；採 `pnpm`、停用 install scripts，使用既有 esbuild/vendor verification seam，記錄 license／transitive attribution／integrity，不用 CDN 或 runtime network。
- Selecto **DEFER 本 Slice**：單選可用既有 stable identity＋click；Floating UI **REJECT FOR WP1**；不直接加入／import／bundle 兩者，不手刻 generic drag/resize primitive。
- 依賴閉包裁決：`moveable@0.53.0 → react-moveable@0.56.0 → react-selecto@1.26.3 → selecto@1.26.3` 為 pinned upstream 宣告。允許這條未使用的 transitive chain 存在於 install／lockfile，不改寫 upstream metadata；禁止將其納入 portable bundle 或功能。Mainline esbuild metafile probe：16 inputs、Selecto inputs 0、247,066 bytes，見 `evidence/edx-wp1-s4/transitive-boundary-probe.json`；正式 vendor build/verifier 必須重驗此邊界，不能只靠本次 probe。這不授權直接採用 Selecto。
- Why custom：只寫 selection/gesture 到 canonical operation 的薄 adapter，vendor 不能擁有 state／export／history。12 MiB warning／20 MiB hard gate 不變。

## 操作與資料契約

1. 沿用既有 editor chrome／按鈕樣式；增加明確的版面編輯模式，只選 single `component`，不處理 title／subtitle／keyPoint／slide root。選取、模式、handles 是 ephemeral chrome，不進 DeckSpec。
2. 單擊選取不修改 canonical。Legacy component 沒有 geometry override 時，提供明確的「套用手動版面」動作，以 S3 deterministic default 初始化；必須讓使用者知道會套用手動位置／尺寸，不從 DOM pixel 反推 legacy layout。取消選取或僅切模式不能產生 override。
3. 已有 override 時，drag 使用其 canonical rect；最小 resize 可限右下角（SE）以保持 x/y 不變，避免增加複合 operation／部分提交問題。只輸出 absolute integer `{x,y}` 或 `{width,height}`；1600×900、safe inset／minimum 沿用 S3 validator，不新增 schema／descriptor。
4. Gesture preview 只屬 transient presentation；pointer release 一個 gesture 至多提交一次既有 operation。Resize 不另外提交 move；no-op 不提交。Viewport scale 只用於 gesture 到 canonical 的座標換算，不能保存 scaled pixels／transform／selector。
5. Escape／pointer cancel／切模式／target stale／刪除 target 必須取消 preview 並恢復 canonical，無部分 mutation。超界／低於 minimum 的輸入由既有 validator 拒絕，復原並給簡短可見訊息，不能 secret clamp 冒充成功。
6. Export 在 selected／preview 中仍只保存已提交 canonical geometry，移除 handles／selection／runtime vendor style chrome；reopen 再編輯可用，不堆疊 vendor listeners／instances。退出編輯／刪除／重開 target 有明確 teardown。
7. Play mode 不啟用 drag、不攔截既有播放；既有文字編輯／IME 路徑不被 component pointer handler 劫持。S3 motion P2 維持明示已知限制，不能宣稱本卡修復完整 motion preservation。

## 驗收／執行範圍

- 先 public-interface RED，涵蓋坐標換算、一次提交、invalid/no-op/cancel/stale 原子性、mode/selection 不寫 spec、legacy 明示初始化、export 清 chrome／preview。
- Fresh managed Chrome 用真正 pointer/CDP input 操作 Moveable，不以直接呼叫 handler 或單跑 executeOperation 取代：雙 viewport 1280×720／1600×900，真 drag／SE resize／cancel／越界拒絕、切模式、export→offline reopen→再次操作；console/pageerror/network/HTTP 0。
- static／normal geometry QA 使用最終真正 export artifact，既有 content/readability/raster authority 不放寬。Known S3 motion P2 不冒充 fresh regression closure。
- 收斂所有 producer code 後再跑 focused／受影響 compatibility／full regression（non-browser＋PGQ browser）與 fresh ZIP build/install/smoke/uninstall；綁 source SHA、實測 bundle/ZIP bytes／SHA，syntax／diff check PASS。
- 只一名 Worker、clean context、shared workspace sequential writer；Owner 已同意 Astra 替代。本輪 strict fixed contract，Worker Astra high。主線負責 browser/ZIP 收證、diff 與裁決；若為執行 browser 必須讓 Worker 跑，仍限定同一受管 owned browser 與明確 ownership。
- 同類兩次無進展、需要第二 layout truth／新 operation／任意 CSS／超範圍 dependency 或缺關鍵資訊時停止並回 Mainline；不自行擴 scope。

## Non-goals／交付

- 不 merge／push／deploy，不直接採用或 bundle Selecto／Floating UI（僅容許上述 upstream unused transitive chain），不做 marquee／多選／snap／keyboard nudge／align／group／lock／toolbar framework／history／draft／AI bridge。
- 不修改四個既有 untracked：`.DS_Store`、`CLAUDE.md`、`HANDOFF-20260914-P0-R11-R1-S3.md`、`HANDOFF-20260914-PGQ-WP1.md`。
- 交付 source/tests/vendor attribution、task-local receipt、最終 artifacts、可重現 independent review handoff；只關本卡，不開 S5。

## 本輪結果／停止點

- focused 25/25、compatibility 53/53、non-browser full 225/225 PASS。
- fresh owned Chrome：雙 viewport 真 pointer／preview export／offline reopen 全 PASS；static／normal geometry 全 gates PASS。
- PGQ 28 個 unique cases 均已通過：首輪 26/28，owned browser 因 resource scan limit 中止；相同來源新 profile 重驗 3/3（含兩個失敗 case 與一個重複 coverage case）。不是單輪 28/28；完整失敗／重驗／cleanup 紀錄均保留。
- ZIP 2,248,891 bytes，SHA-256 `4aa7fa8a683b57b49a1d6a3ad2ea87b77f0312f1731b724abfb240d9ac47402c`；lifecycle/smoke PASS。Gemini CLI 缺席，host capability partial。
- 來源 SHA 前後一致；兩個 owned profile 已清理，四個既有 untracked hash 未變。S3 motion P2 延續。
- 交付 `evidence/edx-wp1-s4/mainline-receipt.md` 與 `handoff_20260920_edx_wp1_s4_review.md`；停止在獨立 review candidate，不 merge／push／deploy，不開 S5。

## Independent Review closure

Owner回傳 reviewed commit `05295d3853364157a6da0ae30459eebc26bf11c5`：GO，P0/P1/P3=0，P2新增1＋繼承1。新P2為pointer update整份DeckSpec stringify成本；繼承S3 motion transform P2。均不阻擋S4。Reviewed code與ZIP未改，完整獨立重驗範圍見 independent-review.md。
