# Core6 Final Closure：Mainline 結案收據（2026-10-01）

**Decision：CORE6_CLOSED_LOCAL / FUNCTIONAL_PASS / VISUAL_PASS / INDEPENDENT_CODE_HOST_ZIP_GO / CORE_PROGRESS_6_OF_6 / UNPUSHED。**

## 裁決依據

- 獨立複審回報 FINAL CODE GO、完整回歸 GO、FINAL HOST／VISUAL GO、FINAL ZIP／EVIDENCE GO，未發現阻塞。複審未修改檔案、commit、push、merge 或 deploy。Mainline 依此裁決並再次唯讀重算候選身分與原始測試收據；候選全貌、失敗輪次及檔案索引見 `mainline-candidate-20261001.md`。
- `identity-before-04.json` 與 `identity-after-04.json` 的 **98 項 SHA-256 完全相同**；Mainline 結案時現行 98 項仍與鎖定值相同。`host-acceptance-04/artifact-manifest.json` 的 **14 份大小與 SHA-256 全吻合**。ZIP 內 `deck-spec.js`、`deck-editor.js` 與工作樹逐 byte 相同。
- Fresh 獨立重跑 74 個非 PGQ 測試檔 **1034/1034 PASS，0 fail／skip**；三份變更 JS syntax 與 `git diff --check` PASS。正式 host 第 04 輪雙 viewport 的 runtime、content integrity、required visibility、raster visibility、geometry、motion 均 PASS；issues、console、pageerror、network、HTTP 均為 0。匯出 HTML 重開的 10 頁 canonical 相同，四支 PGQ **16/16 PASS**。實圖與 montage 未見新的遮擋、裁切或溢出；Browser.close PASS，受管 root 已清除。
- 產品修復限於既有 `title-points` 缺省：migration、schema sanitizer、portable editor 三處一致；沒有新增 renderer primitive 或第二套資料正本。ZIP SHA-256 為 `84b2ae64291aca43d5bab2ff6fb1276d88767949aa081df260aab0c945683bdb`；ZIP lifecycle／package smoke PASS。本機缺 Gemini CLI，使 host capability PARTIAL，並不否定前述 ZIP 驗證。

## 未關閉事項與邊界

- **Crop teardown 故障注入 F2／P2：OPEN residual。** Observer／load ownership 在 teardown 已生效後拋錯的情境仍可能失真。本輪正常 host PASS 不代表該故障注入已修復。
- **Core3 receipt EIO scalar 精度 P2：OPEN residual。** 原始 child exit 仍保留且整輪 NOT_PASS，不構成假 PASS；本輪沒有修改 AI Core。
- 本裁決只完成六張核心功能的**本機產品驗收**。不宣稱 hostile/compliance 保證、Gemini CLI host 驗收、上述兩項 P2 關閉，亦不構成 push、merge、deploy 或 production 授權。原有 `tasks/edx-core-six-card-closure-plan.md` 修改及四個 protected untracked 均排除在 Core6 commit 外。
