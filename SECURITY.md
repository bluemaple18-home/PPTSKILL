# Security Policy

PPTSKILL 的 `main` 是持續開發線；安全修正優先針對目前 `main` 與最新公開 release artifact。舊版 ZIP 不保證持續收到修正，因此回報時請附 commit SHA、版本與重現條件。

若 GitHub repository 的 **Security** 頁面提供 private vulnerability reporting，請優先使用該 GitHub-native 管道。若該功能不可用，請建立不含 exploit 細節的 GitHub issue，僅說明需要私下協調安全回報；不要把可利用細節、secret、個資或私人聯絡方式直接貼在公開 issue。

在維護者完成協調前，請勿公開可直接利用的 exploit 細節或可重現 secret。PPTSKILL 特別把 installer、updater、portable HTML 產物、Skill registration／ownership 邊界視為安全敏感 surface。

一般產品 bug、功能需求與不含敏感細節的 hardening 建議可走正常 GitHub issue。
