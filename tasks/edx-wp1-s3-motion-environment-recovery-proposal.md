# S3-MOTION 環境回收修補提案

Status: PROPOSED — 等待Owner明示ai-core控制面修補授權；未實作、未執行回收。
目標：恢復S3-MOTION既有驗收，非新增產品功能或第二套lifecycle。

## 已確認根因／範圍

`/Users/matt/ai-core/scripts/tmp_artifact_lifecycle.py` 的 `read_owned_root` 只接受本程序 `OWNED_ROOTS`；manifest不能單獨授權接管。CLI目前只有run，沒有recover。原supervisor因resource scan limit及process-group observation incomplete退出後，保留unknown marker及owned root，因此重啟驗收前需要正式recovery入口。不得篡改OWNED_ROOTS或直接刪marker繞過。

只處理repo `/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical` 的本輪root `/private/tmp/aic-b-0fe6c1feeb8c41f58361299a7e64ef1d`。歷史session PID/PGID 74559僅作定位，必須fresh核對PID重用與所有相關程序；不能用舊0 matches當永久授權。

## 建議修補

在既有tmp_artifact_lifecycle提供明示Owner授權的bounded recovery入口，沿既有repo exclusive lock與evidence路徑，不放寬正常run ownership、resource scan或容量閘門。

- 先dry-run輸出expected repo/root、隔離狀態、manifest/session一致性、可證實的程序存活狀態與證據保存位置；不刪檔。
- recovery必須接受明確指定root及Owner授權參照；manifest、nonce或PID本身不視為授權。鎖內核對相同root/repo/unknown marker；foreign root、symlink、worktree或identity不符fail closed。
- fresh process observation不完整／存在存活或無法確認的owned process時不回收、不清marker；不得以kill-all代替觀測。
- 保存本輪evidence後才回收exact root；只有root確認消失才清對應marker。失敗保留隔離，維持可重查證據。
- 不改掃描預算、TTL、容量政策，不影響其他browser/profile，不安裝工具。若需擴大以上範圍回Mainline裁決。

## 驗收／回退

先以synthetic fixture覆蓋正常回收、活程序／PID重用／觀測失敗、foreign/symlink/identity mismatch、evidence保存失敗、刪除失敗與marker更新失敗；確認原run fail-closed測試仍通過。控制面變更依ai-core規則獨立驗證後，才對此唯一root執行dry-run與授權回收。code可revert；實際暫存profile回收不可還原，故先保存必要evidence，禁止觸及使用者profile。

## PPTSKILL後續

recovery完成後，Mainline單独重驗motion，補未完成PGQ，正常關browser確認profile清除，再裁決review candidate。保留251 nonbrowser PASS與已提交ZIP證據，S3 motion P2在完整驗收前仍未關閉。不merge/push/deploy。
