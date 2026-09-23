# WP2-S11 Host acceptance

Status: COMPLETE / INDEPENDENT_REVIEW_GO
Parent: tasks/edx-wp2-s11-image-drop.md
Product: 1fdb3c275f9e174b7c8d506207c42c758aedb71a；source/protected/ZIP frozen，full nonbrowser及ZIP lifecycle PASS。

正式AI Core managed host，CODEX_SANDBOX實際空；不unset／裸啟Chrome，原capacity/readiness/cleanup不變。跑 --image-drop-regression 雙viewport1280×720及1600×900，先沿S10 chooser regression再S11 CDP drop事件。記trusted drop、optimizer calls、mode/busy/invalid/cross-slide/capture/defaults/oldspec/export/offline與新圖UI screenshot；CDP automation非人工Finder拖檔，synthetic negative明標。

四支affected PGQ明列 --test-concurrency=1：pgq-wp4-s3-content-integrity、pgq-wp4-s3-sample-approval、pgq-wp4-s4-full-deck-qa、pgq-wp4-s4-required-visibility。錯誤/remote0、targetClosed，Browser.close/supervisor exit0、exactowned root/marker absent、source/protected4/ZIP前後MATCH。失敗保留，方法缺失不得API fallback；S8歷史I/O未知，本卡不修AI Core。

Final code checkpoint6c9c02f，runtime/tests/ZIP仍1fdb3c2。三輪FAIL與event arrays分別host-acceptance、host-retry-1、host-retry-2；每輪cleanup PASS。詳mainline-checkpoint.md，不直接第四次launch。

## 新契約執行

依 split-acceptance-decision.md，僅在沒有 held component gesture 時送 trusted external CDP drop；active gesture 使用真 pointer＋明標 synthetic DOM drop，snap=false/true 各自取證。輸出 host-split-acceptance；前三輪保持原樣。沿原 managed lifecycle，雙 viewport 後才跑串行 PGQ，失敗即保存／停止後續；無 runtime／ZIP 修改。

## 最終接續狀態

Candidate 8b0be659ea400862456f4ce0db5a0526d0623ce8；runtime1fdb3c2未改。依Owner核定split acceptance，fresh targeted154/154、雙viewport59+59、PGQ單輪16/16、managed cleanup/source4/protected4/ZIP PASS。Full646與ZIP lifecycle為同卡既有證據，未混稱本輪fresh。詳evidence/edx-wp2-s11/receipt.md與handoff_20260923_edx_wp2_s11_review.md。前三輪FAIL保留，Independent Review pending；未merge/push/deploy，未開S12。

## Closure

Owner交回Independent GO，reviewed8b0be659ea400862456f4ce0db5a0526d0623ce8，P0–P3全0。Reviewer fresh154/646；browser59+59、PGQ16為committed evidence核對。reviewed code/ZIP/protected不改；詳evidence/edx-wp2-s11/independent-review.md。已授權主線FF整合及push，實際結果另記integration-receipt。
