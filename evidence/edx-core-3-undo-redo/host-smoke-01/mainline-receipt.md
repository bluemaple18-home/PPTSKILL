# host-smoke-01：主線裁決

Status：**HOST_SMOKE_NOT_PASS / CANDIDATE_ADOPTION_NO_GO / CORE3_HOST_BLOCKED**。一輪執行已結束，沒有重試或PGQ。

## 已確認

正式 `exec_command(require_escalated, login=false)` 的原生環境 `CODEX_SANDBOX=null`，未刪除或改寫標記。前次只檢查預設sandbox便判無host入口的結論不充分，現由真正受管launch更正。這不是權限繞過，也不是新launcher：使用固定候選的原 `tmp_session.py browser`，其helper/policy/sensor與canonical byte-identical。

固定AI Core候選 `8e6094582547205db70f6dccce369d694f50154b`，canonical仍 `c23e46555b73a29f16319c657622acb1acc51e7a`。範圍只有本輪evidence controller/observer/test；未改scanner、產品或ZIP。離線Worker13/13與Mainline fresh13/13 PASS，詳 ../host-smoke-01-offline.log；所有source SHA見mainline-verification.json。

## 真host結果

- 原Foundation容量gate通過，before admission 77,348,792,055 bytes；64MiB／10000 files／TTL120秒不提高，readiness25秒不延長。
- Chrome readiness 6.906秒；新owned CDP target的data:text/html簡單頁DOM與target close PASS，目標page錯誤陣列空。這是host smoke，不是Core3產品驗收。Chrome stderr另有display/GPU訊息，原文保留，沒有宣稱整個browser零stderr。
- 8次runtime scan中7次完整，1次失敗；完整觀測耗時0.293～10.440ms，失敗24.177ms。這是R1本輪**帶call/exception/return instrumentation**的fresh小profile數據，沒有baseline對照，不代表長時間/PPT滿載成本；歷史6.92x/8.29x不挪用。
- Browser.close exit0，supervisor exit2。cleanup scan完整；owned root及marker已消失。主線獨立ps確認已知supervisor PID77498與browser PID77507均不存在；未清其他profile。

## 阻塞已由實測定位

第一個scanner例外在candidate `scripts/tmp_artifact_lifecycle.py:1145` 的fresh `os.stat`，entry=`.com.google.Chrome.BookmarkMergedSurfaceOrdering.6GXID2`，parent=`profile/Default`，errno2。`recovered=false`；尚未進entry.stat ENOENT recovery。另fresh Default包含23個subdirectories，不符合候選flat regular-only前提。兩個缺口均有真host證據，不再只是假設。

Controller的firstCause較粗，記為cleanup-verification（supervisor不為0）；主線沿resource-observation第一個exception與launcher.stderr確認具體首個觀測故障。沒有覆寫raw firstCause，也不把最終收尾判定誤當產品assertion。現有時間戳不足以斷言該檔消失一定由Browser.close造成，也沒有證明它是rename或unlink；歷史Host04 exact root cause仍不能由本輪反推。

本輪0次成功recovery。受管root最終已安全回收，但完整smoke不是PASS；`8e60945`在原限定契約的CODE GO不被改寫，**作為目前Chrome問題的採用方案則NO-GO**。禁止直接merge/activation或讓PPTSKILLPGQ繼續撞同一缺口。

## 主線接續裁決

STOP_LOCAL_CONTINUATION / REPLAN_REQUIRED。原candidate只處理已pin的regular檔案、flat parent、同parent rename；真host缺口發生更早且parent mixed。下一份修復方案必須先針對這兩個實測缺口重訂可驗證的完整觀測契約，不能只放寬nlink/type、略過ENOENT、提高budget或再次把同樣probe跑到綠。

本卡的一次smoke已消耗；原observer唯一R1也已用完。本輪不自動增加repair代次、不建立新產品修復線。Core3仍CODE_GO／HOST_OBSERVER_BLOCKED，核心2/6、Crop F2/P2 inherited residual保留；未merge/push/deploy、未開Core4。
