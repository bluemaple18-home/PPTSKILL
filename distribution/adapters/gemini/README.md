# Gemini CLI adapter

這是薄 adapter；installer 會註冊共用 `pptskill` Skill，`entry.md` 保留 adapter handoff，`adapter.json` 描述 capability probe 與 shared core 位置。所有 DeckSpec、workflow gate、renderer、sanitizer、profile 邏輯都位於 `../../core`；此目錄不複製 core。
