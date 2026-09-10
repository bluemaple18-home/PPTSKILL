# html-slide-builder-oss — PPTSKILL Intake Report

## 結論

**Decision: `REFERENCE + SELECTIVE ADAPT`; `DO_NOT_INSTALL`; 不整包吸收。**

這個 donor 最有價值的是「保護既有編輯」與「可攜 HTML 品質檢查」的局部實作。它的核心架構則是每頁 HTML 直接當 source of truth，與 PPTSKILL 已鎖定的 DeckSpec → bounded renderer → portable HTML 路徑衝突。若整包併入，會重新引進第二套 editor、第二套資料模型、第二套 export 與直接任意 HTML authoring，違反既有產品契約。

本輪只保存證據與候選 mapping，沒有執行 server、installer、packager、下載或外部 API，也沒有修改 PPTSKILL runtime。

## 值得吸收的局部模式

| Candidate | Decision | PPTSKILL mapping | Why |
| --- | --- | --- | --- |
| 寫入前 `--check`，偵測既有編輯痕跡後 fail loud | `adapt` | `P0-R11-R1` existing-HTML preservation gate | 與剛發生的 CC 擅改內容／頁序事故高度相關；PPTSKILL 應以 DeckSpec/content hash 實作，不複製檔名判斷 |
| save 時帶 base mtime，外部已修改則回 409 | `adapt` | R7 editor save/export seam 的 optimistic concurrency 候選 | 能阻止舊分頁覆蓋新內容；須改成 portable artifact revision/hash，不直接搬 server API |
| 每頁首次修改前備份；刪頁搬 `.trash/` | `reference` | 未來 local editor recovery UX | 可回復性好，但 PPTSKILL 現在是單檔瀏覽器 editor，不應因此新增常駐 server 或 folder-based truth |
| `slide_lint.py --strict`：尺寸、外部網址、字體角色、對話框、未定義 class | `adapt` | 現有 geometry/sanitizer/export gate 增補候選 | 以機械 gate 防止「本機正常、別台壞掉」；需逐條比對現有 117 tests，避免重複 validator |
| display/body/label 字體角色；匯出時內嵌 CJK subset | `reference` | StyleSpec typography + portable export | 角色模型有價值；但 fonttools/brotli/curl 會增加 native／下載依賴，不可直接進目前薄 ZIP |
| bounded chart vocabulary + renderable forms | `adapt` | DeckSpec chart component policy | 「只能建議真正 render 得出的形式」值得保留；不直接採用 Python SVG renderer |
| `data-live` 防止 runtime DOM 被序列化進 source | `reference` | motion/effect serialization regression | 對互動頁保存很實用；目前 PPTSKILL motion 不以 live DOM 作 canonical content，尚無 measured gap |
| input method、paste allowlist、relative transform、align from live rect | `reference` | R7 editor refinement backlog | 都是成熟的 editor implementation notes，但不構成本輪開工理由 |

## 不吸收

| Component | Decision | 原因 |
| --- | --- | --- |
| HTML-per-slide 作唯一 source of truth | `reject` | 會取代 DeckSpec canonical contract，讓 content hash、recipient AI patch、sanitizer 與單一 renderer失去權威 |
| `slide_editor` server 整套 | `reject` | 第二套 editor/export/runtime；本輪無 measured gap 支持加入 Python localhost service |
| LLM 直接手寫每頁 arbitrary HTML/CSS | `reject` | 與 bounded composition primitives、Golden Grammar 和防止任意輸出的產品要求相反 |
| Vanta／three.js／p5.js 背景效果 | `reject` | 下載式供應鏈、額外體積、LGPL 分發責任與既有「禁 gimmick」視覺方向衝突 |
| 自動下載字體與 `latest` CDN 資產 | `reject` | 不離線、無 checksum、版本未鎖；破壞 deterministic ZIP 與 no-redownload 邊界 |
| Cowork `pack.sh`／skill lifecycle | `reject` | 是另一套包裝入口；不能覆蓋目前三 CLI 共用 skill 與 ownership lifecycle |

## Component-scoped plan

| Component | Decision | Risk taxonomy | Runtime allowed | Next action |
| --- | --- | --- | --- | --- |
| `skills/slide-deck` | `reference` | `agent_config_review`, `tool_misuse` | false | 只比較 preservation 指令；不註冊、不安裝 |
| `slide_gen/new_deck.py` | `adapt` | `file_write`, `hardcoded_local_path` | false | 與 R11-R1 hash gate 做差異表 |
| `slide_gen/slide_lint.py` | `adapt` | `output_handling` | false | 對照現有 geometry/sanitizer/font tests，只提 measured gaps |
| `slide_editor/` | `reference` | `permission_audit`, `destructive_command`, `runtime_boundary` | false | Web 討論 concurrency/recovery UX；不啟動 server |
| `build_deck.py` | `reference` | `network_download`, `supply_chain`, `runtime_boundary` | false | 只研究 CJK subset 與 resource inlining，不接到 export |
| `chart.py` + vocabulary | `adapt` | `output_handling` | false | 評估是否能補強現有 chart policy，不移植 renderer |
| `skills/pack.sh` | `reject` | `destructive_command`, `package_manager_drift` | false | 不執行、不納入 lifecycle |
| fonts / examples | `reference` | `license_provenance` | false | 保留 checksum 與授權證據，不進產品 ZIP |
| hooks / MCP / agents / router | `reference` | none observed | false | donor 沒提供，不新增 |

## 已確認的風險與缺口

1. **安全邊界只適合 trusted local slides。** `build_deck.py` 實際輸出 `sandbox="allow-same-origin allow-scripts"`，原始碼自己也承認兩者並用近似沒有 sandbox；不能把第三方 HTML 丟進去。
2. **文件與實作漂移。** `EDITOR.md` 說 packed iframe 只有 `allow-scripts`、拿 opaque origin；實際 packager 同時加入 `allow-same-origin`。這會直接改變威脅模型。
3. **localhost write API 沒有 origin／CSRF token。** server 只綁 `127.0.0.1` 且有 path containment，但多個 POST endpoint 可直接寫檔、移動頁、下載程式庫與觸發 export；在採用前必須做 browser cross-origin write 測試與 request-token gate。
4. **上傳沒有明確大小與 MIME allowlist。** `/api/upload` 解碼任意 base64 並寫入 assets，可能造成磁碟耗盡或把非預期內容帶進輸出。
5. **供應鏈未固定。** Vanta 使用 `@latest`，three.js/p5.js/font 以 curl 下載，未見 checksum 驗證；使用 TOPOLOGY/TRUNK 還會把 LGPL p5.js 內嵌進交付物。
6. **可選 demo 會讀取 API key 並呼叫 Anthropic。** 雖然宣稱只在 server side，但這是 PPTSKILL 不需要的外部依賴與 secrets surface。
7. **發佈驗證尚未完成。** donor 自己的 `PUBLISH-CHECKLIST.md` 仍標示 fresh-clone 指令與私人內容掃描未完成，snapshot 也沒有 tests 目錄。
8. **Cowork skill 包可能不自足。** `pack.sh` 只打包 SKILL、starter 與 references，但 SKILL 指令依賴 `new_deck.py`、`slide_lint.py`、`build_deck.py`、`chart.py`；這些沒有進該 ZIP。文件說由本機 Claude Code 驗證，但 runtime handoff contract 不完整。
9. **來源 provenance 不完整。** ZIP 沒有 Git metadata 或 upstream URL；README 提到未隨附的 `ppt-agent-skill` snapshot，因此無法只靠此包驗證衍生來源版本。

靜態 scanner 對 donor 給出 `100/100 CRITICAL / DO_NOT_INSTALL`。這是敏感模式掃描訊號，不代表每一項都是已證漏洞；上面九點才是本輪人工核對後可交付討論的 finding。

## Minimum-sufficient 下一步

先由 Web reviewer 只裁決三個問題：

1. R11-R1 現有 hash preservation gate 是否已完整覆蓋 donor 的 `--check` 價值？
2. R7 是否有實測 concurrent stale-save gap，值得新增 artifact revision/hash？
3. 現有 chart/font/export tests 是否真的缺 donor lint 規則？

沒有 measured gap 就維持 `reference`。即使決定吸收，也只開一張 bounded repair card，禁止把 donor editor/server/HTML source-of-truth 變成第二套 PPTSKILL runtime。
