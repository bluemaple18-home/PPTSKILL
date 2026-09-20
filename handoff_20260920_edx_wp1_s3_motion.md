# S3-MOTION Mainline review handoff

## Root question／current state

manual geometry保留motion transform且不破壞canonical geometry、preview/cancel與portable契約。Mainline驗收完成，Independent Review GO；S3-MOTION與inherited motion-transform P2正式關閉。
Branch `codex/edx-wp1-s3-motion`；review base `a5e5d43`（S4-PERF closure）；delivery checkpoint `1b2d4f3`。固定reviewed SHA：`68eace85123993db84a03c4e75aeb9415ae7e47f`；後續closure commit只更新控制文件。

## Scope／evidence

先讀 `tasks/edx-wp1-s3-motion-preservation.md` 與 `evidence/edx-wp1-s3-motion/mainline-receipt.md`；CodeGraph後bounded rg。核心兩檔component-geometry.js／deck-editor.js：永久transform suppression退場，canonical projector保留無關inline style與priority，只清舊canonical none!important。檢查legacy清理、preview/cancel/commit、export clone、renderer/reopen與motion三mode；不改schema/vendor/motion canonical。

- focused60/60；完整nonbrowser251/251；diagnostic-only browser工具補測9/9為重疊子集，不相加。
- fresh單獨motion：1280×720、1600×900各31 checks PASS，console/page/network/HTTP/remote全0，targetClosed=true。`mainline-browser-retry/acceptance.json`含computed transform與animation診斷。
- PGQ：首輪19具名PASS＋approval1/1＋full/visibility8/8，28 unique有完整覆蓋；`pgq-coverage.json`逐項對照，非單輪28/28。
- ZIP 2,249,561 bytes；SHA `9eb63de4894f1495d63b351c751d9d776bb5ca5382ed48b9b3a16ebc6cfde58c`，lifecycle/smoke PASS；Gemini CLI缺席為host partial。
- source7/7 hashes與四個既有untracked保持；三個新browser均supervisor exit0、exact root與marker清除。

## 歷史失敗／限制

首輪motion的restrained-fade-rise normal pointer後終點失敗，當時另有PGQ target，end snapshot未記。主線只補diagnostics，後續單獨重驗全部PASS；未證實首輪確切因果，不抹掉fail。PGQ首輪Chrome被resource scan limit中止且跨程序回收拒絕；ai-core以Owner授權recovery合法清舊root／unknown marker，完整receipt在本卡evidence。ai-core回傳92tests／兩份review通過，後經Owner授權僅修fixture completed stage並通過正常hook，已提交 `2932d8739d3c27617ef4ba262b4b4a27bd5580d5`。此上游commit狀態不等同PPTSKILL產品verdict。

restrained-fade-rise fixture是既有renderer component effect-token seam，預設自然routing屬supportingCopy；不可宣稱全style routing覆蓋。legacy canonical none!important無法與完全相同的人手inline值區分，其他style保留。

## 重現／next step

從repo root核對 `shasum -a 256 -c evidence/edx-wp1-s3-motion/verification-source.sha256`；focused命令見worker-receipt.md。真browser需新的owned session，設定PPTSKILL_DEVTOOLS_ACTIVE_PORT後執行 `node tools/edx-wp1-s4-browser-acceptance.mjs <new-evidence-dir> --motion-regression`，禁止與PGQ共用session同時跑，舊profile已清不可重用。

Owner已回傳GO，完整verdict見 `evidence/edx-wp1-s3-motion/independent-review.md`。reviewer fresh focused60／bounded nonbrowser237／source7 PASS；browser與PGQ只核對已提交evidence，未fresh重跑真browser。Mainline已裁決closure，後續依EDX frontier另開卡，不擴本卡。無merge/push/deploy；reviewed code／ZIP／4既有untracked保持。
