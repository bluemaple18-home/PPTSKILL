# PPTSKILL Backlog

**Updated:** 2026-09-09

**Status:** `P1-R8-A COMPLETE`；current frontier = `P1-R8-B`
**Authority:** This file is the execution queue. `working-spec.md` remains the product / requirement authority. Historical implementation details remain in Git history and `evidence/` receipts.

---

# 0. Current owner verdict

The 2026-09-06 implementation commit `cc7185620c4c0b979d1461c445bac03f8aed3708` completed the contract / runtime path through geometry QA, but the owner rejected the current rendered style candidates as visually too primitive.

The 2026-09-08 owner calibration also screened a broad cross-industry set of **real presentation cover/title slides**. The accepted and rejected examples show that the target is **not** an industry-template catalog. The reusable asset is a presentation design grammar: composition, hierarchy, typography, negative space, image integration, visual anchors, graphic language, component treatment and restrained motion/effects. PPTSKILL should learn the design logic behind accepted references rather than copy a small set of templates.

The 2026-09-09 Owner Visual Review accepted `P0-VQ2-R1` at commit `26859a6ad5435334aa6b63f7e64615579404af18`. This closes the Q2 blocker: the covers have crossed the engineering-demo / fake-anchor / same-layout-different-color failure state. It does **not** claim the owner ideal-quality ceiling has been reached. `graphic-brand-field / modular-brand-rhythm` remains a non-blocking weak-pass refinement target.

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
- `P0-R3`: **FUNCTIONAL CONTRACT COMPLETE / VISUAL ACCEPTANCE PASS VIA P0-VQ2-R1**.
- `P0-R4`: COMPLETE — keep.
- `P0-R5`: **ARCHITECTURE COMPLETE / VISUAL VOCABULARY REPAIR REQUIRED**.
- `P0-R6`: COMPLETE — keep geometry gate.
- `P0-R7`: **COMPLETE — direct editor / portable export gates pass**.

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

## Images / tables / motion / component effects

- Do not proactively generate images or tables just to decorate a slide.
- User-provided materials first.
- Generate image / table only when the user explicitly asks.
- Motion and component effects may follow Style automatically and must remain coherent across the deck.
- Effects are part of the visual grammar, not a separate random decoration pass. They must be selected from reviewed, bounded treatments based on Style + semantic role.
- A slide must remain visually acceptable in its static/resting state. Motion must never be required to rescue a weak composition.
- Prefer deterministic CSS / Web Animations / reviewed animation helper; support reduced motion.
- Motion/effects must not introduce layout shift, clipping, overlap, off-canvas content or hidden information in the final/resting or reduced-motion state.
- Avoid continuous ambient loops, particles, gratuitous parallax, bouncing, heavy glow/HUD treatments or per-element random animation.

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

Latest owner-reviewed implementation basis: `26859a6ad5435334aa6b63f7e64615579404af18`.

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

## Resolved cover P0-R3 visual surface

### P0-R3 / P0-VQ2 — completion state

**Functional evidence exists:** `evidence/p0-r3/style-gate-receipt.md`

Completion facts:

- independent archetype renderers replace the shared cover skeleton;
- Information Led uses real subtitle semantics rather than a fake network;
- Typography Hero uses content-derived type anchors rather than a fixed `01 + bar` recipe;
- Graphic Brand Field uses bounded modular cadence rather than a fixed orbit;
- structural diversity uses renderer-level spatial profiles rather than StyleSpec token counts or DOM vocabulary;
- functional, structural-diversity, geometry and Owner Visual gates pass;
- Owner ideal-quality ceiling remains explicitly unreached;
- `graphic-brand-field / modular-brand-rhythm` is `WEAK PASS / FUTURE REFINEMENT TARGET`, nonblocking for P0-VQ3.

**Evidence:** `evidence/p0-vq2-r1/composition-semantics-repair-receipt.md`

## Current visual repair surface

### P0-R5 — current problem

**Architecture evidence exists:** `evidence/p0-r5/full-deck-renderer-receipt.md`

Keep the seven semantic primitives and DeckSpec-safe rendering path, but the current renderer uses a narrow engineering visual vocabulary: generic cards, lists, split panels, grids and shared type scales. The current `runtime/motion-primitives.js` is also largely a generic entrance system applied by CSS selectors. The repair must expand validated visual variants and style-coupled effect vocabulary without replacing semantic primitives with arbitrary HTML or random per-element animation.

---

# 3. Current frontier

**STOP P0-R7.**

Current execution order:

```text
P0-R0/R1/R2/R4/R6 complete
        ↓
P0-R3 functional + cover visual acceptance complete
        ↓
P0-VQ1 Portable design materials + Golden Design Grammar ✓
        ↓
P0-VQ2 Style candidate renderer + diversity/effect repair ✓
        ↓
P0-VQ3 Full-deck visual + component-effect vocabulary repair ← CURRENT FRONTIER
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

P0-VQ2 owner approval is complete. Do not continue P0-R7 until P0-VQ3 proves full-deck visual-world extension while preserving geometry safety.

---

# 4. Visual-quality repair lane

## P0-VQ1 — Portable design materials + Golden Design Grammar

**Priority:** P0 / BLOCKS P0-VQ2  
**Status:** COMPLETE

**Evidence:** `evidence/p0-vq1/design-grammar-receipt.md`, `evidence/p0-vq1/motion-baseline-receipt.md`
**Goal:** make the existing AI Core frontend-design knowledge plus owner-screened presentation references materially available to PPTSKILL without making AI Core or any external template library a runtime dependency.

### Source scope

Review / adapt from the current AI Core sources already identified by this project:

- `skills/frontend-design-gate/SKILL.md`
- `skills/sgds-frontend-materials/SKILL.md`
- relevant reviewed references for visual route, typography, layout rhythm, visual polish, component geometry, motion personality and anti-patterns;
- the 2026-09-08 owner-screened cross-industry **Golden Cover Library** calibration from real presentation cover/title-slide references.

### Golden reference intake rules

The Golden Cover Library is design evidence, not a runtime template pack.

- only use real presentation cover / title-slide references for cover calibration; reject brand photos, generic hero images, template mosaics, slide-collage previews and mockups that do not prove a usable cover composition;
- deliberately sample across industries so the grammar does not collapse into “finance template / medical template / automotive template” taxonomy;
- owner acceptance/rejection is the visual-quality signal; do not replace it with an automated aesthetic score;
- preserve source URL / creator / license provenance for external references when recorded;
- do not package third-party imagery or template assets into PPTSKILL unless separately licensed; derive composition rules, not copied artwork;
- references may seed archetypes, but archetypes must remain reusable across topics and industries.

### Golden Design Grammar v1

Create a portable grammar derived from accepted references. Initial cover-archetype seeds include, but are not limited to:

- `typography-hero` — title / type is the dominant visual anchor;
- `full-bleed-editorial` — image and text form one full-stage composition;
- `architectural-negative-space` — strong spatial/photographic negative space with restrained information;
- `image-type-asymmetry` — image and type use an intentionally unequal spatial relationship rather than a default 50/50 split;
- `graphic-brand-field` — geometry, rule system or brand device creates the main field;
- `object-product-hero` — one object/product/building/device is the visual anchor;
- `dark-premium-editorial` — dark high-contrast world without generic tech-gradient/HUD treatment;
- `information-led-cover` — diagram/data-shaped graphic is the anchor while the page still reads as a cover, not a dashboard;
- `cropped-type-image` — deliberate oversized crop / off-stage tension while preserving legibility and safe geometry;
- `minimal-institutional` — very few elements carried by grid, typography, proportion and spacing.

This list is a seed vocabulary, **not ten fixed templates**. Implementers may merge / split / rename archetypes when owner evidence supports it.

The grammar / route registry should represent at least:

- `coverArchetype`;
- `titlePlacement` / hero-copy placement model;
- `visualAnchor`;
- `imageTreatment` / asset treatment;
- `typePersonality` and role pairing;
- `negativeSpaceStrategy`;
- `dominantRegionRatio`;
- `graphicLanguage`;
- `surfaceLanguage` / line / shape language;
- `density`;
- `effectLanguage` / component treatment;
- `motionPersonality`;
- explicit anti-patterns.

### Component-effect + motion grammar

Motion/effects must be authored as a small reusable vocabulary tied to the selected Style and component role, not assigned randomly to individual DOM nodes.

The portable material layer should define reviewed treatments such as, or equivalent to:

- static/component treatments: masked crop, hard rule, outlined surface, controlled soft depth, hard-cut field, editorial frame, brand-device accent, monochrome/duotone image treatment;
- entrance/reveal treatments: restrained fade-rise, mask reveal, rule draw, image zoom-settle, staggered sequence, SVG/diagram trace;
- emphasis treatments: metric/folio emphasis, progressive process reveal, focal image settle;
- a `none` / static personality must remain first-class.

Rules:

- effect choice is derived from Style + semantic role (`title`, `visualAnchor`, `metric`, `process`, `image`, `diagram`, `supportingCopy`, etc.);
- use at most a small bounded set of primary effect families per slide; one hero treatment plus one supporting treatment is usually enough;
- effect differences do **not** count as structural diversity by themselves;
- final/resting geometry must equal the geometry-validated composition; transforms/reveals must not move layout boxes;
- reduced-motion mode must immediately expose all content and preserve the same final hierarchy;
- avoid infinite loops, particles, bouncing, gratuitous 3D, parallax, heavy blur/glow, sci-fi HUD, or animation whose only purpose is to look “AI fancy”;
- effects must never add claim-bearing text or hide information needed to understand the slide.

### Required output

Create a small portable PPTSKILL design-material layer containing only the pieces needed for presentation design, including:

- Golden Design Grammar v1 / cover archetype catalog;
- typography personalities / role pairings;
- information-density patterns;
- graphic-language families;
- visual-anchor types;
- surface / line / shape language;
- image-treatment rules;
- component-effect / effect-language families;
- motion personalities and semantic role mappings;
- negative-space / dominant-region patterns;
- anti-patterns and “AI-template look” rejection rules.

Suggested locations may include `design/materials/`, a small human-readable Golden Reference index, and a compact runtime-readable registry. Exact filenames are implementation detail.

### Boundaries

- no AI Core runtime dependency in the employee ZIP;
- do not import entire SGDS / vendor repos;
- do not copy unreviewed third-party raw assets or toolchains;
- preserve source / license provenance for any external material actually copied;
- do not expand this card into a generic design system;
- do not turn accepted reference slides into pixel-copied templates.

### Acceptance

- PPTSKILL can compile a visual-route candidate from its own portable material snapshot;
- the route contract contains more than palette/font/radius: it must include at least `coverArchetype`, `graphicLanguage`, `visualAnchor`, `typePersonality`, `density`, `surfaceLanguage`, `assetTreatment`, `effectLanguage`, and `motionPersonality` or equivalent fields;
- at least the seed archetype families are represented by reusable grammar rather than a single shared grid skeleton;
- an effect/motion registry can resolve treatments by Style + semantic role without arbitrary LLM-authored CSS;
- static / reduced-motion rendering remains complete and visually intentional;
- existing token-safety behavior is unchanged;
- no full HTML is generated by the LLM as the style contract.

---

## P0-VQ2 — Style-candidate renderer + rendered-diversity/effect repair

**Priority:** P0

**Status:** COMPLETE VIA P0-VQ2-R1

**Owner verdict:** Visual Gate PASS / ideal-quality ceiling not yet reached

**Evidence:** `evidence/p0-vq2-r1/composition-semantics-repair-receipt.md`
**Goal:** make the four-cover selection feel like genuinely different design directions rather than one skeleton with cosmetic variations, while giving each route a coherent restrained effect treatment.

`graphic-brand-field / modular-brand-rhythm` is a `WEAK PASS / FUTURE REFINEMENT TARGET`. Do not reopen a blocking Q2 polish card. Reassess it only after VQ3 provides full-deck visual-world evidence.

### Code targets

Primary existing surfaces:

- `runtime/style-candidates.js`
- `runtime/motion-primitives.js`
- `fixtures/style-candidates.json`
- `tests/p0-r3-style-candidates.test.mjs`
- `evidence/p0-r3/`

New small modules are allowed where they reduce monolithic hard-coded markup, e.g. cover archetype registry / title-fit helper / structural signature helper / effect-role registry.

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
10. Replace the current generic selector-driven “everything fades/rises similarly” behavior with route-aware effect resolution from `effectLanguage` / `motionPersonality` + semantic roles.
11. Cover effects may animate type, rules, masks, images, diagrams or brand devices, but must preserve the approved static composition and final geometry.
12. Each route must still look intentionally designed with motion disabled; motion is enhancement, not the differentiator that makes the route acceptable.

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

A candidate pair must fail if it produces the same primary skeleton with only palette, font, radius, density, motion or effect changes. **Effect/motion differences must never satisfy the structural-diversity gate.**

### Human quality gate

Geometry PASS is not visual-quality PASS.

Before this card can be COMPLETE:

- render the same approved title/subtitle/identity through Company fixture + 3 AI routes;
- capture a four-cover montage / individual static screenshots;
- geometry / clipping checks must pass in the final/resting state;
- verify motion-on and `prefers-reduced-motion` behavior on representative routes;
- **owner human approval of the three AI route screenshots is required**;
- motion/effects must be judged separately from the static cover; a rejected static cover cannot pass because its animation looks good;
- receipt must separately record `functional_gate`, `geometry_gate`, `owner_visual_gate`, and representative `effect_motion_gate` evidence.

Do not mark the card complete merely because automated tests pass.

### Minimum acceptance

- three AI routes are immediately distinguishable in grayscale / without relying on palette alone;
- no pair is essentially “left title + right vertical card” with cosmetic differences;
- same content is reused across all four previews;
- no extra full-deck generation is performed;
- Chinese sample title `讓每個人用 AI 快速完成簡報` renders without an avoidable orphan line;
- viewport-fit proof exists at a normal laptop browser viewport;
- final/resting geometry is identical whether motion is enabled or reduced;
- all content is visible and legible under reduced motion;
- `pnpm test` and geometry checks remain green.

---

## P0-VQ3 — Full-deck visual + component-effect vocabulary repair

**Priority:** P0 / BLOCKS P0-R7  
**Status:** COMPLETE — S1 / S2 / S3 / CP-VQ3 PASS
**Goal:** preserve the semantic primitive architecture while giving slides enough validated composition and component-effect variants to avoid a repetitive engineering-template look.

### Art-direction guidance

Do not add schema fields as a proxy for visual quality. Mature the path in this order:

```text
Golden References
→ Art Direction Rules
→ Bounded Variants
→ Owner Visual Regression
```

Reviewed variants may control title-scale relationship, Chinese text occupancy, line-break aesthetics, optical alignment, asymmetric proportion, visual weight, focal-point strength, edge-crop intensity, negative-space tension, title/subtitle/identity relationship, line rhythm, repetition density, graphic-device maturity, palette-area ratio, foreground/background relationship and anchor semantic strength. These remain bounded design decisions, not freeform LLM CSS.

A bounded art-direction intent such as `high-tension + title-dominant + single-edge-bleed + low-density` may be explored only where VQ3 evidence proves a need. Do not design a large new schema before the variants are validated on full-deck content.

### Visual-vocabulary guardrails

1. Generic cards are not the default answer.
2. Three bullets do not automatically become three cards.
3. A process does not automatically become five arrow boxes.
4. Metrics do not automatically become three KPI columns.
5. Every visual anchor must be supported by content semantics or the selected Style grammar.
6. Typography may carry a visual role.
7. One Style may use multiple composition geometries.
8. Different slides must remain recognizably inside one visual world.
9. Motion cannot rescue weak static composition.
10. Reduced-motion and static screenshots must remain complete.

### Golden Visual Regression policy

Maintain a long-term human-reviewed set sourced only from Owner-accepted Golden Covers and later Owner-approved PPTSKILL outputs. It is a comparison set, not a pixel-matching snapshot suite. Each review records at least hierarchy, composition tension, negative space, typography maturity, visual-anchor quality, semantic relevance, visual weight, palette-area balance, template smell and overall presentation-slide maturity.

Automated tests and geometry checks may prevent regressions but cannot issue a visual-quality PASS. Owner visual verdict remains the final authority. Add outputs to this set only after explicit Owner approval; do not treat every generated slide as Golden evidence.

### Minimum verifiable execution plan

#### VQ3-S1 — One-style visual-world extension

- **status:** COMPLETE / OWNER VISUAL GATE PASS
- **selected_style:** Typography Hero / `route-editorial-rail`
- **evidence:** `evidence/p0-vq3/s1/typography-world-receipt.md`, `evidence/p0-vq3/s1/typography-world-montage-1280x720.png`, `evidence/p0-vq3/s1/geometry.json`
- **repair_scope:** preserve 01/04/05/06/08；art-direction repair only for 02/03/07/09/10；keep warm-white / near-black / vermilion palette；do not start S2/S3.
- **traces_to:** US-001, US-003; FR-001, FR-003; SC-001, SC-004
- **depends_on:** P0-VQ2-R1 COMPLETE
- **blocking_edges:** none; this is the current frontier.
- **input → output:** one accepted Q2 Style + one representative 8–12-slide DeckSpec → a static full-deck HTML, slide-contact-sheet screenshot and geometry receipt.
- **scope:** reuse the seven semantic primitives; add only the smallest reviewed composition variants needed to prevent repeated geometry and card-grid defaults.
- **acceptance:** cover and content pages form one visual world; at least title+points, split/proof, metric/evidence, process/sequence and component focus demonstrate nonrepetitive geometry; no arbitrary HTML/CSS.
- **verification:** content hash, static render, 1600×900 + 1280×720 geometry, console/network/pageerror and owner contact-sheet review.
- **likely_files:** `runtime/composition-primitives.js`, `runtime/full-deck-renderer.js`, focused fixtures/tests, `evidence/p0-vq3/`.
- **TDD:** renderer/contract behavior yes; visual tuning uses screenshot evidence.

#### VQ3-S2 — Contrasting-style portability

- **status:** COMPLETE / OWNER VISUAL GATE PASS
- **evidence:** `evidence/p0-vq3/s2/information-led-receipt.md`, `evidence/p0-vq3/s2/paired-style-comparison.png`
- **traces_to:** US-001, US-003; FR-001, FR-002, FR-003; SC-001, SC-002
- **depends_on:** VQ3-S1 PASS.
- **blocking_edges:** do not start until S1 establishes a coherent first visual world.
- **input → output:** the exact same DeckSpec content + a contrasting accepted Q2 Style → second full-deck render and paired comparison sheet.
- **acceptance:** content hash and slide IDs remain unchanged; typography, surface/line/shape, anchor and palette-area behavior differ materially without creating another brand per slide.
- **verification:** deterministic content-hash test, paired static screenshots, dual-viewport geometry and owner comparison verdict.
- **likely_files:** same renderer seam as S1; no second renderer architecture.
- **TDD:** contract/hash behavior yes; visual tuning uses screenshot evidence.

#### VQ3-S3 — Bounded effect and Golden Visual Regression proof

- **status:** COMPLETE / AUTOMATED + BROWSER + REDUCED MOTION + OWNER MOTION GATES PASS
- **evidence:** `evidence/p0-vq3/s3/motion-effect-receipt.md`, `evidence/p0-vq3/s3/golden-visual-regression-review.md`
- **traces_to:** US-002, US-003; FR-002, FR-003; SC-001, SC-002
- **depends_on:** VQ3-S1 PASS; may run after or together with S2 only if it edits no shared renderer surface.
- **blocking_edges:** static S1 composition must pass before motion/effects are evaluated.
- **input → output:** accepted static variants + existing effect/motion grammar → representative motion-on/reduced-motion receipts and a Golden Visual Regression review sheet.
- **acceptance:** one title, metric/evidence, process/sequence, component/image-focus and diagram/rule role show coherent bounded treatments; resting geometry is identical; owner review records hierarchy, composition tension, negative space, typography maturity, anchor quality, semantic relevance, visual weight, palette-area balance, template smell and overall slide maturity.
- **verification:** browser receipts with pre-navigation listeners, static/reduced/motion comparison, `pnpm test`, `git diff --check`, Owner Visual Gate.
- **likely_files:** `runtime/motion-primitives.js`, `runtime/full-deck-renderer.js`, focused tests, `evidence/p0-vq3/`.
- **TDD:** effect routing and resting geometry yes; visual verdict remains human authority.

**Checkpoint CP-VQ3:** after S1–S3, rebuild both styles from the same DeckSpec, rerun all deterministic/browser gates and present one static comparison artifact to Owner. P0-VQ3 remains incomplete until this checkpoint passes.

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
- make StyleSpec influence more than palette: typography hierarchy, surface/line/shape language, visual anchor treatment, rhythm, image treatment, component effects and motion;
- add role-aware effect variants for common elements such as title/eyebrow, rules, metric emphasis, process sequence, image/asset reveal, diagram trace and supporting-copy stagger;
- effect mappings must remain coherent with the deck Style; do not independently randomize effects per slide or element;
- prefer one dominant effect treatment plus at most one supporting family per slide unless a reviewed archetype explicitly requires more;
- avoid making cards / boxes the default answer to every content shape;
- keep image/table generation opt-in as already locked;
- support “換一個排版” as variant / CompositionSpec change with unchanged content hash;
- composition-only changes must not silently mutate the underlying content or route into arbitrary custom CSS;
- tables/charts/data must remain readable immediately in reduced-motion/static mode; do not require staged animation to decode values.

### MVP variant coverage

At minimum, the acceptance fixture must prove multiple variants across these high-frequency roles:

- cover;
- title + points / explanation;
- split / comparison / proof;
- metric / evidence;
- process / sequence;
- component / image focus.

For representative variants, prove matching component-effect behavior for at least:

- title / heading hierarchy;
- one metric / evidence treatment;
- one process / sequence treatment;
- one image / component-focus treatment;
- one diagram / rule / graphic-anchor treatment where present.

The exact total number of variants is not authority; visible composition diversity, effect coherence and maintainability are.

### Acceptance

- one Style rendered across a multi-slide deck still feels like one visual world but does not repeat the same geometry every page;
- a second contrasting Style produces a genuinely different visual language and effect language without changing slide content;
- content hash remains stable for composition-only changes;
- all tested variants pass P0-R6 geometry QA in final/resting state;
- motion-on does not create layout shift or geometry failure, and reduced-motion reveals the complete final slide immediately;
- a representative full-deck motion/effect pass shows consistent timing and role treatment rather than every component doing the same entrance;
- the static montage remains owner-acceptable with all motion disabled;
- no free x/y drag or unbounded arbitrary HTML is introduced;
- owner reviews a representative full-deck montage before this card is marked complete.

---

# 5. Existing backlog after visual repair

## P0-R7 — Direct editor + portable export repair

**Priority:** P0  
**Status:** COMPLETE
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

Evidence：`evidence/p0-r7/direct-editor-portable-export-receipt.md`、`evidence/p0-r7/browser-editor-acceptance.json`、`evidence/p0-r7/portable-edited-geometry.json`。

---

## P1-R8 — Local personal profile + ZIP distribution

**Priority:** P1 before distribution

### R8-A — Local Profile Isolation

**Status:** COMPLETE

- strict allowlist preferences；missing is normal；explicit remember only；one reminder per deck session；profile stays outside versioned install directory。
- export integration proves zero profile fields／path／content in `deck.html`。
- Evidence：`evidence/p1-r8/a/local-profile-isolation-receipt.md`。

### R8-B — ZIP Distribution Lifecycle

**Status:** NEXT

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

Convert the one company PPTX into a reviewed Company Style Pack covering palette roles, fonts/fallbacks, identity placement, spacing/geometry, representative cover/content compositions, chart/table/shape language where present, and compatible HTML component-effect / motion language.

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
19. representative component effects / motion remain coherent with the selected Style and semantic roles, without layout shift or content mutation;
20. `prefers-reduced-motion` / static mode reveals the complete final composition and remains visually acceptable.

---

# 6. Prior-art / reuse map

| Source | Classification | Reuse | Do not absorb |
|---|---|---|---|
| AI Core `frontend-design-gate` | ADAPT | Visual Route Contract, visual-first direction, typography / density / asset / anti-pattern decisions | AI Core runtime dependency |
| AI Core `sgds-frontend-materials` | ADAPT | reviewed visual materials, component / layout / effect / motion guidance | full vendor tree / installer / unrelated UI runtime |
| Owner-screened Golden Cover Library | ADAPT | composition archetypes, hierarchy, typography, negative space, image integration, visual anchors, anti-template evidence | copied third-party templates / raw assets / industry-template taxonomy |
| AI Core `ppt-authoring` | ABSORB | semantic spec separation, approval-gate and QA lessons | PPTX renderer as canonical output |
| AI Core token-efficiency | ABSORB | progressive disclosure, bounded context, local patch | AI Core global workflow dependency |
| AI Core browser acceptance | ADAPT | real browser evidence, geometry / viewport proof | unrelated forensics preload |
| AI Core `grill-me` | ADAPT | one-question loop, suggested answer, do-not-reask-known-info | project-state ownership outside PPTSKILL |
| Presenton / Template V2 | ABSORB | outline/template split, schema hydration, compact slide retrieval, one-time template certification | full backend / DB / cloud proxy / installer |
| Current PPTSKILL P0-R1/R2/R4/R6 | DIRECT REUSE | contracts, outline, token guard, geometry QA | rewrite without evidence |
| Current PPTSKILL P0-R3/R5 | REPAIR | keep contracts / primitives, repair rendered visual + effect quality | claiming old screenshots are visually accepted |

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
- weakening collision/overflow QA to gain visual freedom;
- random per-element animation generation;
- motion/effect systems that only change palette/glow/blur without improving hierarchy;
- particles, infinite ambient loops, gratuitous parallax/3D/HUD effects or other presentation gimmicks as default visual vocabulary;
- using animation to hide a weak static composition.

---

# 8. Next action

**NEXT = P1-R8-B — ZIP Distribution Lifecycle.**

Implementation order is fixed until full-deck owner visual acceptance:

1. `P0-VQ1` — COMPLETE.
2. `P0-VQ2 / R1` — COMPLETE; Owner Visual Gate PASS, ideal-quality ceiling not yet reached.
3. `P0-VQ3-S1 / R1` — COMPLETE；Typography Hero 10-page visual world 已通過 Owner Visual Gate。07 giant numeral 與 10 content-derived edge word 為非阻擋 refinement notes。
4. `P0-VQ3-S2` — COMPLETE；Information Led 已通過 Style Portability 與 Owner Visual Gate。technical rail、matrix、transition variants 為非阻擋 refinement notes。
5. `P0-VQ3-S3` — COMPLETE；Automated、Browser、Reduced Motion、Owner Motion Gates PASS。`hard-cut-field` 快速、克制為非阻擋 refinement guardrail。
6. `CP-VQ3` — COMPLETE；解除 `P0-R7` blocker。
7. `P0-R7` — COMPLETE；direct edit、supported component edit、image replacement、slide management、bounded local AI patch、sanitized save/reopen 與 dual-viewport geometry 全部通過。
8. `P1-R8-A` — COMPLETE；local optional profile isolation 與 export integration PASS。
9. `P1-R8-B` — NEXT；one shared core + three thin adapters + ZIP lifecycle。

Do not reopen Q2 for cosmetic polish. VQ3 may feed evidence-backed refinements back into Q2 grammar, but must not restart the Q2 architecture rewrite or add a blocking Q2 polish card.

S2 已證明 Style portability，不得回退成把 Typography Hero 換色冒充另一個 Style。VQ3 後續美術提升只走 Golden Visual Regression，不阻塞 MVP。
