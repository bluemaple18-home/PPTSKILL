# Crop/Evidence 最終 whole-card targeted evidence addendum

固定 product **2db6185d13a6713700d0186758b1261ff23b9d85**。

**最終 whole-card verdict：GO with residual。** 本輪只核對剩餘正式 evidence／reconciliation，沒有新產品 repair，沒有重新做全專案 review。F2 保留 **OPEN／P2 residual**；P0=0、P1=0、P2=1、P3=0。F1/F3/F4/F5 CLOSED。

## 規範來源更正，保留舊紀錄

前份 `final-code-verdict.md` 的「Owner 本輪明確指示」不精確，應更正為：**Mainline 轉述並依據 Owner 常設 AGENTS ＋現行 model-role-routing 規範**；Reviewer 已實讀 `model-role-routing/SKILL.md:81–82` 中「只有 P0/P1 可 NO_GO；P2/P3 記為 residual risk／backlog」及 Repair ceiling1／第二代須 Owner 成本核准。

**本輪没有新增 Owner Repair2 成本核准**，本Reviewer也未啟動／要求 Repair2。這個更正只修正規範來源歸屬，不刪除原始CHANGES_REQUESTED、初始5個P2、Repair1紀錄、先前code-targeted判斷或F2重現；舊檔完整保留，本addendum是最新裁決。

## Host04：原始 NOT_PASS 完整保留

- 修後Crop acceptance：1280×720、1600×900各45 records／24 pixel cases；有效pixel checks分別1235／1240；errors=0、targetClosed=true。Reviewer再次唯讀重算80 artifacts bytes／SHA256，全部相符；source.html SHA及其完整editor runtime与固定product相符。
- PGQ在本輪 **15/16**，唯一失敗名稱是「每張 canonical slide 的 required title 必須有 painted visibility」。
- resource-observation實體記錄 scan608、`visit:1097` 的 `entry.stat(follow_symlinks=False)` 遇 ENOENT，`profile/.com.google.Chrome.Local State.CGAlLV` 消失；supervisorExit=2、browserCloseExit=3。
- 因此host04仍是 **NOT_PASS**，不是lifecycle PASS，也不是單輪16/16。ownedroot／marker已absent不會洗掉失敗。此新diagnostic僅適用本次明示事件，不推論到歷史S18/S8未知I/O。

## Host05：原始摘要有缺陷，離線 reconciliation 成立

唯讀走讀 `host-controller-05.py`：實際執行的是 `pgqFailed` 和 `dialogVisual`，各將結果寫入 `pgqFailedExit`／`dialogVisualExit`。但末尾判定仍讀舊 `cropBrowserExit`／`pgqExit`；缺欄位令舊predicate為false，進入NOT_PASS及`SystemExit(1)`。

**原始 controller-receipt.status=NOT_PASS／controller exit1 保留**，沒有修寫repo原檔。以下是新證據層的reconciliation，不把raw status覆蓋成PASS：

| 實際步驟／收尾 | host05實體證據 |
|---|---|
| readinessExit | 0 |
| pgqFailedExit | 0；sole named case 1/1 PASS |
| dialogVisualExit | 0；Evidence雙viewport PASS |
| browserCloseExit | 0 |
| supervisorExit | 0 |
| scanner | 136 scans、0 errors；before/after/current scanner hash相同 |
| owned root與isolation marker | receipt為absent；Reviewer再查實體皆不存在 |
| product／protected／ZIP | before/after與目前實體MATCH |
| AI Core | receipt與目前HEAD均81c80ffa349c58b0bb5006f7430ca1624b337774；未修改 |

沒有只相信 `host05-offline-verification.json` 的PASS。Reviewer讀過其script但**沒有執行會寫repo JSON的原script**；另在本tmp寫獨立 verifier，fresh執行 **34組文字fixtures**：

- 接受實際host05欄位；重現舊predicate false-negative。
- 逐一拒絕5個exit缺失／非零／布林false，拒絕cleanup/diagnostic缺失、任一error欄位、任一phase source/protected缺漏及ZIP mismatch。
- 最後明確拒絕host04，證明reconciliation不會把真失敗洗成PASS。
- 提供的offline-verification中34fixture名稱數、controller SHA、raw receipt SHA也與實體一致。

獨立 verifier的PASS支持host05**實際必要步驟與收尾證据可接受**，不表示raw controller自行給PASS。這是一個已具體定位、保留原紀錄、由離線核對調和的evidence摘要缺陷；沒有新的未解產品P0/P1或阻塞evidence缺口。

## PGQ覆蓋：16 unique＝host04的15＋host05的1

Reviewer從controller列明的四個PGQ測試檔讀出16個唯一case名稱，並確認這四個實體檔與固定commit內容一致；對照兩份log：

- host04成功名稱15個。
- host05成功名稱恰1個，與host04唯一失敗名稱完全相同。
- 成功名稱兩組不重疊，聯集完全等於原16個case，沒有缺項或其他case偷換。

**結論僅為16 unique已覆蓋（15＋1），不是任何單輪16/16，也不把host05擴大為完整PGQ重跑。** 全部名稱保存在 `final-evidence-verification.json`。

## Evidence dialog視覺補充

Reviewer親自檢視host05四張原始PNG並重算bytes／SHA256及PNG dimensions：1280×720與1600×900各top/actions兩張。這些為Evidence分類，清楚可見用途選擇、完整原圖及紅色保護overlay、裁切範圍、額外重要內容保護範圍、人工確認與操作按鈕。

- 1280：dialog有垂直捲動；actions截圖顯示操作按鈕可到達，無水平溢出。
- 1600：內容完整容納，top/actions圖片相同符合不需捲動的實際畫面，不算遺失artifact。
- receipt雙viewport均open=true、focusInside=true、confirmDisabled=true、controls=21、horizontalOverflow=false、errors=[]、targetClosed=true。probe source確認取用已核對的host04修後source.html，並切換Evidence分類。

這完成先前欠缺的Evidence欄位視覺證據；不是新增Reviewer browser執行。

## Residual與fresh界線

**F2 OPEN／P2**：`runtime/image-crop.js:117`（關聯`:115–116`、`:124`、`runtime/deck-editor.js:529`）。舊disconnect/remove-load先完成副作用再one-shot throw，rollback可能依stale observing/listening flags跳過ownership重建。主要node/spec/revision/CSS回復，但observer或load listener遺失。原Reviewer probes **9/11 PASS，2個故障注入FAIL**完整保留；兩個FAIL同屬F2。沒有普通browser自然觸發證據，不宣稱F2全CLOSED。依常設severity規範納入既有FinalClosure residual，不新增主卡。

- 先前同一固定SHA的Reviewer fresh focused **27/27**、scoped **339/339**保留；本輪沒有重跑產品suite，focused是scoped子集，不重複累加。
- 本輪fresh工作：獨立34fixtures、實體logs/receipts/源碼／hash核對、PGQ名稱聯集、PNG檔及截圖檢視、roots/marker/scanner/current commit查證。
- host04／05 browser與PGQ結果屬 **既有正式host evidence經Reviewer唯讀核對**；不是Reviewer fresh browser。
- 20 source＋4 protected hashes一致；ZIP **2,316,286 bytes**，SHA256 **82eb4f571ba4283572bafa404dda6888d90dae292ccb06ac536eafe3fcba3880**。沒有新browser/full/ZIP/install、repo/git mutation或AI Core修改。
- host01/02歷史NOT_PASS、host04 NOT_PASS、host05 raw NOT_PASS／exit1均保留；host03未作為修後證據。

## 可重現檔案

- `final-evidence-verify.py`：獨立唯讀核對，只寫本tmp；cwd為repo。
- `final-evidence-verification.json`：34fixtures、16名稱、原始status／exit、全部核對及evidence hashes。
- `final-host04-recheck.log`／`host04-evidence-check.json`：修後Crop artifacts復核。
- `repair-probes.mjs`／`repair-probe-results.json`：F2 residual兩項原始修後FAIL。
- `code-targeted-verdict.md`、`final-code-verdict.md`及初始review：歷史完整保留，由本addendum補足最終evidence與規範來源更正。

最終可採 **whole-card GO with residual**；不附帶任何新的修復、部署、外部write或Owner成本核准。
