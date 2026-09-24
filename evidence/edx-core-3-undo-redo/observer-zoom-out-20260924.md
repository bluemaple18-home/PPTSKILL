# AI Core observer：唯讀 zoom-out 與交回範圍

Status：`RESEARCH_ONLY / HOST_OBSERVER_BLOCKED`。主線委派原 agent Euclid 唯讀分析，主線核對關鍵 source／contract。沒有修改AI Core、執行其測試或啟動browser；此文件不是修復receipt。

AI Core HEAD `c23e46555b73a29f16319c657622acb1acc51e7a`；scripts/tmp_artifact_lifecycle.py SHA256 `427162d34af5be6f3269c418f141716130909ce3fea82b5e3b4431732ebfdd6c`，仍與Host04相同。

## 模組與blocking edge

受管程序資源取樣 → sample_resource_budget（1141）→ scan_resource_artifacts（1056）／visit（1089）→ descriptor內 entry.stat(follow_symlinks=False)。cleanup的count_artifacts（637）也使用同一scanner。OSError在外層（1127）轉I/O failure；docs/tmp-session-lifecycle.md:42要求無法完整觀測fail-closed。

Host04只證明 profile/Default 指定entry在列舉後stat回ENOENT，不能證明原類型、root/目錄identity或同名替換未發生。檔名像Chrome暫存檔不是安全略過的證據。直接catch-all ENOENT、重試整棵樹、放寬special-file allowlist或增加budget均不成立。

## AI Core owner最小待驗工作

三個假說：① regular暫存entry自行消失；②同名替換成symlink/非允許類型；③上層目錄或identity變動。現有receipt不能區分。

沿 tests/test_tmp_artifact_lifecycle.py 既有掃描/browser例外（30）、I/O unknown（155）、跨次取樣（234）接點，先建立同descriptor列舉與stat間消失、同名替換、root/子目錄消失或I/O失敗的狹窄fixture。任何可接受的消失語意須先符合取樣與cleanup契約；entry/deadline/bytes/files上限、no-follow與identity、未知I/O fail-closed保留。不可把猜測的regular类型当作已知。

測試命令（在AI Core repo）：`.venv/bin/python -m unittest discover -s tests -p 'test_tmp_artifact_lifecycle.py'`。本輪未執行。真host還須保存scanner SHA、root/目錄identity、entry no-follow再觀測、首錯、supervisor／stop／cleanup。fixture通過不等於host修復通過。

原交接卡：AI Core repo的 `.work/CARD-PPTSKILL-PGQ-HOST-ROUTING-AND-OBSERVER-HANDOFF-20260924/brief.md`。PPTSKILL reporting接點已修，見 `pgq-routing-reporting-20260924.md`；不再把missing report誤報為JSON損壞。

## 接回條件

AI Core交適用fixed SHA＋fixture結果＋受管host處置receipt後，主線核對與固定PPTSKILL candidate再安排browser／四支串行PGQ。現在不重跑PGQ、不從舊SHA移植GREEN、不沿用Host04 cleanup成功當修復證據。此分工不轉移PPTSKILL Mainline，亦不授權PPTSKILL fork scanner。
