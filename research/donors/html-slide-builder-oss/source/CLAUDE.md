# CLAUDE.md

## Project goal

A local WYSIWYG slide editor. A user starts a server, opens a deck through a file
picker, edits slides directly on the page — move, resize, retype, restyle, insert
images and text boxes — and the edits save themselves. Export produces one
self-contained HTML file with fonts embedded.

Slides are 1280×720 HTML pages. The editor drives a real browser, so whatever
CSS a deck uses keeps working; there is no canvas renderer and no proprietary
document format.

The tool is public; the user's decks are not. See **Repo boundary** below.

## Stack

- **Python 3.14** (works on 3.10+), stdlib only for the server — `http.server`,
  no framework, no dependencies to install for editing
- **Vanilla JS** front-end, single file, no build step. ES modules if it needs
  splitting — do not introduce a bundler
- **fonttools** (`pyftsubset`) + **brotli**, build/export only: `pip install fonttools brotli`
- **curl**, invoked by `build_deck.py` to fetch a missing font

Deliberately not Node/TS. The pain this project set out to fix was an
architectural one (a generator sitting upstream of the preview), not a language
one — see **Architecture decisions**.

## Structure

**Where a file lives tells you who owns it.** `slide_editor/` and `slide_gen/`
hold code only one half ever loads; the repo root holds what both halves touch.
Do not add a root `lib/` — that name already means "downloaded third-party JS"
inside `slides-*/lib/`, and a second meaning would be a real trap.

```
slide_editor/            ── owned by EDITING (tool, in git)
  server.py              HTTP server, routes, CLI entry
  overrides.py           legacy overrides.json reader — kept only to migrate
                         pre-phase-1 decks on first open; no new writes
  static/editor.html     entire front-end
slide_gen/               ── owned by GENERATION
  slide_lint.py          contract check for a deck — the only enforcement in the
                         LLM-authoring path. Its docstring records three checks
                         that were tried and removed; read it before adding one
  new_deck.py            makes a deck from the template, and refuses to write
                         into one that has edits. This is TODO 1's guard: the
                         safe path made easy, not a check to remember
skills/                  ── LLM AUTHORING ──
  slide-deck/SKILL.md    the contract an LLM follows; points at the tools rather
                         than restating rules, because prose invites a model to
                         reason around a rule where `exit 1` does not
  pack.sh                builds the Cowork ZIP, copying template + references in
                         at pack time so there is never a second copy to drift
build_deck.py            export: font subset + embed + nav → single HTML file

── shared by both halves; that is why these sit at the root ──
chart.py                 inline-SVG charts, 9 forms, no chart library
fonts/                   see fonts/README.md — one is committed, one downloads
references/
  slide-copy-zh-tw.md    copywriting guidance for slide text
  chart-vocabulary.yaml  question → chart-form decision table (FT Visual
                         Vocabulary, MIT); 10 ready / 27 planned / 13 skip.
                         Read by chart.suggest(); the 10 ready entries cover
                         exactly the 9 renderers (Column serves two families)
examples/starter/        起手式模板：結構完整、視覺樸素、零網路相依。
                         new_deck.py 與 SKILL.md 都以這一份為準
examples/chart_demo.py   standalone slope chart that predates chart.py
CHART_BRIEF.md           survey of the chart problem — NOT a spec, and its
                         premise 1 predates the architecture flip (see Charts)

decks/                   the user's decks — GITIGNORED, never commit
debug/                   scratch exports — gitignored
ppt-agent-skill/         vendored third-party, own upstream + LICENSE — gitignored
writing-skills/          vendored third-party, own licenses — gitignored
```

A deck directory looks like:

```
decks/<name>/
  deck.json              {"live": "slides-mocha", "theme": "mocha"} — which
                         folder is real. A POINTER, never a second copy: two
                         folders holding the same deck is how a stale tab
                         silently overwrites the good one
  slides-*/              THE SOURCE OF TRUTH. the editor reads and writes these
    lib/                 three.js / p5.js / vanta effects, downloaded on demand
  assets/                images/video added through the editor
  .editor-backup/<dir>/  each page as it was before its first edit ever.
                         KEYED BY THE LIVE FOLDER'S NAME (server.py:68) — so
                         renaming slides-*/ orphans its backups and re-snapshots
                         already-edited files as if they were the original
  out/                   packed single-file decks
  .trash/<dir>/          deleted pages, moved not unlinked, prefixed with a
                         timestamp. /api/restore moves them back
  .archive/              dead scaffolding. Nothing reads it; see its README
```

## Dev commands

```bash
# editor — the slides dir is written in place
python3 -m slide_editor.server [<slides_dir>] [--root <path>] [--port 8765]

# start a new deck (refuses to overwrite); or ask if a dir is safe to write
python3 slide_gen/new_deck.py <name>
python3 slide_gen/new_deck.py --check <slides_dir>

# check a deck against the contract. --strict also fails on warnings
python3 slide_gen/slide_lint.py <slides_dir> [--strict]

# export — one self-contained HTML file, written into that deck's own out/
python3 build_deck.py <slides_dir> -o decks/<name>/out/deck.html \
        --font wenkai|serif|none --nav scroll|buttons

# which chart form answers this question? only ever suggests renderable forms
python3 -c "import chart; print(chart.suggest('哪個版位成效最好'))"

# charts — returns an SVG string to paste into a slide
python3 -c "import chart; print(chart.render('lollipop', [('A',3),('B',5)], highlight='B'))"
```

**There is no "generate a deck" command, by design.** A new deck starts as a
copy of `examples/starter/` into `decks/<name>/slides/`, edited from there
— by hand, or by an LLM following `skills/slide-deck/SKILL.md`. The old
`python3 theme_mocha.py` path is gone; see **Architecture decisions**.

One optional secret, for the live token-counting demo only: the server looks for
`ANTHROPIC_API_KEY`, then `<repo>/.anthropic-key`, then `~/.anthropic-key`. It is
read server-side and used only by `/api/count_tokens`; it never reaches the
browser and never enters an export — verified by grepping the packed file. Both
key filenames are gitignored. Everything else needs no environment variables, and
the server still binds `127.0.0.1` only.

## Architecture decisions

**Source of truth: the slide HTML.** Edits write directly into
`slides-*/…html`. Nothing sits upstream of it: a deck is a folder of HTML pages,
and that is the entire model. No generator to rerun, no copy file to keep in
sync, no step that rebuilds a page from anything else.

That was not always true, and the wreckage is worth recognising. A deck used to
be produced by `deck_copy.py` → `theme_*.py` → `slides-*/`, with the editor
writing to the left of that chain while you looked at the right. Phase 1 deleted
the chain. The theme files survive as CSS in `slide_gen/themes/` but refuse to
run, and each deck's `deck_copy.py` sits in its own `.archive/`. Do not revive
that path — anything that makes a generator runnable again needs TODO 1 first.

Saving serializes the whole document from the iframe and writes the file. There
is deliberately **no reformatter**: browser serialization normalizes attribute
quoting and void-element syntax but leaves text nodes and indentation alone, so
a slide's first save produces one small normalization diff and is stable after
that. A hand-rolled pretty-printer was rejected — HTML whitespace is significant
and getting it wrong changes how slides render.

Per-element editor state lives in a `data-ed` attribute on the element itself
(the dx/dy/rot/scale values the properties panel shows), which is what makes
reload lossless. `build_deck.py` strips `data-ed` at export.

**Themes are explore-then-commit.** Try a deck in several styles, pick one, and
from then on that folder *is* the deck; `deck.json` records which one won.
Multi-theme is a decision made *before* editing, never maintained in parallel —
and never as two folders holding the same deck, which is how a stale tab
silently overwrites the good one. Rejected renders go to `.archive/`.

Exploring is a manual copy today: with no runnable generator, "see it in another
style" means authoring a second `slides-<name>/`. The explicit "fork to theme"
action — free on an unedited deck, refusing on an edited one — is still TODO 1.

**Geometry is relative, not absolute.** A patch stores `dx`/`dy` composed onto
the element's existing computed transform (`base`), so a theme's own
`translateY(-50%)` positioning survives. Anything needing absolute coordinates
(align, distribute, snap) must read the live rect from the iframe and convert to
a delta. Do not switch the model to absolute — it would break theme-positioned
elements.

**Selectors are display-only.** `selectorFor` in `static/editor.html` just
labels the current selection in the right-hand panel. Edits live on the element,
not in a selector-keyed sidecar, so the old "theme rerun breaks the selector"
failure mode is gone. Do not reintroduce selector-keyed persistence.

**Repo boundary: tool in git, content out.** The file picker opens decks by
absolute path, so they never need to live inside the repo. Add a `--root` flag to
scope what the picker can browse.

## Conventions

- **Settle the design direction before writing UI code, not after.** This
  project's UI is `slide_editor/static/editor.html` (and any module split out of
  it) — plain HTML/CSS/JS, no build step. Read the design direction below and
  match it; retrofitting it as a review pass afterwards does not work.
- **Design direction — "workbench, not artwork."** The slide is the artifact; the
  chrome exists to disappear around it. The committed aesthetic is precise
  utilitarian restraint: a cool grey-neutral chrome against warm paper slides,
  character carried by type scale, weight and letter-spacing rather than
  decoration, and one accent colour used *only* for selection state so that
  "what is selected" is never ambiguous. No gradients, no decorative texture, no
  motion beyond state feedback — anything atmospheric competes with the deck
  being designed.
- **The chrome must not load network fonts.** Same reason `build_deck.py` embeds
  them: this tool has to work offline and on locked-down networks. Typography
  character comes from a deliberate system sans/mono pairing and its spacing, not
  from a downloaded display face.
- **Light mode.** The editor chrome is light, not dark. Design note: the slide
  canvas is itself a warm paper colour (`#f3ebde` mocha, `#f5f0e8` sakura), so a
  light chrome has to earn separation some other way — a cooler or greyer neutral
  for the chrome, a defined border and shadow on the stage — or the slide stops
  reading as the artifact and dissolves into the surrounding UI. Do not simply
  invert the dark tokens.
- Code comments, UI strings and user-facing docs are **Traditional Chinese
  (zh-TW)**. This file is English because it addresses the coding agent.
- Comments explain *why*, especially the non-obvious constraint behind a
  workaround. Match that density; the existing code is a good model.
- Slide dimensions are fixed at 1280×720.
- Fail loud and refuse rather than guess when a write target is ambiguous —
  never silently modify the wrong thing.

## Interactive slides (WebGL / Wasm / demos)

會跑腳本的投影片：腳本產生的節點一定要放在 `data-live` 容器裡，否則存檔會把它們永久寫進原始檔。詳見 `docs/interactive-slides.md`。

## Vanta backgrounds

動任何一個效果之前先讀。十四個效果裡有三個的 `backgroundColor` 完全沒有作用，從選項名稱用猜的每一次都猜錯。詳見 `docs/vanta.md`。

## Text animation

動畫**絕對不能**在編輯中的 iframe 裡跑 —— 存檔是序列化整份 live DOM，數到一半存檔就把中間值永久寫進檔案。詳見 `docs/text-animation.md`。

## Live LLM demo

投影片上真的打一次 `count_tokens`。金鑰只留在伺服器端，打包後改走錄製值。詳見 `docs/live-llm-demo.md`。

## Charts

`chart.py` 九種形式。顏色走巢狀 `var()`、字體走 `var(--body-font)`，寫死字體名稱匯出後會掉字。詳見 `docs/charts.md`。

## Gotchas

- **`inline_images` MIME used to fall back to `image/{ext}`**, so an embedded
  `.mp4` became `image/mp4` and a `.js` became `image/js` — both refused by the
  browser. There is now a real `MIME` table with an `application/octet-stream`
  fallback. This silently broke inserted **videos** in every export before now.
- **`<script src>` is inlined as script *text*, not a data URI** (`inline_scripts`,
  run before `inline_images` so the generic `src=` pass cannot claim it first). A
  data URI would die on any MIME mismatch and costs +33% in base64. External
  http(s) sources are left alone — they need the network, which contradicts the
  single-file offline promise, so that is the author's call.
- **Style copy/paste must map `font-family` back to a theme role.** `copyStyle`
  reads computed styles, and computed `font-family` is the *resolved* stack — a
  literal, which the export never rewrites. It compares the resolved value against
  `:root`'s three role variables and stores `var(--display-font)` etc. instead.
  Any future feature that reads computed styles and writes them back has the same
  trap.
- **Never write a literal `font-family` onto an element.** `build_deck.py`
  embeds one subset face per deck and swaps it in by rewriting the `--display-font`
  / `--body-font` / `--label-font` *variables* (`build_deck.py:120`); it does not
  touch `font-family` on elements. So a literal family looks right locally and
  drops glyphs on any machine without that font. The type panel therefore offers
  the three theme roles as `var(--…)`, which is correct by construction — verified
  by exporting and confirming a text box resolves to `'DeckCJK'`. If a real family
  picker is ever wanted, `subset_and_embed` must first subset every used family
  against the full deck charset (~50KB each).
- **`fonts/NotoSerifTC-CJKcommon.otf` has no download URL** (`build_deck.py:49`).
  It is pre-trimmed and must stay in git or `--font serif` breaks on a fresh
  clone. The wenkai font auto-downloads via `ensure_font`.
- **Align/snap must not round to whole pixels.** Elements often sit at fractional
  positions (a heading at `left: 538.15`), so rounding the delta to an integer
  puts centring 1px out and knocks a snapped element back off the grid. `deltaTo`
  and the grid-drag path round to 2 decimals instead; only ungridded drags round
  to integers, to keep the output tidy.
- **A plain click must not save.** `startDrag` fires on mousedown, so before the
  `drag.moved` flag every click wrote the file and pushed an undo entry — click
  five times and ⌘Z did nothing five times. Undo is pushed on the first real
  mousemove, and mouseup only persists when something moved.
- **`serializeDoc()` must stay idempotent.** Undo restores a snapshot via
  `document.write`, and the HTML parser moves any whitespace after `</html>` into
  `<body>` — so naively appending a trailing newline makes the file grow by a line
  on every undo. It strips trailing whitespace text nodes and re-adds exactly one
  newline; serialize→parse→serialize returns the identical string. Verify that
  property before changing anything in that function.
- **`data-live` snapshots are keyed by `data-live-id`, not document order.**
  Background layers are inserted as `body.firstChild`, which shifts every index;
  index-keyed matching restored the wrong element's content. A container with no
  snapshot is emptied — correct, because it was created this session and its
  authored content is empty.
- **Saves are conflict-checked against the file's mtime.** `/slide/` returns
  `X-Slide-Mtime`, the editor keeps it, and `/api/save` refuses with 409 if the
  file changed since. Without this a tab holding a stale DOM silently overwrites
  any edit made outside it, destroying work restored from backup while an editor
  tab is still open. On conflict the editor stops saving
  and says to reload rather than pretending it succeeded.
- **The editor writes into the user's decks, which are not in git.** That is why
  `server.py` snapshots each page to `<deck>/.editor-backup/<slides_dir>/` before
  its first write. Keep that guarantee.
  **Know what it does not cover.** The copy is written once, ever, guarded by
  `if not dest.exists()` — so it holds the page *before its first edit*, which is
  byte-identical to what regenerating the deck would produce. It protects you
  from your own mistakes in the editor; against anything that rewrites the deck
  it restores exactly the state you were trying to escape. That asymmetry is why
  TODO 1 became `new_deck.py` (refuse) rather than "restore from backup".
- **`/api/save` returns the new stamp and the client adopts it.** Without that,
  the editor's own write bumps the file mtime, the 1.2s poll reads it as an
  external change, and the reload throws away the edit you just made. Do not
  "simplify" the stamp handshake away.
- **`inline_images` resolves relative paths against the dir passed in, not the
  file's own parent** (`build_deck.py`), because by export time the files are
  temp copies. Inserted media uses `../assets/…`, which only resolves if the real
  slides dir is threaded through as `src_dir`.
- **IME composition must be handled.** `contenteditable` fires `input` mid-
  composition, so 注音/倉頡 input is read half-formed without
  `compositionstart`/`compositionend` guards.
- **Enter inside `contenteditable` produces a block wrapper, not a `<br>`.**
  Chrome wraps each line in a `<div>`, which is not on the sanitizer's allowlist,
  so unwrapping it silently deleted the line break — the text looked split while
  editing and rejoined on blur. `sanitizeInto` now inserts a `<br>` before
  unwrapping any block-level tag, and `enterText` sets
  `defaultParagraphSeparator` to `br` so the structure is right from the start.
  The sanitizer path still matters for pasted content and other browsers.
- **`contenteditable` produces dirty markup** — ⌘B injects `<b>`, external pastes
  carry `style="…"`. Sanitize to a tag/attribute allowlist before writing to disk,
  or the files degrade over a few sessions.
- **Persisted undo is keyed to the page's own mtime, never `S.stamp`.**
  `Ctx.stamp()` is the newest mtime across the whole deck, so saving page 7 moves
  page 3's stamp too; validating against it would throw away a page's history on
  every unrelated edit. `slideMtime` (from `X-Slide-Mtime`) is the value that
  answers "which version of this file did this history grow against". On a
  mismatch, clear **both** storage and the in-memory stack — leaving memory
  populated lets ⌘Z write an old snapshot over someone else's change, which is
  what `/api/save`'s 409 exists to stop.
- **Undo cannot persist all 60 snapshots.** They run ~13KB, so 11 pages × 60 is
  8.4MB against a browser quota near 5MB — it would fail silently mid-session,
  which is worse than not persisting. Memory keeps `UNDO_MAX`, storage keeps
  `UNDO_PERSIST_MAX` (12), with a per-page ceiling and eviction of other pages
  before giving up. If it still fails it disables itself and says so, and it must
  never touch the save-state chip: saving is fine, and a chip claiming otherwise
  would be a lie.
- **Deleting a page moves it to `.trash/`, it never unlinks.** `decks/` has no
  version control, and `.editor-backup/` holds the *pre-first-edit* page, so
  restoring from it would discard every edit that page ever received. Because the
  delete is reversible three ways (the trash file, the 復原 action, ⌘Z), it
  deliberately has **no confirmation dialog** — the undo is the confirmation, and
  `confirm()` is banned here anyway.
- **Inserting a page never renumbers filenames.** `＋` on a list row creates
  `03a-新頁.html`, which sorts strictly between `03-…` and `04-…` because `-`
  (0x2D) precedes `a` (0x61). Renaming later slides instead would orphan each
  one's `.editor-backup` entry and its persisted undo history — both keyed by
  filename. A `＋` above the first row covers the before-first position, so one
  rule ("insert below this row") reaches every slot.
- **Renaming or moving a page must move its `.editor-backup/` entry and its
  `sessionStorage` undo entry with it.** Both are keyed by filename. The server
  moves the backup (and clears `backed_up`, or the next save re-snapshots an
  already-edited page as if it were the original); the client moves the history
  key. Miss either side and that page's history silently detaches.
- **Reordering renames only the page being moved**, into the target gap, exactly
  like insert — the other filenames never change, so no other page's keys break.
- **A row is not permanently `draggable`.** Chrome suppresses text selection on
  draggable elements, so `draggable` is set on mousedown only when the press did
  not start on the name — otherwise double-click-to-rename fights the drag.
- **A new page is a copy, not a blank.** Theme CSS is inlined in every slide
  file, so an empty file renders unstyled. Copying the clicked row is the only
  approach that works across themes.
- **Page numbers are baked into each slide's HTML** (`03 / 11` in the footer), so
  deleting a page leaves every remaining footer wrong. The editor detects this
  and says how many pages are stale; it does **not** rewrite them, because fixing
  it touches every page in the deck and that should be a deliberate act. Filenames
  keep their gap (01,02,03,04,06…) — order is alphabetical, so a gap is harmless.
- **Deck-level undo interleaves with the per-slide stacks by timestamp.** Page
  deletion cannot live in `undoStacks`, which is keyed by slide and restores via
  `document.write`. `deckOps` holds them separately and `doUndo` compares
  `op.at` against `lastPushAt` to decide which is more recent. Verified: edit a
  title, delete a page, ⌘Z restores the page with the title still edited, ⌘Z
  again reverts the title.
- **Do not trigger `alert`/`confirm`** anywhere in the editor; a modal blocks the
  automation used to test it.

## Working agreements

Learned the hard way in this project; they are not general advice.

- **Verify export changes against a real theme deck, visually.** Trivial
  hand-written test slides do not exercise theme-generated markup, and an export
  can render blank while every structural check still passes.
- **Numeric checks do not replace looking.** Charts passed every size and
  structure assertion while labels overlapped, collided with category names, and
  fell off the right edge. Three defects, all invisible to a validator.
- **Before wiring an effect or a colour rule, test each option in isolation.**
  Three of Vanta's fourteen effects expose a `backgroundColor` that does nothing;
  guessing from the option name was wrong every time.
- **Restarting the editor server is survivable now, but only via the same tab.**
  This used to destroy the session. Since undo persists to `sessionStorage`
  (TODO 3), a restart no longer costs history: the file mtimes do not change, so
  the reopened page revalidates and reconnects. Two conditions, both easy to get
  wrong — **reload the existing tab, do not open a new one** (`sessionStorage` is
  per-tab and dies with it), and unsaved edits ride out on the `beforeunload`
  `sendBeacon` flush, so do not kill the browser to "clean up" first. Still say
  what you are doing before doing it.
- **Check a route's method before concluding the server is broken.**
  `/api/browse` is a GET with a query string; probing it with POST returns
  `{"error": "not found"}`, which reads exactly like a missing deck. Read the
  handler, not the error.
- **Run every command a doc claims, before believing the doc.** `EDITOR.md`'s
  first command failed on any machine but the author's for as long as it existed,
  because nobody ran it from a clean checkout. Docs rot silently; commands do not.
- **Line-number references drift.** An audit found `build_deck.py:114` and `:43`
  both pointing at unrelated code — one of them at an entry that demonstrated the
  opposite of the claim. A wrong line number costs a reader more than no
  reference; re-check them whenever the file moves.
- **Screenshots taken too early show a blank page.** WebGL and large decks need
  several seconds; a blank frame is usually timing, not failure. Wait and re-shoot
  before concluding anything is broken.
