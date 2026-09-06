# PPTSKILL Backlog

**Updated:** 2026-09-06
**Status:** P0-R0～P0-R6 complete；current frontier = P0-R7
**Authority:** This file is the execution queue only. `working-spec.md` remains the product / requirement authority. `implementation-plan.md` is the previous vertical-slice plan and remains historical evidence; where it conflicts with this backlog, stop and complete `P0-R0` before continuing.

---

## 0. Owner decisions locked by 2026-09-06 Grill Me

These are not open questions for implementers.

### Product / distribution

- PPTSKILL is **not** a company AI platform, SaaS, publisher, deck management site, or shared account service.
- Each employee uses their **own** Codex / Claude Code / Gemini CLI account and quota.
- MVP supports CLI / local-capability environments first; future Web/App AI support must remain possible but must not make MVP heavier.
- Distribution is a **ZIP**, not a Git repository for employees.
- One ZIP installs one shared core with thin Codex / Claude Code / Gemini CLI adapters. Do not fork the workflow into three copies.
- Final deliverable is a **single portable `deck.html`** that can be sent by Teams, email, Slack, LINE, cloud drive, USB, etc.
- Recipient security / DRM / view-only enforcement is out of scope. A recipient who owns the HTML can edit it or give it to their own AI.
- No central backend, database, account system, ACL, share URL, Draft/Published cloud state, “My Presentations”, object storage, or company AI account in MVP.

### Workflow

Canonical MVP flow:

```text
User-provided materials
→ Grill Me
→ Outline confirmation
→ 4 real HTML/CSS cover previews
   ├─ Company Style
   ├─ AI Visual Route A
   ├─ AI Visual Route B
   └─ AI Visual Route C
→ User selects Style
→ User chooses:
   ├─ build full deck
   └─ preview 1–2 representative content slides first
→ bounded full generation (≤15 slides)
→ HTML render
→ deterministic browser QA
→ direct HTML editing / AI local patch
→ save new portable deck.html
```

### Outline contract

Each slide in the outline must contain:

- 大標 / primary title
- 小標 / subtitle
- **3–5 key points**

The outline gate is for deciding structure, not writing final slide copy. Full content generation starts only after outline approval.

MVP maximum: **15 slides**. If proposed outline is >15 slides, stop at outline gate. The user and their AI decide whether to merge, delete, or split the deck.

### Style / composition contract

- Four candidates are **1 Company Style + 3 AI-dynamic Visual Routes**.
- The three AI routes are generated for the current deck using the existing frontend-design skill/material concepts; they must differ in visual language, not merely palette.
- Existing `Executive Clear`, `Product Blueprint`, `Sales Momentum`, `Brand Story` remain useful **reference presets / fallbacks**, but are no longer the four fixed choices.
- AI must not generate arbitrary full HTML/CSS from scratch for every style. It should compose from validated typography, palette, spacing, component geometry, layout primitives, chart language, motion language, and other reviewed design materials.
- **Style stays consistent across the deck. Composition may vary per slide.**
- A user can request “換一個排版”. This operation changes composition only; it must not silently rewrite, delete, or add content.
- MVP does not implement Canva / PowerPoint-style free x/y dragging.

### Direct editing

Keep the original PPTSKILL / MD·HTML Viewer direction:

- directly edit text in rendered HTML;
- edit supported content components;
- replace images;
- reorder slides;
- duplicate slides;
- delete slides;
- save as a new single HTML;
- ask AI to patch a specific slide / region.

Do **not** remove direct HTML editing and replace it with AI-only editing.

Presenter Mode is **removed from MVP**.

### Portable DeckSpec

The single `deck.html` must embed a versioned, machine-readable DeckSpec so another compatible AI can open the same file, understand the deck, patch a slide, re-render, and save another HTML without needing a sidecar project folder.

Exported HTML may contain only what is required to play / edit / rebuild the final deck:

- final slide content and slide IDs;
- StyleSpec;
- CompositionSpec;
- image / chart / supported component data;
- DeckSpec schema version.

Export sanitizer must exclude:

- source PDF / Word / Excel full contents;
- Grill Me transcript;
- personal presentation profile;
- local filesystem paths;
- prompts / hidden reasoning;
- rejected drafts;
- private notes.

Public source labels/citations are included only when explicitly intended for the final deck.

### Token-safety contract

The goal is **not** to make every optional action free. Users may choose to spend their own AI tokens on extra images, rewrites, etc. The product must prevent one normal deck from exhausting quota through giant generation behavior.

Hard requirements:

1. Never regenerate the same deck content four times for four style previews.
2. Never make one giant call that generates all 15 slides and full HTML.
3. Full generation is always bounded. Each runtime may choose its own batch size based on model/context capability.
4. Later batches must not resend all previously generated slide bodies.
5. Batch context should be limited to compact deck/outline anchors, selected StyleSpec, the current slide batch, and only necessary neighboring narrative context.
6. Editing one slide must not regenerate the whole deck.
7. “換一個排版” must not regenerate content.
8. Rendering, style application, ordinary composition primitives, collision checks, overflow checks, and file assembly should be deterministic / local whenever possible.
9. Long source materials must not be injected in full into every batch; reuse compact extraction/summary and retrieve only what the current batch needs.
10. UI may let the user choose “直接完成” or “分段產生”, but this choice must not disable the token safety boundary underneath.

### Images / tables / motion

- Do not proactively generate images or tables merely to make slides look richer.
- Use user-provided materials first.
- Generate additional images / tables when the user explicitly requests them; that cost belongs to their own AI usage.
- Motion / transition may be added automatically as part of the selected Style and should stay coherent across the deck.
- Motion should use deterministic renderer/runtime capabilities where possible (CSS / Web Animations / reviewed animation helper) rather than asking the LLM to hand-write animation code slide by slide.
- Support reduced-motion / equivalent accessibility fallback.

### Layout safety

Non-intentional overlap is a **hard failure**, not an advisory taste issue:

- text ↔ text overlap
- text ↔ image overlap
- image ↔ image overlap
- container overflow
- off-canvas content

Repair order:

1. switch to a safer / looser composition;
2. if still impossible, explicitly ask AI to shorten content;
3. if still impossible, split into two slides.

Do not keep shrinking fonts until content technically fits.

### File-size safety

- Optimize / downscale raster images to presentation-appropriate resolution.
- Preserve SVG / icons as vectors where practical.
- Do not inline large video into the MVP single HTML.
- Large GIF / media should warn or degrade gracefully.
- Provide a final file-size warning when the HTML becomes impractically large; no central storage service is required.

### Personal presentation profile

Keep an optional, local, small profile.

- no ai-core requirement;
- no cloud profile service;
- missing profile never blocks deck creation;
- only reusable preferences: density, tone, preferred visual routes, avoid-list, language, etc.;
- never store client/project content, whole decks, chat logs, or company secrets;
- precedence: current explicit request > current deck settings > personal profile > PPTSKILL defaults;
- do not auto-learn every selection;
- update only after explicit “以後都這樣” / “記住” confirmation;
- at one natural checkpoint per deck, proactively remind the user that the preference can be saved so the feature is discoverable;
- ZIP upgrades must never overwrite the user’s profile.

### Company template

A company PPTX already exists, but the owner will provide it later.

MVP does **not** build a general PPTX template importer. Convert this one company PPTX once into a reviewed `Company Style Pack`, including only the needed visual system / reusable layout materials. Runtime generation must not repeatedly re-analyze the PPTX with vision models.

---

# 1. Existing slice disposition

## PS-001 — KEEP / REPAIR ONLY

**Existing value to preserve:** single-file HTML runtime; play; edit mode; reorder; duplicate; delete; save-as-HTML; existing functional test/evidence.

**Required change:**

- remove Presenter Mode from the MVP surface and tests;
- evolve embedded `deck-data` into versioned DeckSpec instead of keeping the current title/body-only fixture model;
- keep direct editing as a first-class requirement.

**Do not:** rewrite the runtime from zero merely because the schema changes.

## PS-002 — KEEP / EXTEND

**Existing value to preserve:** capability probe, fail-loud validator, evidence/receipt approach.

**Extend with:**

- DeckSpec schema validation;
- export sanitizer check;
- text/text, text/image, image/image collision checks;
- overflow and off-canvas checks;
- asset load validation;
- final HTML size guard / warning;
- token-safety static/runtime checks where measurable.

## PS-003 — KEEP MECHANISM / REBASE CANDIDATES

**Existing value to preserve:** same-content real HTML/CSS render → screenshot → human selection; current theme research and visual-route examples.

**Required change:**

- no longer present the existing four fixed themes as the canonical four choices;
- candidate set becomes `Company Style + 3 dynamic AI Visual Routes`;
- existing themes become references/fallbacks;
- MVP remains **one cover per style**, not 3-page-per-style preview;
- all four covers use the same approved title/subtitle/identity and do not regenerate four content variants.

---

# 2. Current frontier

**Current implementation frontier: P0-R7 Direct editor + portable export repair.**

P0-R0 through P0-R4 are complete. Old PS-004 and later cards may be reused only after they are reconciled against the cards below.

```text
PS-001 complete ─┐
PS-002 complete ─┼→ P0-R0 Rebaseline
PS-003 partial ──┘
                    ↓
             P0-R1 Contracts
                    ↓
       ┌────────────┼─────────────┐
       ↓            ↓             ↓
 P0-R2 Outline   P0-R3 Style   P0-R4 Token guard
       └────────────┼─────────────┘
                    ↓
             P0-R5 Full deck
                    ↓
             P0-R6 Browser QA
                    ↓
             P0-R7 Editor/export
                    ↓
             P1-R8 Profile + ZIP
                    ↓
             P1-R9 Company Style
                    ↓
             P0-R10 E2E Release
```

---

# 3. Backlog cards

## P0-R0 — MVP architecture rebaseline

**Priority:** P0 / BLOCKS ALL POST-PS-003 WORK  
**Status:** COMPLETE（2026-09-06；evidence: `evidence/p0-r0/rebaseline-receipt.md`）
**Goal:** reconcile `working-spec.md`, old `implementation-plan.md`, tests and slice expectations with the 2026-09-06 owner decisions above.

### Required outputs

- spec-local decision entries superseding old fixed-four-theme and Presenter decisions;
- new MVP product boundary: portable ZIP + user-owned AI + single HTML; no central platform;
- map old PS-004～PS-008 to the new P0/P1 cards rather than deleting historical IDs;
- list all tests/evidence that remain valid versus those requiring repair;
- no production feature implementation in this card.

### Acceptance

- no document still instructs an implementer to build Presenter Mode as MVP;
- no current-path document states that four fixed themes are the required four choices;
- no current-path document assumes a company backend/account/storage/publisher;
- PS-001～PS-003 preservation rules are explicit;
- current frontier points to P0-R1, not directly to old PS-004.

---

## P0-R1 — DeckSpec / StyleSpec / CompositionSpec contract split

**Priority:** P0  
**Status:** COMPLETE（2026-09-06；evidence: `evidence/p0-r1/contract-receipt.md`）
**Goal:** establish the semantic contract before Grill / full generation continues.

### Required contract

- versioned DeckSpec embedded in HTML;
- slide identity and final content model;
- StyleSpec: deck-wide visual language and motion language;
- CompositionSpec: per-slide composition only;
- explicit separation of content vs style vs composition;
- portable export sanitizer allowlist;
- migration path from current `title/body` fixture.

### Hard constraints

- Theme module may not own arbitrary fixed deck content.
- “換一個排版” must be representable as CompositionSpec-only mutation.
- a received HTML must contain enough sanitized contract data for another compatible AI/runtime to patch and re-render it.

### Prior art

- Existing AI Core `ppt-authoring` / editable deck semantic-spec idea: ABSORB contract separation, do not copy PowerPoint-specific coordinate model wholesale.
- Presenton Template V2: ABSORB schema/hydration separation and compact slide retrieval concepts; do not import its full service/runtime.

---

## P0-R2 — Grill Me + outline gate rebase

**Priority:** P0  
**Status:** COMPLETE（2026-09-06；evidence: `evidence/p0-r2/grill-outline-receipt.md`）
**Goal:** replace old PS-004 outline assumptions with the owner-approved lightweight outline.

### Requirements

- read all supplied material first;
- adaptive one-question-at-a-time Grill Me with suggested answer;
- do not ask questions already answerable from supplied material;
- outline output per slide: `title`, `subtitle`, `3–5 key_points`;
- max 15 slides;
- outline must be human-confirmed before style/full generation;
- no full speaker-note / Presenter requirement in MVP;
- no automatic company knowledge retrieval.

### Acceptance

- 1–15 slides accepted;
- 16+ slides blocked before full build;
- duplicate/missing slide IDs fail;
- no required outline field silently missing;
- user-provided material remains the only source unless user explicitly asks their AI to do something else.

---

## P0-R3 — Dynamic visual-route compiler + style gate

**Priority:** P0  
**Status:** COMPLETE（2026-09-06；evidence: `evidence/p0-r3/style-gate-receipt.md`）
**Goal:** preserve real HTML/CSS preview while changing candidate generation.

### Requirements

- `Company Style` slot + 3 dynamic AI visual-route slots;
- use frontend-design material / validated design primitives;
- candidates must differ in composition language, typography, density, geometry, palette roles, asset treatment and/or motion—not palette alone;
- one cover per style for MVP;
- same approved cover content across all four;
- style selection outputs a compact StyleSpec;
- selected Style remains consistent through the deck;
- composition is free to vary slide-by-slide.

### Acceptance

- route diversity validator rejects “same layout + color swap” candidates;
- four covers are real renderer output, not unimplementable image concepts;
- no fourfold duplicate content generation.

---

## P0-R4 — Token-safety / bounded-generation contract

**Priority:** P0  
**Status:** COMPLETE（2026-09-06；evidence: `evidence/p0-r4/generation-safety-receipt.md`）
**Goal:** guarantee a normal ≤15-slide deck cannot be generated through one quota-destroying giant call.

### Requirements

- model-agnostic batch policy; no fixed universal batch size;
- prohibit one-call 15-slide full generation;
- prohibit repeated full-deck context in each batch;
- maintain compact shared anchors between batches;
- slide-local patch API / artifact shape;
- composition-only patch route;
- optional UX choice: direct full completion vs staged generation;
- optional 1–2 sample content slides after style selection.

### Acceptance evidence

- test fixture proves full build executes as >1 bounded generation unit for a 15-slide deck;
- later units do not contain previous full slide bodies;
- a one-slide edit touches only that slide contract;
- a composition change does not alter content hash.

---

## P0-R5 — Full-deck renderer + safe composition primitives

**Priority:** P0  
**Status:** COMPLETE（2026-09-06；evidence: `evidence/p0-r5/full-deck-renderer-receipt.md`）
**Goal:** generate varied slides within one Style without degenerating into a fixed template or arbitrary unsafe absolute HTML.

### Requirements

- reviewed reusable layout / component primitives;
- AI may select/compose them per slide;
- no requirement that every slide use the same layout;
- user may request an alternate composition;
- support direct edit targets;
- StyleSpec determines common visual world; CompositionSpec determines each slide’s arrangement;
- motion follows StyleSpec and remains coherent.

### Explicit non-goals

- freeform drag-and-drop editor;
- unrestricted arbitrary HTML component generation;
- one fixed layout for every content shape;
- theme-as-color-swap-only.

---

## P0-R6 — Collision / overflow hard gate

**Priority:** P0 / RELEASE BLOCKER  
**Status:** COMPLETE（2026-09-06；evidence: `evidence/p0-r6/geometry-gate-receipt.md`）
**Goal:** make “no accidental overlap” mechanically enforceable.

### Detect

- text/text intersection;
- text/image intersection;
- image/image intersection;
- overflow;
- off-canvas elements;
- unreadably small fallback typography.

### Repair policy

`safer composition → explicit content shortening → split slide`

Never hide the problem by repeatedly shrinking fonts.

### Acceptance

- geometry-based browser test, not screenshot-only judgment;
- collision fixture must fail;
- repaired fixture must pass fresh render;
- two-size visual evidence remains useful but does not replace geometry checks.

---

## P0-R7 — Direct editor + portable export repair

**Priority:** P0  
**Goal:** keep the useful existing HTML editor while making it DeckSpec-safe and share-safe.

### Requirements

- direct text edit;
- supported component edit;
- image replacement;
- reorder / duplicate / delete;
- save new HTML;
- local AI patch of a specific slide / region;
- no free x/y dragging;
- Presenter Mode removed;
- export rehydrates sanitized DeckSpec;
- export HTML contains no forbidden working-context data.

### Acceptance

- edit/save/reopen preserves the changes;
- recipient AI can parse the embedded DeckSpec from only `deck.html`;
- export sanitizer negative fixtures prove profile/path/source-document/prompt data does not leak.

---

## P1-R8 — Local personal profile + ZIP distribution

**Priority:** P1 before MVP distribution  
**Goal:** make the package usable by employees without Git access and without losing personal preferences on upgrade.

### Profile

- small local optional config outside versioned ZIP install dir;
- explicit save only;
- one natural “記住這次偏好？” reminder per deck maximum;
- no project/client/deck data;
- missing profile = normal default path.

### ZIP

- one shared core;
- Codex / Claude Code / Gemini CLI thin adapters;
- installer / updater / uninstaller;
- smoke test / capability probe after install;
- upgrade preserves profile;
- no requirement that users clone or pull a repository.

---

## P1-R9 — Company PPTX → Company Style Pack

**Priority:** P1 / OWNER ASSET REQUIRED  
**Blocker:** company PPTX not yet supplied in this project.

### Goal

Convert the single real company PPTX once into the Company Style candidate included in the four-cover gate.

### Scope

- colors / palette roles;
- fonts / fallbacks;
- logo / identity placement rules;
- spacing / geometry language;
- representative cover / content composition materials;
- chart / table / shape language where present;
- motion language for HTML should be compatible with the company style but need not exist in the PPTX itself.

### Non-goal

Do not build a general arbitrary PPTX importer in MVP. Do not perform vision re-analysis of the company PPTX for every deck.

### Prior art

Presenton Template V2 is a useful architectural donor for one-time template certification / schema hydration, but importing its multi-pass vision pipeline wholesale is unnecessary for this one-company-template MVP.

---

## P1-R10 — Asset optimizer / single-file size guard

**Priority:** P1 before release  
**Goal:** prevent portable HTML from becoming impractically large.

### Requirements

- downscale/compress raster images based on actual presentation use;
- preserve SVG/vector icons where practical;
- no large inline video in MVP;
- warn / degrade oversized GIF or media;
- report final HTML size and warn at a documented threshold;
- no central asset service.

---

## P0-R11 — End-to-end MVP acceptance / ZIP release

**Priority:** P0 RELEASE GATE  
**Depends on:** P0-R1～R7, P1-R8, P1-R10; P1-R9 required for the real Company Style slot.

### E2E scenario

1. Fresh supported CLI environment installs ZIP.
2. User supplies materials.
3. Grill Me runs without re-asking known facts.
4. AI creates ≤15-slide outline; every slide has big title, subtitle, 3–5 key points.
5. User approves outline.
6. Four real covers render: Company + 3 dynamic routes.
7. User selects Style.
8. User chooses direct full build or optional sample-first.
9. Full build runs bounded generation.
10. Slides use varied compositions while preserving one Style.
11. Browser geometry gate reports no accidental overlap/overflow/off-canvas.
12. User directly edits HTML content, reorders/duplicates/deletes/replaces an image, then saves a new HTML.
13. User asks AI to change one slide’s composition; content hash remains unchanged.
14. Export sanitizer passes.
15. Recipient with only the final HTML can open it offline and a compatible AI can parse embedded DeckSpec.
16. File-size guard reports status.
17. User receives at most one optional personal-preference save reminder.

### Release evidence

- deterministic test suite;
- fresh install smoke for all three CLI adapters where available;
- browser screenshots + geometry receipt;
- token-safety receipt showing bounded generation units;
- export sanitizer receipt;
- final single HTML artifact;
- ZIP checksum / manifest.

---

# 4. Prior-art / reuse map

| Source | Classification | Absorb / reuse | Do not absorb |
|---|---|---|---|
| AI Core `frontend-design-gate` / SGDS materials | ADAPT | visual-route contract, design-material routing, motion personality, anti-patterns | AI Core as required runtime dependency |
| AI Core `ppt-authoring` / editable authoring | ABSORB | semantic spec separation, approval-gate lessons, validators | PPTX-specific renderer as canonical output |
| AI Core token-efficiency | ABSORB | progressive disclosure, bounded context, local patch mindset | AI Core global workflow dependency |
| AI Core browser acceptance | ADAPT | actual browser evidence, overflow/collision verification | full unrelated browser-forensics preload |
| AI Core `grill-me` | ADAPT | one-question loop, suggested answer, do-not-reask-known-info | project-state ownership outside PPTSKILL |
| Presenton / Template V2 (Apache-2.0) | ABSORB | outline/template separation, schema-driven hydration, compact slide retrieval, one-time template certification idea | full backend, DB, cloud proxy, installer, runtime stack |
| Current PPTSKILL PS-001～003 | DIRECT REUSE + REPAIR | portable HTML editor/runtime, probes/validators, real HTML theme previews | Presenter MVP, fixed-four-theme authority, title/body-only deck model |

---

# 5. Do-not-build list

For MVP, do not open cards for:

- central AI service;
- SaaS deck manager;
- account system / ACL / DRM;
- share-link publisher;
- company knowledge retrieval;
- Google Drive / Jira / knowledge-base ingestion;
- real-time co-editing;
- PowerPoint/PPTX export;
- generic PPTX importer;
- freeform Canva-style canvas;
- Presenter Mode;
- automatic long-term learning from every deck choice;
- 4× full-deck style generation;
- default image/table generation for decoration;
- fixed-layout-only slide system;
- arbitrary unbounded HTML/CSS generation per slide.

---

# 6. Next action

**NEXT = P0-R7.**

P0-R0 已完成以下 rebaseline acceptance：

1. reconciled `working-spec.md` and `implementation-plan.md`;
2. preserved PS-001～PS-003 evidence and IDs;
3. made P0-R1 the next implementation frontier;
4. 未新增 documentation／contract rebaseline 以外的產品功能。

P0-R1～P0-R6 已完成從契約到 full-deck renderer 與 browser geometry hard gate。下一步是 P0-R7，將既有 direct editor / export 能力修接到 DeckSpec，並移除 Presenter MVP 殘留。
