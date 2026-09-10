# Claude Code adapter

這是薄 adapter；`entry.md` 提供 Claude Code 的 AI-facing 工作入口，`adapter.json` 描述 capability probe 與 shared core 位置。所有 DeckSpec、renderer、sanitizer、profile 邏輯都位於 `../../core`；此目錄不複製 core，也不自動修改 `.claude`。
