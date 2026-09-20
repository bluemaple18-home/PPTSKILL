# S6 architecture validation handoff — 2026-09-21

Branch codex/edx-wp1-s6-snap-spike。維持Owner界線：mapping/architecture validation，非production review candidate，不Independent GO；S5 code/ZIP不變。

最新 `evidence/edx-wp1-s6/direction-target/decision.md`：36組真pointer採集，兩viewport實際delta均10；方向限制單獨不隔離transform，無transform geometry target＋限定方向在12組proxy案例完全一致。Drag left/top落格，SE resize固定左上角、right/bottom落格（尺寸本身不必8倍數）。18對viewport一致、presentation未改，errors0、cleanupPASS。

`5a937bf`直接vendor payload否決仍成立。新架構只是bounded候選，尚未驗證real full-deck、motion lifecycle、hit routing、negative/zero、多次preview、export或performance。後續唯一窄frontier可先補negative/zero/multi-update與proxy teardown，不能直接宣布production可用，也不自造quantizer。

原始證據receipt.json、驗證verification.json與verify.mjs可重播。四個untracked不變；未merge/push/deploy。
