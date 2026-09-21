# S9 獨立唯讀審查

結論：GO。P0/P1/P2/P3 均無已確認 finding。Spec 與 standards 兩軸均通過本次 bounded 審查；不代表 Mainline closure、merge 或 production authorization。

- Reviewed Product SHA：c5c6dac53ba340cbc7ca05db874edd080f89adc8。
- Evidence HEAD：c9cac4069ad7d9a1e3753e77038598bfe8fd1633。
- Base：f7537c4。
- Repo：/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical。
- 先讀 handoff、task、適用 bootstrap、context map、browser evidence 規則與 review skills。CodeGraph 查詢 align-selection / alignSelectionGeometry / mountComponentInteraction / executeOperation 未精準命中，才使用限定 source diff／rg。
- Evidence HEAD 相對 Product 只有 evidence/control 文件；source 決策涵蓋三個 runtime、S9 tests、直接變更的既有 tests／harness，不重新審 S3–S8 全部實作。

## Fresh 結果

| 組別 | 結果 | 原始輸出 |
|---|---:|---|
| S9 targeted | 10/10 PASS | /tmp/s9-independent-targeted.log |
| focused S3/S4/S5/S7/S8/S9 + export cleanup | 185/185 PASS | /tmp/s9-independent-focused.log |
| full non-browser | 390/390 PASS | /tmp/s9-independent-nonbrowser.log |
| 獨立 mounted probes，契約 oracle | 9/9 PASS | /tmp/s9-independent-probes.log |

計數有重疊，不相加為 unique cases。Full 排除 pgq-wp4-s3-content-integrity、pgq-wp4-s3-sample-approval、pgq-wp4-s4-full-deck-qa、pgq-wp4-s4-required-visibility 四支。

Probe 可重現：在 repo cwd 執行 `node --test /tmp/s9-independent-probes.mjs`。使用現有 mounted DOM/vendor doubles，僅於記憶體加入 revision 唯讀 getter；不等同 browser。覆蓋六種 alignment、奇偶尺寸 round、單次 revision、固定點 no-op、非 geometry/other slide 保留、late missing geometry 原子拒絕、selection 保留、export/reopen、multi-selection Arrow／Escape 與 toolbar key ownership。

### 首次 probe 失敗保留與裁決

/tmp/s9-independent-probes-initial.mjs 與 /tmp/s9-independent-probes-initial.log：7 PASS / 2 FAIL。該 oracle 額外假定所有置中操作第二次必為 no-op，超出 task 的「若形成 canonical no-op 才不增 revision」契約。

runtime/component-geometry.js:56、59：A=(800,280,640,480)、B=(81,81,241,161)，center-x 第一次 x=(441,640)，第二次 x=(441,641)；center-y 第一次 y=(181,340)，第二次 y=(181,341)。新 bbox center 隨最大 box round 後變動，第二次合法差 1px；第三次固定點為 no-op。符合明文 bbox／deterministic integer round 公式，因此不列產品 finding，也沒有修產品。最終 probe 按每次操作前 bbox 獨立計算 oracle，並檢查固定點 revision 不增。若未來要求第一次後立即冪等，需先明確修改 rounding 契約。

## Evidence-only

未啟瀏覽器，未 fresh 重跑 browser／PGQ。

- acceptance.json：1280×720、1600×900 各 13 checks；每個 viewport 為 10 base + 3 S9。Console/page/network/HTTP/remote 全 0、targetClosed=true。
- Browser source SHA 與 20 個有 SHA 的 artifacts 全吻合；無 SHA 的 s9-source 亦存在。真 pointer alignment 僅 left、center-x，不宣稱六種全部 browser-tested。
- PGQ raw logs：首輪 8 named PASS、retry 8 named PASS，合計 unique 16。首輪仍為 supervisor exit 2，launcher.stderr 保留 `NO_GO: resource observation unknown (scan limit)`，pgq reporter 8 pass / 2 fail。不能寫成單輪16/16，也不聲稱 scan-limit 根因已修。
- Retry controller：pgqExit=0、browserCloseExit=0、supervisorExit=0、cleanup true。首輪沒有成功 Browser.close 的證據。
- 兩輪 controller 記錄 root/marker absent；本次只另行 fresh 核對兩個 exact owned roots 均不存在。

## Integrity 與唯讀邊界

- 11/11 sources：工作樹 SHA-256 與 manifest、固定 Product blob 全相符；收尾再次核對。
- protected 4/4 與 manifest 及 S8 baseline 相符，收尾未變。
- ZIP：2,281,550 bytes；SHA-256 b4ba66f24d6780d6899f6bc1c48f5d2f32cf03fb3878091d28636c2ec3e0db57。
- ZIP 內 component-geometry.js、component-interaction.js、deck-editor.js 三個 runtime bytes 與 manifest sources 相符。
- git diff --check f7537c4 c5c6dac PASS；git diff --quiet PASS。
- 結束 HEAD 仍為指定 evidence HEAD；status 僅原有四個 protected untracked。
- 未修改 repo 檔案、refs、ZIP；未 commit/merge/push；審查新增輸出只在 /tmp。
