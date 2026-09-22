# EDX-WP2-S1 — Direct text editing / IME bounded commit

Status: PRODUCT_CANDIDATE / HOST_ACCEPTANCE_PENDING
Branch: `codex/edx-wp2-s1-direct-text-edit`
Base: `33a19464b7e6b0795974166cc15c77e68e984e04`
Depends on: EDX-WP1 S11 COMPLETE / Independent Review GO / merged main。
traces_to: `BACKLOG.md §10.1 Decision 2/7/8`、`§10.2 Prior-Art-First`、`§10.3 EDX-WP2`、`§10.4 Unified Operation Registry`、`§10.5 portability`、`§10.8 product simplicity`。

## Objective

把既有 portable editor 的 title / subtitle / keyPoint 直接文字編輯收斂到現有 `edit-text` operation：原生 `contenteditable` 只當輸入層，IME 組字期間不得提交 partial value，blur／完成編輯／export 才以 stable identity 做 bounded commit。保留既有 toolbar 編輯入口，並補雙擊文字直接進入編輯。

## Prior art / measured gap

- donor `html-slide-builder-oss`：research-only，已驗證有 contenteditable / IME 編輯實戰；分類 **ADAPT semantics only**，不吸收 HTML-as-canonical 或 server/editor architecture。
- `facebook/lexical`：MIT，維持 **REFERENCE_ONLY**。目前 DeckSpec 只有 bounded plain-text roles，沒有 rich-text document-model gap，不加入第二 editor state。
- Browser native `contenteditable` + composition events：直接沿用平台 primitive；dependency / portable bundle delta = **0 bytes**。
- Measured gap：目前 `syncText()` 直接 `setValue()`，且把 text/citation component 一併設為 contenteditable，可繞過 Unified Operation Registry；composition / cancel / direct-entry 沒有正式 commit boundary。
- Why custom：只需要把 native input lifecycle 映射到既有 stable identity + `edit-text` operation，這是 PPTSKILL domain glue。
- Why not more：不做 typography/style copy、component text/citation direct edit、asset replace/insert、group/lock、history、AI bridge。

## Fixed contract

1. Direct text target 僅 `title | subtitle | keyPoint`；text/citation component 本 Slice 不設 `contenteditable`，仍走既有 component editor。
2. Canonical mutation 只能經 `executeOperation({ operation: 'edit-text', ... })`；DOM text 只是暫存輸入，不得直接成 canonical truth。
3. Toolbar「編輯文字」維持；雙擊合法 text target 可直接進 edit mode。Layout mode 與 text mode 維持互斥。
4. `compositionstart` 後不得提交 partial IME；composition 尚未結束時 export/save fail loud，切換離開 text mode 則取消該筆未完成組字並還原 canonical。
5. `compositionend`、`focusout`、完成編輯、export 會提交 changed text；canonical no-op 不增加 semantic revision。
6. Escape 取消目前 text target 的未提交 DOM 變更並還原 canonical；不得污染 DeckSpec。
7. `edit-text` 既有 preserve contract 不變：geometry / style / motion / background / components / other slides 保留。
8. Export / offline reopen 不含 `contenteditable`、selection/editor chrome；文字值與 DeckSpec 一致。

## Acceptance

- RED→GREEN mounted tests：合法 direct targets、component boundary、toolbar toggle、double-click、blur commit、IME composition guard/end commit、Escape rollback、export round-trip。
- Existing `edit-text` Node/browser contract、S5 keyboard/IME guard、S8 selection、S9–S11 multi-select operations不回歸。
- Fresh focused EDX editor tests + full non-browser PASS；`git diff --check` PASS。
- Fresh browser：1280×720 / 1600×900 各至少 title direct edit + CJK composition lifecycle + Escape cancel + export/offline reopen；errors 0、managed cleanup PASS。若本 task 無合法 host runtime，保留 host acceptance pending，不繞 AI Core routing。
- Fresh ZIP lifecycle / hash；source/protected hashes freeze。
- 完成停在 Independent Review candidate；不 merge／push／deploy，不開下一 Slice。

## Mainline checkpoint — 2026-09-22

- Product SHA：`a33b05a1e8a07accd4c55f8f4643369d5b9efe3d`。
- RED→GREEN：新 direct-text mounted cases **6/6 PASS**；過程中發現並修正 S5 listener ownership 與 S4-PERF component-DOM stale probe 兩個回歸，沒有保留繞過路徑。
- Fresh focused EDX：**228/228 PASS**。
- Fresh full non-browser：**423/423 PASS**。
- Managed attach/no-spawn regression 含 `--direct-text-regression`：PASS；本 task `CODEX_SANDBOX=seatbelt` 且沒有 `PPTSKILL_DEVTOOLS_ACTIVE_PORT`，因此正式 browser/affected PGQ **HOST_ACCEPTANCE_PENDING**，未啟動或繞過 browser gate。
- ZIP lifecycle PASS；ZIP `2,283,305 bytes`，SHA-256 `7d1cbe050b61dab6fd31f4daa90290d298ee5c17509be7af363cd26446872929`。
- Frozen integrity：source **6/6**、protected **4/4**；見 `evidence/edx-wp2-s1/source-hashes.json`。
- `git diff --check` PASS。剩餘 scope 只在 `tasks/edx-wp2-s1-host-acceptance.md`；完成前不是 Independent Review candidate，不 merge／push／deploy，不開下一 Slice。
