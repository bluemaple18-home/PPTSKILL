# Claude Code adapter

這是薄 adapter，只描述 Claude Code capability probe 與 shared core 位置。所有 DeckSpec、renderer、sanitizer、profile 邏輯都位於 `../../core`；此目錄不複製 core，也不自動修改 `.claude`。
