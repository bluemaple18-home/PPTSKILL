# 公開前的檢查清單

由 `make-oss.sh` 從 38151ac 產生。**不要手改這棵樹** —— 改上游再重跑。

- [x] 授權：MIT，著作權人 catsmice（已確認）
- [ ] README 加一段英文（現在整份是繁中，決定要不要對外找貢獻者）
- [ ] 從乾淨的 clone 實際跑一次 README 與 EDITOR.md 的每一行指令
- [ ] 掃一次有沒有私人內容殘留：
      grep -rniE "uber|9\.4×|封面|預設值|catsmice" . --include=*.md --include=*.py
- [ ] 決定 TODO 要不要開成 GitHub Issues（已從 CLAUDE.md 移除）
