# P0-R11-R1 S3 真實 CLI Replay Evidence

**日期：** 2026-09-14
**狀態：** PASS（目前可用的 supported CLIs）
**Gemini：** UNVERIFIED（CLI unavailable）

## 交付物與註冊

- Candidate ZIP：`dist/PPTSKILL-0.1.0.zip`
- SHA-256：`824471ae05ec5ee045f796fbde3da993f4115e5b01c7639bb7c1b44e1b1337fd`
- Installed runtime：`/Users/matt/.pptskill/runtime`，version `0.1.0`
- Owned skill registrations：`/Users/matt/.codex/skills/pptskill`、`/Users/matt/.claude/skills/pptskill`、`/Users/matt/.gemini/skills/pptskill`

## Claude Code replay

- Host：Claude Code 2.1.270
- 真實 installed `/pptskill` 被發現。
- 執行 `workflow-cli.mjs inspect-existing`。
- 結果：`mode=restyle-existing`，解析 7 張 slide outline。
- 終態：停在 pressure-test question，等待人工核准。
- Invariants：source `deck.html` hash 未改；`new.html` 未產生。

## Codex replay

- Host：codex-cli 0.148.0-alpha.9
- Launch path：`/Applications/Codex.app/Contents/Resources/codex`
- 真實 installed `$pptskill` 被發現。
- 執行 `workflow-cli.mjs inspect-existing --input ./deck.html`。
- 結果：`status=pass`、`mode=restyle-existing`，回傳 7 個原始 slide IDs 與 content hashes。
- 終態：停在 pressure-test gate。
- Invariants：source `deck.html` hash 未改；`new.html` 未產生。

先前 `/usr/local/bin/codex-code-mode-host` 缺失是 CLI launch environment 問題；同一台機器改用 Codex.app bundled binary 後已成功完成 replay，因此不再是 PPTSKILL S3 blocker。

## Gemini

驗收環境中 `command -v gemini` 無結果。Packaged registration 與 deterministic lifecycle evidence 維持 PASS，但 real Gemini invocation 不宣告 PASS，狀態保持 `UNVERIFIED`，待 supported CLI 可用時補驗。

## Acceptance mapping

- Codex 與 Claude Code 均透過真實 installed skill 進入 guarded workflow：PASS。
- 兩者均執行 existing-HTML inspection 並判定 `restyle-existing`：PASS。
- 兩者均在 required human gate 前停止：PASS。
- Source unchanged、rewritten output absent：PASS。
- Gemini unavailable 明確標示且未轉成 fake PASS：PASS。

## Closure write-back verification

- `node --test tests/p0-r11-r1-entry-enforcement.test.mjs`：7/7 PASS。
- `pnpm test`：117/117 PASS。
- `git diff --check`：PASS。

結論：`R11R1-S3` 對目前可用 real CLIs 的 acceptance 已滿足；`P0-R11-R1` 可關閉。此結論不重開 renderer、VQ2、VQ3、R7、R8、R9 或 R10。
