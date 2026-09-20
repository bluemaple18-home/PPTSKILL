# S6 snap spike handoff

Branch codex/edx-wp1-s6-snap-spike，基準S5 closure8dd76cc。S5 Independent GO不變。
S6研究完成：conditional ADAPT；決策 `evidence/edx-wp1-s6/decision.md`，來源 `vendor-findings.md`，first-party實測 `operation-probe.mjs/json`，後續矩陣 `authority-map.md`。

接續唯一frontier為fixture-only真browser snap mapping：先量測container原點、root/target矩陣、resize box與motion；不直接把grid8當canonical8，不重複縮放vendor payload。此probe完成才能決定production adapter。未實作snap UI，無fresh browser snap PASS，未改runtime/vendor/ZIP。
四個既有untracked保留；不merge/push/deploy。依既有受管browser生命週期、serial suites與source/evidence分界續做。
