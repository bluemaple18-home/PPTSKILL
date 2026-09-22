# WP2-S11 接續 checkpoint（不是 Independent Review handoff）

Status: BROWSER_ACCEPTANCE_BLOCKED / STOP_LOCAL_CONTINUATION
Branch: codex/edx-wp2-s11-image-drop
Runtime product: 1fdb3c275f9e174b7c8d506207c42c758aedb71a
Code checkpoint: 6c9c02fc764ba36ac60ac026e0a6ea1953b526b5

先讀tasks/edx-wp2-s11-image-drop.md、evidence/edx-wp2-s11/mainline-checkpoint.md、mainline-gesture-fixture-repair.md及checkpoint-verification.json。Source4/protected4/ZIP沿source-hashes.json；646 full、192 scoped、S11 29、ZIP lifecycle已PASS，不重跑無關tests。runtime/tests/ZIP後續未改。

三輪正式host全部1280在gesture+file drop seam停止；初輪缺geometry，retry1補後有active gesture但CDP drop未投遞、rAF evaluate逾時；retry2前移mouseReleased也失敗，無optimizer呼叫。已有正常/同檔/無圖頁/跨頁/offline五種positive trusted drop，但不能稱整輪PASS。1600與PGQ都未跑，三輪cleanup已PASS，FAIL全部保存。

目前不是review candidate。承接只做CDP混合input／rAF的唯讀隔離與觀測設計；不要直接第4次browser launch、重跑整套或把正向換成API/synthetic。先Mainline重判及鎖定可證偽新路線，維持原驗收契約。若需要改契約，明示原要求與新證據分界，不能用單次prefix PASS取代完整gate。禁止修改AI Core／runtime／ZIP／protected，禁止merge/push/deploy或開S12。
