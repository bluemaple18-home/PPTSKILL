# AI-CORE-TMP-RECOVERY-20260920 回收 receipt

狀態：RECOVERY PASS / COMMIT BLOCKED。未產生新 commit；HEAD仍 `af3397b8`，本卡三檔已 staged。

## 範圍與根因

ai-core branch `main`，base `af3397b8`。原 helper 的程序內 OWNED_ROOTS 不跨程序延續；manifest 自己不得授權接管，且舊 cleanup 的存證失敗順序不適合 recovery。本次只新增明示 Owner 授權的 exact-root recovery，不放寬 run ownership、不寫入 OWNED_ROOTS、不改資源政策、不 kill 程序。
本卡 commit 只含 `scripts/tmp_artifact_lifecycle.py`（+262）、`tests/test_tmp_recovery.py`（+279）、`docs/tmp-session-lifecycle.md`（+19）；舊 observer 與 logs dirty 不包含。

## 測試／review

- Worker RED：synthetic 舊 helper 結束、新程序正常 cleanup 拒絕接管；recover 入口缺失。
- Mainline 原 lifecycle/session 63 PASS；Worker 整合92 PASS /60.273s /exit0。
- 兩份 blind review 均 Spec/Standards APPROVE：各自29新測試 PASS，另獨立 CLI、底層copy/fsync/unlink、identity/symlink、實際root替換、末端receipt/unlock fault injection PASS。詳見 review-a.md／review-b.md；兩份 probe 已存同目錄。
- git diff --check PASS；凍結後至正式回收 source/tests/docs SHA256 未變。

## 真實回收（以下皆 local-only，不可跨機照抄）

唯一 root：`/private/tmp/aic-b-0fe6c1feeb8c41f58361299a7e64ef1d`。
repo：`/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical`。
marker：`/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/.git/.ai-core-tmp-artifact-isolation.json`。

經平台核准執行兩次命令（cwd ai-core；無其他root）：

```bash
.venv/bin/python scripts/tmp_artifact_lifecycle.py recover \
  --repo-root '/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical' \
  --root /private/tmp/aic-b-0fe6c1feeb8c41f58361299a7e64ef1d \
  --owner-authorization-ref Owner-chat-20260920-AI-CORE-TMP-RECOVERY \
  --evidence-dir '/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/evidence/edx-wp1-s3-motion/ai-core-recovery-dry-run-20260920' --dry-run

.venv/bin/python scripts/tmp_artifact_lifecycle.py recover \
  --repo-root '/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical' \
  --root /private/tmp/aic-b-0fe6c1feeb8c41f58361299a7e64ef1d \
  --owner-authorization-ref Owner-chat-20260920-AI-CORE-TMP-RECOVERY \
  --evidence-dir '/Users/matt/Documents/ChatGPT/skill 工廠/PPTSKILL-canonical/evidence/edx-wp1-s3-motion/ai-core-recovery-execute-20260920' --execute
```

- dry-run exit0/status dry-run，root inode116067474；full ps599程序，歷史PID74559/PPID/PGID/root命令列matches0；root/marker未刪。
- execute exit0/status recovered；鎖內兩次 fresh full ps 各601程序，matches0，ns1789896313958005000與1789896314055505000；metadata/root inode再核對一致。
- 原始 lifecycle 三檔、preflight/before-delete先 fsync，才刪exact root；root確認消失、root-deleted存證成功、matching marker再核對後清marker。
- 後置獨立查核 exit0：`root_present=false`、`marker_present=false`、`repo_lock_and_capacity_gate=pass`、`isolation_admission=pass`、`lock_released=true`。
- 不可逆結果：該臨時profile/root已刪，不能還原；必要原始lifecycle證據已保存，不匯出Cookies/profile。

證據絕對路徑：上述兩個 `--evidence-dir` 各含result.json，execute另含preflight.json/before-delete.json/root-deleted.json與lifecycle-evidence/三檔。本卡也保存dry-run-result.json／execute-result.json副本。
三檔SHA256：session=`b95131e32d912770ac983b19bf18d4feebde4d48d81c2dc633d4a6fb31c15a4c`；stdout=`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`；stderr=`63846cb4b04b6387ea963870e62b0f7c22274301bc4f7486227da8ce8c0d101c`。

## 交接與限制

- commit 阻擋：正常 `git commit -m 'fix: 新增明示授權的跨程序暫存回收入口'` 被既有 hook 的 `tests.test_devflow_entry.DevflowEntryRoutingTest.test_same_route_rerun_preserves_progressed_and_terminal_workspace` 擋下，hook exit1；devflow suite23項/71.096s/1 error。單測另跑1項/2.815s同樣錯誤，未無限重試、未跳過hook。
- 定位：未修改的 `tests/test_devflow_entry.py:750` 在只記錄 implementation entered 後 finalize done；未修改的 `scripts/run_manifest.py:174` 明確拒絕未completed stages。此 fixture 與既有完成契約不符，不是recovery測試失敗。修正它需增加本卡之外測試檔，等Owner指示；本卡recovery code仍完整保存並已staged，不能宣稱有commit SHA。

- 阻擋：本次unknown隔離已合法解除，可由PPTSKILL原task重新啟動受管browser；已核對鎖/容量/隔離准入，未代跑motion/PGQ或宣稱產品驗收通過。
- 原scan-limit原因不屬此卡，未放寬政策；新驗收仍可能遇到原資源停損，須依新證據處理，不能以此receipt保證後續跑完。
- ps是合作式lifecycle觀測，不保證hostile/脫群隱藏root程序；本次沒有已知該類程序證據。Reviewer未模擬斷電/SIGKILL。
- PPTSKILL HEAD仍7e43b46，tracked clean，delivery code/ZIP未改，原四個untracked hash與preflight一致。只新增兩個本卡recovery evidence目錄，並清對應Git isolation marker；未影響使用者或其他task profile，未merge/push/deploy。
- code可revert本卡commit（必須保留既有dirty）；不可用code rollback還原已刪profile。
- 下一步：PPTSKILL Mainline留原task，依原卡重驗motion→补PGQ→正常關browser並驗owned-root清理，再裁決產品review。
