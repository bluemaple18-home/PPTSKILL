# S5 targeted re-review handoff

Repo `<repo-root>` = PPTSKILL-canonical；branch `codex/edx-wp1-s5`。本檔所在最終commit為修復候選，先核對 git rev-parse HEAD。前次 reviewed SHA：`be7b0bddad3d96384d3a17fe9e1f47349161826c`，NO-GO唯一P2為Escape繞過guard。

請先讀 `tasks/edx-wp1-s5-keyboard-nudge.md`、`evidence/edx-wp1-s5/repair-escape/receipt.md`。對 be7b0bd..HEAD 做 targeted re-review：production只把既有IME/modifier/input ownership guard移到Escape前；核對guarded Escape不攔截/不清selection/不取消gesture，普通Escape仍取消pointer且release不提交。不要重開已GO之S3-MOTION。

Fresh主線驗證：focused73/73、non-browser262/262、真browser雙viewport各20checks PASS，console/page/network/HTTP/remote各0，owned targets與profile清理PASS。composition為synthetic lifecycle配真CDP鍵盤，非原生OS IME。PGQ僅繼承28 unique，不宣稱fresh。歷史失敗均保留。

ZIP SHA：`54970f58ed04fe1b523ac605e1d5a0b02ec976326fbc8d72312c0cdaf80965f7`；5 source與4 untracked hashes見repair-escape目錄。Reviewer若無fresh browser只能記獨立核對已提交evidence。

請回GO/NO-GO、reviewed SHA、P0/P1/P2/P3與重驗證據。唯讀review，不修改candidate/ZIP/原四untracked；不merge/push/deploy，不代開或代傳可見task。Independent re-review pending。
