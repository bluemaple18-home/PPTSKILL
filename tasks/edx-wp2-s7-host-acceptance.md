# WP2-S7 Host acceptance

Status: PASS / INDEPENDENT_REVIEW_PENDING
Parent: tasks/edx-wp2-s7-selected-image-fit.md
Product: `501da1b701f253d943c2879cd32e5108f583cfa1`；source6/protected4/ZIP frozen。

類型：正式browser evidence-first。只驗S7 fit UI與受影響S6 picker、既有base10，不擴crop/insert。前置：明列nonbrowser/ZIP PASS、source與protected freeze、正式AI Core host runtime；保留capacity、12秒logical-line readiness、exit27/28、managed ownership。禁止unset sandbox／裸啟Chrome／foreign cleanup。

沿tools/edx-wp1-s4-browser-acceptance.mjs <evidence>/image-fit --image-fit-regression --selected-image-regression，1280×720→1600×900。listener在navigation前，真pointer／keyboard；fit-only canonical和computed style一致、first image及dataUri/alt/geometry保留、no-op／gesture cancel／selection/mode、export/offline。新fit toolbar截圖與rect/hit/pressed證據。S6 chooser為CDP automation，synthetic blur/cancel標清。

成功：兩viewport所有checks PASS，Traceback/console/page/network/HTTP/remote為0、targetClosed。再四支affected PGQ明列串行；Browser.close、supervisor、ownedroot absent與marker absent均PASS；source/protected/hash前後MATCH。任何failure保留原evidence，停止後續步驟並triage；同類兩次無進展不再重跑。報告不得把synthetic說成OS dialog或把多輪合計說成單輪。
Evidence：evidence/edx-wp2-s7/host-acceptance，主線receipt列測試/失敗/限制；全部通過才凍結review candidate，未merge/push/deploy、不開下一Slice。

結果：初輪host-acceptance Enter harness FAIL、cleanup PASS；host-keyboard-retry雙viewport35+35、PGQ單輪16/16、errors0/targetClosed/managed cleanup PASS；source/protected/ZIP MATCH。完整限制及兩輪來源見evidence/edx-wp2-s7/mainline-receipt.md。
