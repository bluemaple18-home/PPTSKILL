# AI-CORE-TMP-RECOVERY — S3-MOTION 受管瀏覽器回收修補卡

Status: RECOVERY PASS — ai-core已執行合法回收；上游commit仍BLOCKED（依Owner回傳receipt），本task未修改ai-core。
Task ID: AI-CORE-TMP-RECOVERY-20260920
類型：既有lifecycle控制面bounded repair；ai-core依自身規則判定派工／review。
工作repo：`/Users/matt/ai-core`；消費端：PPTSKILL S3-MOTION。
責任：ai-core負責此環境修補與回收證據；PPTSKILL Mainline責任留在原task，非轉交整個專案。
目標：恢復S3-MOTION既有驗收，非新增產品功能或第二套lifecycle。

## 已確認根因／範圍

`/Users/matt/ai-core/scripts/tmp_artifact_lifecycle.py` 的 `read_owned_root` 只接受本程序 `OWNED_ROOTS`；manifest不能單獨授權接管。CLI目前只有run，沒有recover。原supervisor因resource scan limit及process-group observation incomplete退出後，保留unknown marker及owned root，因此重啟驗收前需要正式recovery入口。不得篡改OWNED_ROOTS或直接刪marker繞過。

只處理repo `/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical` 的本輪root `/private/tmp/aic-b-0fe6c1feeb8c41f58361299a7e64ef1d`。歷史session PID/PGID 74559僅作定位，必須fresh核對PID重用與所有相關程序；不能用舊0 matches當永久授權。

## 接手與重現

先讀工作repo的AGENTS、task指定規則及 `docs/tmp-session-lifecycle.md`；CodeGraph後按需限域查 `scripts/tmp_artifact_lifecycle.py`、`scripts/tmp_session.py` 與既有測試。不要重跑PPTSKILL測試來確認已知環境阻擋。

PPTSKILL implementation checkpoint：`1b2d4f3`；本卡前一版proposal：`274c556`；branch `codex/edx-wp1-s3-motion`。以下路徑相對PPTSKILL repo：
- `evidence/edx-wp1-s3-motion/browser-environment-interruption.json`
- `evidence/edx-wp1-s3-motion/browser-environment-failure/session.json`、`stderr.log`
- `evidence/edx-wp1-s3-motion/mainline-receipt.md`
- `evidence/edx-wp1-s3-motion/mainline-pgq.log`
- `.git/.ai-core-tmp-artifact-isolation.json`（唯讀核對目前狀態，禁止先清除）

原觸發：受管Chrome supervisor回 `resource observation unknown (scan limit)`，隨後 `owned process-group observation is incomplete`，exit 2。回收嘗試在repo lock內先fresh ps核對原PID／PGID與root matches為0，再呼叫既有helper；`read_owned_root`拒絕 `tmp root is not owned by this helper process`，沒有刪root或marker。

先以synthetic跨程序fixture重現「原helper退出、保留unknown、新程序無法回收」；不得用真profile反覆試刪，亦不得把manifest或marker中的nonce寫入OWNED_ROOTS冒充原程序。原scan-limit原因未進一步分解；此卡不順手放寬它。

## 建議修補

在既有tmp_artifact_lifecycle提供明示Owner授權的bounded recovery入口，沿既有repo exclusive lock與evidence路徑，不放寬正常run ownership、resource scan或容量閘門。

- 先dry-run輸出expected repo/root、隔離狀態、manifest/session一致性、可證實的程序存活狀態與證據保存位置；不刪檔。
- recovery必須接受明確指定root及Owner授權參照；manifest、nonce或PID本身不視為授權。鎖內核對相同root/repo/unknown marker；foreign root、symlink、worktree或identity不符fail closed。
- fresh process observation不完整／存在存活或無法確認的owned process時不回收、不清marker；不得以kill-all代替觀測。
- 保存本輪evidence後才回收exact root；只有root確認消失才清對應marker。失敗保留隔離，維持可重查證據。
- 不改掃描預算、TTL、容量政策，不影響其他browser/profile，不安裝工具。若需擴大以上範圍回Mainline裁決。

## 驗收／回退

先以synthetic fixture覆蓋正常回收、活程序／PID重用／觀測失敗、foreign/symlink/identity mismatch、evidence保存失敗、刪除失敗與marker更新失敗；確認原run fail-closed測試仍通過。控制面變更依ai-core規則獨立驗證後，才對此唯一root執行dry-run與授權回收。code可revert；實際暫存profile回收不可還原，故先保存必要evidence，禁止觸及使用者profile。

## 回傳契約／停止條件

請回傳一份可貼回原PPTSKILL task的receipt：
1. ai-core branch、base／commit SHA、實際改檔與根因；若已有合法既有入口可用，優先採用並說明，不為卡片措辭強行新增API。
2. 實跑測試／review結果、dry-run與實際回收指令、exit code、evidence絕對路徑。
3. fresh程序觀測依據、exact root是否已消失、對應unknown marker是否已合法清除；不可只寫「已恢復」。
4. 是否可重新啟動同repo受管browser；若仍NO_GO，明列未能證明的ownership／process條件與所需資訊，保留隔離。無法證明舊root可安全回收時，不准為了完成卡片強刪。
5. 確認未修改PPTSKILL delivery code／ZIP／四個untracked，未影響使用者或其他task的profile；未merge/push/deploy。

code／config回退與實際暫存刪除須分開描述；需執行不可逆的exact-root回收時，由ai-core依Owner在接手對話的明示指令及自身規則確認授權。此卡本身不是越權憑證。不得另建registry／daemon／通用管理平台。

## PPTSKILL後續

recovery完成後，Mainline單独重驗motion，補未完成PGQ，正常關browser確認profile清除，再裁決review candidate。保留251 nonbrowser PASS與已提交ZIP證據，S3 motion P2在完整驗收前仍未關閉。不merge/push/deploy。

## 回傳核對

Owner回傳receipt後，Mainline確認exact root／unknown marker消失、PPTSKILL producer 7/7 SHA不變，已恢復受管browser驗收。回傳副本 `evidence/edx-wp1-s3-motion/ai-core-recovery-handoff.md`；recovery dry-run／execute receipts同目錄。上游92 tests／兩份review為ai-core回傳證據，非PPTSKILL Mainline重跑；上游commit失敗不冒稱已完成。fixture修正仍由Owner在ai-core原對話決定。
