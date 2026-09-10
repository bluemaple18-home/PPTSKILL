# P1-R8-B-R1 Distribution Contract Closure Receipt

- 日期：2026-09-10
- 基準 commit：`41bfc39bf67fe34058a6d02c9e52d8e9f1eb9a5f`
- 狀態：`COMPLETE / AUTOMATED GATES PASS / TWO BLIND REVIEWERS PASS`
- Candidate artifact：`dist/PPTSKILL-0.1.0.zip`
- SHA-256：`b202751963209764e5b79f4f6efc206bb74419ee6cc9b794953dd0adf18f481b`

## Scope lock

- 只修改 distribution profile surface、AI-facing adapter entry、install marker guard、smoke semantics、update failure states、distributed control docs 與直接對應測試。
- 不修改 DeckSpec／StyleSpec／CompositionSpec、renderer、editor、sanitizer、visual grammar、motion、Grill／outline。

## Before-change facts

- ZIP 由 `tools/build-distribution.mjs` 組裝；`distribution/lib/lifecycle.mjs` 擁有 install／update／uninstall／smoke public functions；四個 root `.mjs` 只代理 `distribution/lib/cli.mjs`。
- profile schema 與持久化由 `runtime/local-profile.js` 擁有；repo CLI 位於 `tools/profile.mjs`，目前未進 ZIP。
- install marker 欄位為 `schemaVersion/name/version`；update／uninstall 目前只檢查 marker 是否存在。
- adapter manifest 欄位目前只有 identity、command/version probe、shared-core path，沒有 AI-facing entry。
- update 的 activation commit point 是 `stage → target` rename；commit 後只剩 backup cleanup。
- 正式 CLI 目前暴露任意 `--profile`；R1 後只保留 JS function 的 test injection seam，production purge 固定 canonical profile。

## Acceptance

- built ZIP 可直接執行 `node profile.mjs show/save --remember`，不需要 pnpm 或 repo tools。
- invalid/tampered marker 使 update／uninstall fail-loud。
- production `--purge-profile` 只能刪 canonical profile，拒絕 `--profile`。
- package smoke、單一 adapter smoke、release `--all` semantics 分離；too-old version 提供人話錯誤。
- activation 後 cleanup failure 回傳 committed warning；activation 前 rollback failure fail-loud 並留下 recovery path。
- 每個 adapter 有一個指向 shared core 與 workflow contracts 的薄 AI-facing entry。
- ZIP 內 control docs 不攜帶 repo execution frontier／視覺退回指示。
- 新 ZIP identity、完整 regression 與 `git diff --check` 重新取證。

## Failure-state map

- stage 前失敗：不動 current runtime，移除 stage。
- current → backup 後、activation 前失敗：嘗試 backup → current；rollback 失敗時保留 backup 並 fail-loud。
- stage → current 成功：activation committed；backup cleanup 失敗不得回報 rollback，保留 backup 並回傳 warning。
- uninstall：marker 未通過 schema/name/version 驗證時不得 recursive remove。

## Evidence

- 完整 regression：`pnpm test`，91 / 91 PASS。
- R8-B-R1 targeted acceptance：14 / 14 PASS。
- final ZIP integrity：`unzip -t` PASS；`.sha256` verification PASS。
- final artifact host probe：`evidence/p1-r8/b/host-capability-probe.json`，lifecycle／package smoke／profile save／uninstall preservation PASS；shared core ready + single。
- 主機 capability：Codex、Claude Code recognized；Gemini CLI 未安裝，因此 `--all` host observation 為 `partial`，不影響 package lifecycle。隔離 fixtures 已分別證明 Codex-only／Claude-only／Gemini-only smoke PASS。
- destructive failure states：invalid marker 拒絕 update/uninstall；pre-activation rollback PASS；rollback 自身失敗會 fail-loud 並保留 backup；post-activation cleanup failure 回傳 `updated_with_warning` 並保留 backup path。
- stage cleanup failure 不會跳過 rollback；cleanup 與 rollback 同時失敗時會保留並回報兩個錯誤與 recovery backup。
- profile：final ZIP 直接執行 show/save PASS；production CLI 與 exported lifecycle API 都拒絕 arbitrary profile purge；runtime 已 absent 時 explicit canonical purge 仍執行。
- adapter：manifest-relative path 可從任意專案 cwd 定位；stable minimumVersion 拒絕同版 prerelease；相同 source tree 連續 build 的 ZIP SHA 相同。
- distributed docs：ZIP 使用 distribution README，core working-spec 明確排除 repo execution frontier；沒有 P0-R7 frontier／Owner visual rejection 指示。
- 靜態檢查：`git diff --check` PASS。

## Reviewer verdicts

- Lifecycle blind reviewer：`PASS`。重現並確認缺值 flag fail-loud、canonical profile 保留、rollback-before-stage-cleanup 順序、14 / 14 targeted tests、ZIP identity 與 scoped diff。
- Distribution blind reviewer：`PASS`。以 `America/Los_Angeles` 重建仍與 final ZIP byte-for-byte 相同；確認新舊 artifact 差異只包含最後的 CLI／lifecycle repair，91 / 91 regression、14 / 14 targeted tests、host probe 與 ZIP identity 均通過。
- 兩名 reviewer 均未讀本 receipt、未修改 workspace，且以獨立重現證據裁決。

## Decision

`P1-R8-B-R1: PASS`；`P1-R8-B: COMPLETE`；`P1-R8: COMPLETE`。下一張可執行卡為 `P1-R10`；`P1-R9` 仍等待 Owner company PPTX。
