# S18 Repair 1 targeted re-review

日期：2026-09-24。原 Reviewer，只審 F1/F2/F3 與此次診斷 repair regression；未新增 Reviewer，未擴掃產品，未讀其他新 review verdict。已讀指定 handoff、repair.md 與 repair-input-hashes.json。

**DIAGNOSTIC_PLAN_REVIEW：GO（限此次 bounded Repair 1 的程式／診斷方案）。F1、F2、F3 均 CLOSED。未發現新的 P0–P3 actionable finding。**

**CODE_REVIEW：PARTIAL，維持原產品抽查範圍。** 本結論不代表 host acceptance PASS；正式主機驗收與整體產品/Mainline verdict 由主線負責，不需新增 review 或等待另一份 verdict。

## 固定輸入

repo：`/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical`。

- candidate：`84ea9381cb438491449b6d871fbaeedea5e55b98`
- HEAD：`c025f9147018deefefa8685c6b18fec7210b316c`
- repair controller SHA-256：`d339a78ad099a0d09f061686673cbb7f9da007e5564e6854835396df86886365`
- repair observer SHA-256：`2b8749de7ea497d3158752b44fb244510fa18588c1d760dcee2e8489db4c6902`
- diagnostic-repair-probe.py SHA-256：`d075b737ba02aa71013443685cf072442d4b71d04179f4ff4550bbd07b993996`

共22項 hash 檢查 MATCH：repair3、AI Core唯讀4、產品source8、protected4、before-repair副本2、ZIP1。兩份 before-repair 副本與原 review-input-hashes 一致；ZIP 大小及 digest 維持原契約。CodeGraph 本次 query 未命中診斷 symbols，故以指定實體檔案／修復 diff 做 bounded read。

[輸入核對](/private/tmp/pptskill-s18-targeted-probes-20260924/inputs.json)；[收尾核對](/private/tmp/pptskill-s18-targeted-probes-20260924/final-integrity.json)：22項全未變、Git status 與起始一致、host-acceptance-02 不存在。Python optimize=0，測試與既定 launcher 均未使用 `-O`。

## Findings 關閉判定

| 原 finding | 判定 | 修復與 fresh 證據 |
| --- | --- | --- |
| F1 / P1，log open 失敗跳過 supervisor 收尾 | **CLOSED**，高信心 | `host-controller-diagnostic.py:18–37` 將 log/CDP 包在 try，finally 必嘗試 supervisor.wait(25)。逾時仍 terminate，再 wait(30)；無放寬期限。Fresh 測 log open、模擬 output/CDP失敗、close非零、第一次wait逾時、terminate失敗；獨立補測 log context close失敗、CDP逾時、第二次wait逾時及無endpoint。所有已有 supervisor 案例均至少進第一次wait；無法收斂／terminate失敗記 cleanupError，不能PASS。 |
| F2 / P2，observer finally 覆蓋原退出 | **CLOSED**，高信心 | `resource-observer.py:66–87` 先恢復 trace，再保留 original_error。open/write/final-hash失敗時，原2/143維持，原0改74；stderr失敗不再蓋掉原 outcome。Fresh重播12個矩陣案例；獨立再測正常return、SystemExit(None)、RuntimeError、KeyboardInterrupt，含診斷與stderr同時失敗，確認成功→74、非成功保留同一例外物件。 |
| F3 / P2，跨scan id(error)漏記 | **CLOSED**，高信心 | `resource-observer.py:25–27,42–43` 在每次scan開始與返回清空seen。Fresh12次不同錯誤完整捕捉12次，原NO_GO字串不變。獨立真scanner測兩次深一層scandir失敗，錯誤經遞迴visit傳播，每次僅記一次，共2個事件、filename與relativeDirectory正確，scan結束seen為空。 |

F1 的「必到 wait」指可取得 supervisor 物件時會執行收尾嘗試，不宣稱 wait、terminate 或程序群組一定成功。修復沒有把 cleanupError 轉成成功。

## Controller 強制診斷驗證及 regression

`host-controller-diagnostic.py:40–49` 驗 scanner路徑、前後hash與目前scanner一致、正整數scan count（bool不接受）、line/opcode trace=False，以及NO_IO_ERROR_OBSERVED且errors=[]。`:109–115` 將 diagnosticVerified 納入最終PASS，並排除各 error欄；supervisorExit=0不再足夠。

Fresh重播確認正常record接受，missing／invalid JSON／0 scan／hash錯／I/O error均拒絕。独立再驗錯scanner、bool scan、trace=True、before hash錯、status正常但errors非空均拒絕。另直接擷取實體controller的status運算式做隔離測試：診斷缺失、diagnosticVerified=False、diagnosticError、cleanupError、browserCloseError、integrityError、cleanupVerificationError均NOT_PASS；完整良好receipt才PASS。

controller的cleanup核對／after hash失敗會分別記錄；receipt寫入失敗會將status改NOT_PASS。既有12秒readiness與25/30秒supervisor收尾期限保留。未發現此次diff移除原容量、runtime monitor或ownership限制。

## 本輪實際執行

1. **原 repair probe fresh重播：26/26 PASS**。使用已核hash的實體 `diagnostic-repair-probe.py`，TMPDIR指定本輪自有tmp目錄；Python `-B`。該probe只抽取controller兩個函式定義，runpy入口及subprocess.run均mock，未執行controller top-level或tmp_session真入口。
2. **Reviewer獨立補測：26/26 PASS**。只執行修復函式、observer.main（runpy stub）、scanner與controller status expression；不建立browser／managed child，不送signal。
3. 修復前後靜態diff及22項輸入／收尾hash核對。未重跑產品71/449/945、未跑全套tests。

兩組各26項是不同probe的case計數；F3的12次錯誤在原probe計為一個case，不能解讀為52種互不重疊的host場景。

證據：

- [fresh repair probe結果](/private/tmp/pptskill-s18-targeted-probes-20260924/fresh-repair-probe.json)
- [獨立probe原始碼](/private/tmp/pptskill-s18-targeted-probes-20260924/independent-probe.py)
- [獨立probe結果](/private/tmp/pptskill-s18-targeted-probes-20260924/independent-results.json)
- [獨立probe log](/private/tmp/pptskill-s18-targeted-probes-20260924/independent-probe.log)

## 邊界與停止

本輪未驗真browser readiness、process-group收斂、Browser.close、PGQ單輪16、主機profile成本或正式cleanup；此限制不妨礙關閉已由synthetic重現且修復的F1/F2/F3，也不把診斷方案GO升格為主機驗收GO。先前第一輪FAIL與未知底層errno/path仍保留，原觀測開銷限制不變。

只寫本報告與 `/private/tmp/pptskill-s18-targeted-probes-20260924/` 自有測試logs／fixtures；臨時recursive fixture已移除。repo/evidence、產品、ZIP、protected4與AI Core均未修改；無新派工、commit/push/merge，無browser或tmp_session真入口。

**STOP：targeted re-review完成，F1/F2/F3已關閉，交回主線。**
