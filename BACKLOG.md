# PPTSKILL Backlog

**Updated:** 2026-09-06  
**Status:** visual-quality repair lane opened；current frontier = `P0-VQ1`  
**Authority:** This file is the execution queue. `working-spec.md` remains the product / requirement authority. Historical implementation details remain in Git history and `evidence/` receipts.

---

# 0. Current owner verdict

The 2026-09-06 implementation commit `cc7185620c4c0b979d1461c445bac03f8aed3708` completed the contract / runtime path through geometry QA, but the owner rejected the current rendered style candidates as visually too primitive.

This is **not** authorization to rewrite the working architecture.

Preserve:

- DeckSpec / StyleSpec / CompositionSpec separation;
- Grill Me + outline contract;
- ≤15-slide boundary;
- bounded generation / token-safety contract;
- single portable HTML artifact;
- direct editing direction;
- geometry collision / overflow hard gate;
- semantic composition primitives;
- Company Style + 3 AI Visual Routes product contract.

Reopen only the visual-quality surfaces that failed owner acceptance.

## Status correction

- `P0-R0`: COMPLETE — keep.
- `P0-R1`: COMPLETE — keep.
- `P0-R2`: COMPLETE — keep.
- `P0-R3`: **FUNCTIONAL CONTRACT COMPLETE / VISUAL ACCEPTANCE REOPENED**.
- `P0-R4`: COMPLETE — keep.
- `P0-R5`: **ARCHITECTURE COMPLETE / VISUAL VOCABULARY REPAIR REQUIRED**.
- `P0-R6`: COMPLETE — keep geometry gate.
- `P0-R7`: **PAUSED until P0-VQ1～P0-VQ3 complete**.

The previous P0-R3 receipt remains valid evidence for schema / same-content / no-color-swap-only / human-selection behavior. It is **not** sufficient evidence that the visual quality is acceptable.

---

# 1. Locked MVP decisions

These are not open questions for implementers.

## Product / distribution

- Employees use their own Codex / Claude Code / Gemini CLI account and quota.
- MVP is local / portable first; future Web/App support may be added later without changing core contracts.
- Distribution is one ZIP with one shared core and thin CLI adapters.
- Final deliverable is one portable `deck.html` that can be sent directly to coworkers / clients.
- No central AI platform, SaaS deck manager, account system, ACL, publisher, backend, DB, cloud storage, DRM, share-link service, or real-time collaboration.
- Recipient may edit the HTML or give it to their own AI; PPTSKILL does not pretend to enforce view-only security.

## Canonical workflow

```text
User-provided materials
→ Grill Me
→ Outline confirmation
   └─ every slide = title + subtitle + 3–5 key points
→ 4 real HTML/CSS cover previews
   ├─ Company Style
   ├─ AI Visual Route A
   ├─ AI Visual Route B
   └─ AI Visual Route C
→ User selects Style
→ Optional 1–2 content-slide sample OR direct full build
→ bounded generation, max 15 slides
→ HTML render
→ geometry / visual acceptance
→ direct edit / local AI patch
→ save a new portable deck.html
```

## Style / composition

- Style is deck-wide and stays coherent.
- Composition may vary by slide.
- “換一個排版” changes CompositionSpec only; content hash must remain unchanged.
- AI must not regenerate the same content four times for four style previews.
- AI must not write arbitrary unbounded HTML/CSS per slide.
- PPTSKILL must not degrade into “same layout + different colors”.
- No Canva / PowerPoint free x/y dragging in MVP.

## Images / tables / motion

- Do not proactively generate images or tables just to decorate a slide.
- User-provided materials first.
- Generate image / table only when the user explicitly asks.
- Motion may follow Style automatically and must remain coherent across the deck.
- Prefer deterministic CSS / Web Animations / reviewed animation helper; support reduced motion.

## Layout safety

Non-intentional text/text, text/image, image/image overlap, overflow, off-canvas content, or unreadably-small fallback typography = hard failure.

Repair order:

`safer composition → explicit content shortening → split slide`

Do not repeatedly shrink fonts until content technically fits.

## Portable DeckSpec

The final HTML embeds a versioned sanitized DeckSpec sufficient for another compatible runtime / AI to patch and re-render the deck.

Export must exclude source-document bodies, Grill transcript, personal profile, local paths, prompts / hidden reasoning, rejected drafts, private notes, and other working-context data.

## Personal profile

- optional local small profile;
- no AI Core requirement;
- no cloud profile service;
- current request > deck settings > profile > defaults;
- explicit save only;
- one natural “記住這次偏好？” reminder per deck maximum;
- ZIP upgrades must not overwrite profile;
- never store client / project content, whole decks, chat logs, or company secrets.

## Company template

A real company PPTX exists and will be supplied later.

MVP does not build a generic PPTX importer. Convert that one PPTX once into a reviewed Company Style Pack; do not re-run vision analysis for every deck.

---

# 2. Existing implementation inventory

Latest implementation basis: `cc7185620c4c0b979d1461c445bac03f8aed3708`.

## Reuse without rewrite

### P0-R1 — contracts

**Status:** COMPLETE  
**Evidence:** `evidence/p0-r1/contract-receipt.md`

Keep:

- `schemas/deck-spec.schema.json`
- `schemas/style-spec.schema.json`
- `schemas/composition-spec.schema.json`
- `runtime/deck-spec.js`
- export sanitizer allowlist and content/style/composition separation.

### P0-R2 — Grill / outline

**Status:** COMPLETE  
**Evidence:** `evidence/p0-r2/grill-outline-receipt.md`

Keep adaptive one-question Grill Me, human outline approval, max 15 slides, and per-slide title + subtitle + 3–5 key points.

### P0-R4 — token safety

**Status:** COMPLETE  
**Evidence:** `evidence/p0-r4/generation-safety-receipt.md`

Keep model-agnostic bounded generation, compact anchors, slide-local patching, and no repeated full-deck context.

### P0-R6 — geometry gate

**Status:** COMPLETE  
**Evidence:** `evidence/p0-r6/geometry-gate-receipt.md`

Keep browser geometry detection and fail-loud overlap / overflow / off-canvas behavior. Visual-quality repair must not weaken this gate.

## Reopened surfaces

### P0-R3 — current problem

**Functional evidence exists:** `evidence/p0-r3/style-gate-receipt.md`

Current implementation facts:

- `runtime/style-candidates.js` exposes only five `primaryMove` values;
- most cover routes still inherit a common `8fr / 4fr` left-copy / right-panel skeleton;
- `technical-map` / `split-proof` / `editorial-rail` are structurally shallow hand-written cover patterns;
- current route-diversity validation counts StyleSpec field differences but does not prove rendered structural diversity;
- `fixtures/style-candidates.json` contains hand-authored fixture routes; the portable PPTSKILL package does not yet contain an actual adapted frontend-design material layer;
- current receipt proves no clipping and no trivial color-swap-only pair, but does not prove owner-acceptable design quality.

### P0-R5 — current problem

**Architecture evidence exists:** `evidence/p0-r5/full-deck-renderer-receipt.md`

Keep the seven semantic primitives and DeckSpec-safe rendering path, but the current renderer uses a narrow engineering visual vocabulary: generic cards, lists, split panels, grids, and shared type scales. The repair must expand validated visual variants without replacing semantic primitives with arbitrary HTML.

---

# 3. Current frontier

**STOP P0-R7.**

Current execution order:

```text
P0-R0/R1/R2/R4/R6 complete
        ↓
P0-R3 functional complete but visually rejected
        ↓
P0-VQ1 Portable frontend-design material intake
        ↓
P0-VQ2 Style candidate renderer + diversity repair
        ↓
P0-VQ3 Full-deck visual vocabulary repair
        ↓
P0-R7 Direct editor + portable export
        ↓
P1-R8 Profile + ZIP
        ↓
P1-R9 Company Style Pack (owner PPTX required)
        ↓
P1-R10 Asset optimizer
        ↓
P0-R11 End-to-end release
```

Do not continue P0-R7 until the owner has approved the repaired P0-VQ2 style-candidate screenshots and P0-VQ3 has preserved geometry safety.

---

# 4. Visual-quality repair lane

## P0-VQ1 — Portable frontend-design material intake

**Priority:** P0 / BLOCKS P0-VQ2  
**Goal:** make the existing AI Core frontend-design knowledge materially available to PPTSKILL without making AI Core a runtime dependency.

### Source scope

Review / adapt from the current AI Core sources already identified by this project:

- `skills/frontend-design-gate/SKILL.md`
- `skills/sgds-frontend-materials/SKILL.md`
- relevant reviewed references for visual route, typography, layout rhythm, visual polish, component geometry, motion personality and anti-patterns.

### Required output

Create a small portable PPTSKILL design-material layer containing only the pieces needed for presentation design, such as:

- cover archetype catalog;
- typography personalities / role pairings;
- information-density patterns;
- graphic-language families;
- visual-anchor types;
- surface / line / shape language;
- image-treatment rules;
- motion personalities;
- anti-patterns and “AI-template look” rejection rules.

Suggested locations may include `design/materials/` and a compact runtime-readable registry. Exact filenames are implementation detail.

### Boundaries

- no AI Core runtime dependency in the employee ZIP;
- do not import entire SGDS / vendor repos;
- do not copy unreviewed third-party raw assets or toolchains;
- preserve source / license provenance for any external material actually copied;
- do not expand this card into a generic design system.

### Acceptance

- PPTSKILL can compile a visual-route candidate from its own portable material snapshot;
- the route contract contains more than palette/font/radius: it must include at least `coverArchetype`, `graphicLanguage`, `visualAnchor`, `typePersonality`, `density`, `surfaceLanguage`, `assetTreatment`, and `motionPersonality` or equivalent fields;
- existing token-safety behavior is unchanged;
- no full HTML is generated by the LLM as the style contract.

---

## P0-VQ2 — Style-candidate renderer + rendered-diversity repair

**Priority:** P0 / OWNER VISUAL GATE / BLOCKS P0-VQ3 AND P0-R7  
**Goal:** make the four-cover selection feel like genuinely different design directions rather than one skeleton with cosmetic variations.

### Code targets

Primary existing surfaces:

- `runtime/style-candidates.js`
- `fixtures/style-candidates.json`
- `tests/p0-r3-style-candidates.test.mjs`
- `evidence/p0-r3/`

New small modules are allowed where they reduce monolithic hard-coded markup, e.g. cover archetype registry / title-fit helper / structural signature helper.

### Required repair

1. Remove the assumption that all cover routes share one `8fr / 4fr` copy + right-panel skeleton.
2. Different cover archetypes must own genuinely different structural renderers.
3. The three AI candidates must use three different primary cover archetypes in the acceptance fixture.
4. Every candidate must have an explicit visual anchor, not merely an empty surface rectangle.
5. Add deterministic / bounded graphic primitives where useful: typography motif, rule system, SVG diagram/network, large folio/number, geometric field, brand device, data-shaped graphic. These do not require image generation.
6. Do not insert claim-bearing hard-coded demo copy such as `DECISION`, `DELIVERY`, `STORY`, `INPUT / STRUCTURE / STYLE / HTML` unless that copy is actually part of the approved deck content. Decorative folio / neutral non-semantic tokens are allowed.
7. Add Chinese title-fit / orphan protection. Avoid 1–2 Chinese characters stranded on a final line when a safe layout / width / type-size adjustment can prevent it.
8. Preview must render as a 16:9 stage that scales to the browser viewport without clipping while preserving the 1600×900 design coordinate system.
9. Company Style remains explicitly `fixtureOnly` until P1-R9. Do not pretend the synthetic company fixture is a real brand-quality result.

### Rendered structural diversity gate

The current StyleSpec-field-count validator is necessary but insufficient.

Add a structural signature / validator using fields such as:

- `coverArchetype`
- hero / copy placement model
- primary alignment model
- visual-anchor type
- dominant region ratio / negative-space strategy
- graphic language
- type personality
- surface system

A candidate pair must fail if it produces the same primary skeleton with only palette, font, radius, or density changes.

### Human quality gate

Geometry PASS is not visual-quality PASS.

Before this card can be COMPLETE:

- render the same approved title/subtitle/identity through Company fixture + 3 AI routes;
- capture a four-cover montage / individual screenshots;
- geometry / clipping checks must pass;
- **owner human approval of the three AI route screenshots is required**;
- receipt must separately record `functional_gate`, `geometry_gate`, and `owner_visual_gate`.

Do not mark the card complete merely because automated tests pass.

### Minimum acceptance

- three AI routes are immediately distinguishable in grayscale / without relying on palette alone;
- no pair is essentially “left title + right vertical card” with cosmetic differences;
- same content is reused across all four previews;
- no extra full-deck generation is performed;
- Chinese sample title `讓每個人用 AI 快速完成簡報` renders without an avoidable orphan line;
- viewport-fit proof exists at a normal laptop browser viewport;
- `pnpm test` and geometry checks remain green.

---

## P0-VQ3 — Full-deck visual vocabulary repair

**Priority:** P0 / BLOCKS P0-R7  
**Goal:** preserve the semantic primitive architecture while giving slides enough validated composition variants to avoid a repetitive engineering-template look.

### Preserve

- `runtime/composition-primitives.js`
- `runtime/full-deck-renderer.js`
- CompositionSpec-only layout changes;
- direct edit targets;
- geometry hard gate;
- StyleSpec as the deck-wide visual world.

### Required repair

- keep the existing seven semantic primitives; do not replace them with arbitrary HTML;
- allow multiple validated visual variants for important primitives rather than one renderer per primitive;
- variants must meaningfully change hierarchy / spatial composition, not only colors;
- make StyleSpec influence more than palette: typography hierarchy, surface/line/shape language, visual anchor treatment, rhythm, image treatment and motion;
- avoid making cards / boxes the default answer to every content shape;
- keep image/table generation opt-in as already locked;
- support “換一個排版” as variant / CompositionSpec change with unchanged content hash.

### MVP variant coverage

At minimum, the acceptance fixture must prove multiple variants across these high-frequency roles:

- cover;
- title + points / explanation;
- split / comparison / proof;
- metric / evidence;
- process / sequence;
- component / image focus.

The exact total number of variants is not authority; visible composition diversity and maintainability are.

### Acceptance

- one Style rendered across a multi-slide deck still feels like one visual world but does not repeat the same geometry every page;
- a second contrasting Style produces a genuinely different visual language without changing slide content;
- content hash remains stable for composition-only changes;
- all tested variants pass P0-R6 geometry QA;
- no free x/y drag or unbounded arbitrary HTML is introduced;
- owner reviews a representative full-deck montage before this card is marked complete.

---

# 5. Existing backlog after visual repair

## P0-R7 — Direct editor + portable export repair

**Priority:** P0  
**Status:** BLOCKED BY P0-VQ1～P0-VQ3  
**Goal:** keep the existing HTML editor while making edits DeckSpec-safe and export share-safe.

Requirements:

- direct text edit;
- supported component edit;
- image replacement;
- reorder / duplicate / delete;
- save new HTML;
- local AI patch of a specific slide / region;
- no free x/y dragging;
- Presenter Mode removed;
- export rehydrates sanitized DeckSpec;
- export contains no forbidden working-context data.

Acceptance:

- edit/save/reopen preserves changes;
- recipient AI can parse DeckSpec from only `deck.html`;
- negative sanitizer fixtures prove profile/path/source-document/prompt data does not leak.

---

## P1-R8 — Local personal profile + ZIP distribution

**Priority:** P1 before distribution

Profile:

- local optional config outside versioned install dir;
- explicit save only;
- maximum one natural save-preference reminder per deck;
- no project/client/deck data;
- missing profile is normal.

ZIP:

- one shared core;
- Codex / Claude Code / Gemini CLI thin adapters;
- installer / updater / uninstaller;
- smoke / capability probe after install;
- upgrade preserves profile;
- employee does not need Git.

---

## P1-R9 — Company PPTX → Company Style Pack

**Priority:** P1 / OWNER ASSET REQUIRED  
**Blocker:** real company PPTX not yet supplied to this project.

Convert the one company PPTX into a reviewed Company Style Pack covering palette roles, fonts/fallbacks, identity placement, spacing/geometry, representative cover/content compositions, chart/table/shape language where present, and compatible HTML motion language.

Do not build a generic PPTX importer. Presenton Template V2 remains an architectural donor only.

---

## P1-R10 — Asset optimizer / single-file size guard

**Priority:** P1 before release

- downscale/compress raster images for actual presentation use;
- preserve SVG/vector where practical;
- no large inline video;
- warn/degrade oversized GIF/media;
- report final HTML size and warning threshold;
- no central asset service.

---

## P0-R11 — End-to-end MVP acceptance / ZIP release

**Priority:** P0 RELEASE GATE  
**Depends on:** P0-VQ1～VQ3, P0-R1～R7, P1-R8, P1-R10; P1-R9 required for the real Company Style slot.

E2E must prove:

1. fresh supported CLI installs ZIP;
2. user supplies materials;
3. Grill Me does not re-ask known facts;
4. ≤15-slide outline with title + subtitle + 3–5 points per slide;
5. human approves outline;
6. Company + 3 visually distinct dynamic covers render;
7. human selects Style;
8. optional sample-first or direct bounded build;
9. full generation remains bounded;
10. slides use varied compositions within one coherent Style;
11. geometry gate reports no accidental collision / overflow / off-canvas;
12. direct editing and save-as-new HTML work;
13. composition-only patch preserves content hash;
14. export sanitizer passes;
15. recipient can open HTML offline and compatible AI can parse embedded DeckSpec;
16. file-size guard reports status;
17. optional profile reminder appears at most once;
18. **visual-quality receipt includes owner-approved cover and representative full-deck screenshots, separate from geometry PASS.**

---

# 6. Prior-art / reuse map

| Source | Classification | Reuse | Do not absorb |
|---|---|---|---|
| AI Core `frontend-design-gate` | ADAPT | Visual Route Contract, visual-first direction, typography / density / asset / anti-pattern decisions | AI Core runtime dependency |
| AI Core `sgds-frontend-materials` | ADAPT | reviewed visual materials, component / layout / motion guidance | full vendor tree / installer / unrelated UI runtime |
| AI Core `ppt-authoring` | ABSORB | semantic spec separation, approval-gate and QA lessons | PPTX renderer as canonical output |
| AI Core token-efficiency | ABSORB | progressive disclosure, bounded context, local patch | AI Core global workflow dependency |
| AI Core browser acceptance | ADAPT | real browser evidence, geometry / viewport proof | unrelated forensics preload |
| AI Core `grill-me` | ADAPT | one-question loop, suggested answer, do-not-reask-known-info | project-state ownership outside PPTSKILL |
| Presenton / Template V2 | ABSORB | outline/template split, schema hydration, compact slide retrieval, one-time template certification | full backend / DB / cloud proxy / installer |
| Current PPTSKILL P0-R1/R2/R4/R6 | DIRECT REUSE | contracts, outline, token guard, geometry QA | rewrite without evidence |
| Current PPTSKILL P0-R3/R5 | REPAIR | keep contracts / primitives, repair rendered visual quality | claiming old screenshots are visually accepted |

---

# 7. Do-not-build list

Do not open MVP cards for:

- central AI service / SaaS manager / account / ACL / DRM / publisher;
- company knowledge retrieval / Drive / Jira ingestion;
- real-time co-editing;
- PPTX export;
- generic PPTX importer;
- Canva-style freeform canvas;
- Presenter Mode;
- automatic long-term learning from every choice;
- four full-deck style generations;
- default decorative image/table generation;
- fixed-layout-only slide system;
- arbitrary unbounded per-slide HTML/CSS;
- a second renderer architecture that bypasses DeckSpec / CompositionSpec;
- weakening collision/overflow QA to gain visual freedom.

---

# 8. Next action

**NEXT = P0-VQ1.**

Implementation order is fixed until owner visual acceptance:

1. `P0-VQ1` — adapt the existing AI Core frontend-design / material knowledge into a small portable PPTSKILL design-material layer.
2. `P0-VQ2` — repair style candidates so the three AI covers are structurally distinct, laptop-safe, Chinese-title-safe, and owner-approved.
3. `P0-VQ3` — expand full-deck visual variants without changing semantic contracts or weakening geometry QA.
4. Only then resume `P0-R7`.

Do not spend the next iteration polishing the current four screenshots with only palette, padding, shadows, or radius tweaks. The accepted repair must change the rendered design vocabulary while preserving the completed architecture.