# PPTSKILL Backlog

**Updated:** 2026-09-15

**Status:** MVP CLOSED / RELEASE ARTIFACT RESEALED；`P0-R11-R1` remains COMPLETE；Gemini CLI is trigger-only `UNVERIFIED` until available
**Authority:** This file is the execution queue. `working-spec.md` remains the product / requirement authority. Historical implementation details remain in Git history and `evidence/` receipts.

**Owner-approved planning:** [PGQ-20260914 前期品質強化整合](research/donors/html-slide-builder-oss/pre-generation-integration.md) 將 16 項前期決策去重為 7 個責任區／4 個增量工作包，見第 9 節；[EDX-20260914 Editor Prior Art](research/editor-prior-art.md) 將 8 項後期直接編輯決策收斂為 4 個增量工作包並強制 Prior-Art-First，見第 10 節。全部 NOT STARTED；不代表已安裝能力，不取代本檔 frontier，也不重開以下歷史完成卡。

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

## `P0-R11-R1` — Real AI Entry Enforcement

**Status:** `COMPLETE / RELEASE BLOCKER CLOSED`（S1/S2/S3 COMPLETE；Codex and Claude Code real installed-CLI replay PASS；Gemini UNVERIFIED because CLI unavailable）

- Existing HTML defaults to `restyle-existing` and preserves slide IDs, order and content.
- Content/order mutation requires an exact bounded change set plus explicit human approval.
- ZIP installs one real, discoverable `pptskill` skill for Codex, Claude Code and Gemini CLI.
- S1 deterministic gate, S2 portable lifecycle and S3 real CLI replay pass for every available supported CLI.
- Gemini CLI is unavailable in the acceptance environment and remains explicitly unverified under the deferred-on-availability acceptance rule.
- The R11-R1 blocker is closed and MVP release status is restored; no renderer or visual-quality card is reopened.

Current execution order:

```text
P0-R11-R1 S1 preservation gate ✓
          ↓
P0-R11-R1 S2 skill packaging/lifecycle ✓
          ↓
P0-R11-R1 S3 real installed-CLI replay ✓
          ↓
Current MVP execution queue complete; Gemini replay deferred until supported CLI availability
```

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
9. Company Style 已由 Owner 提供的 PPTX 建立 reviewed candidate；Owner Visual Gate 通過前仍不得標示 Company Style Pack COMPLETE。
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

**Status:** COMPLETE VIA P1-R8-B-R1 / TWO BLIND REVIEWERS PASS

- one shared core + Codex／Claude Code／Gemini thin adapters。
- ZIP fresh install、atomic update／rollback、profile-preserving uninstall、explicit profile purge 與 capability smoke PASS。
- 不依賴 Git／GitHub token；不自動修改 harness dotdir、不下載或登入。
- Evidence：`evidence/p1-r8/b/zip-distribution-receipt.md`、`evidence/p1-r8/b/host-capability-probe.json`。
- 兩名 blind reviewer 於 2026-09-10 均因 reviewer runtime 用量限制在讀取變更前中止，沒有 verdict；不得以自審取代正式 reviewer gate。
- Owner technical review 對 `41bfc39` 提出 deterministic packaging、adapter、destructive guard、smoke 與 update commit-point findings；以 `P1-R8-B-R1` 窄修復處理，R8-A 與既有產品架構不重開。
- R1 final artifact、91 / 91 regression、14 / 14 targeted acceptance 與 lifecycle／distribution 兩名 blind reviewer 均 PASS。

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

**Priority:** P1
**Status:** COMPLETE；OWNER VISUAL GATE PASS（2026-09-10）。

Convert the one company PPTX into a reviewed Company Style Pack covering palette roles, fonts/fallbacks, identity placement, spacing/geometry, representative cover/content compositions, chart/table/shape language where present, and compatible HTML component-effect / motion language.

Do not build a generic PPTX importer. Presenton Template V2 remains an architectural donor only.

---

## P1-R10 — Asset optimizer / single-file size guard

**Priority:** P1 before release
**Status:** COMPLETE — browser-native asset normalization and final UTF-8 size guard share the existing editor/export path.

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
**Status:** COMPLETE / RESEALED — 18/18 release acceptance PASS；117/117 regression PASS；final ZIP SHA-256 `824471ae05ec5ee045f796fbde3da993f4115e5b01c7639bb7c1b44e1b1337fd`。

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

**NEXT = none in the current MVP queue；P0-R11-R1 已關閉 release blocker。Gemini real CLI replay 僅在 supported CLI 可用時補驗，維持 UNVERIFIED，不重開 renderer／視覺卡。**

Implementation order is fixed until full-deck owner visual acceptance:

1. `P0-VQ1` — COMPLETE.
2. `P0-VQ2 / R1` — COMPLETE; Owner Visual Gate PASS, ideal-quality ceiling not yet reached.
3. `P0-VQ3-S1 / R1` — COMPLETE；Typography Hero 10-page visual world 已通過 Owner Visual Gate。07 giant numeral 與 10 content-derived edge word 為非阻擋 refinement notes。
4. `P0-VQ3-S2` — COMPLETE；Information Led 已通過 Style Portability 與 Owner Visual Gate。technical rail、matrix、transition variants 為非阻擋 refinement notes。
5. `P0-VQ3-S3` — COMPLETE；Automated、Browser、Reduced Motion、Owner Motion Gates PASS。`hard-cut-field` 快速、克制為非阻擋 refinement guardrail。
6. `CP-VQ3` — COMPLETE；解除 `P0-R7` blocker。
7. `P0-R7` — COMPLETE；direct edit、supported component edit、image replacement、slide management、bounded local AI patch、sanitized save/reopen 與 dual-viewport geometry 全部通過。
8. `P1-R8-A` — COMPLETE；local optional profile isolation 與 export integration PASS。
9. `P1-R8-B-R1` — COMPLETE；ZIP profile、AI-facing adapter、marker safety、smoke semantics、deterministic build 與 update failure states 已關閉，兩名 blind reviewers PASS。
10. `P1-R9` — COMPLETE；Company Style Pack Owner Visual Gate PASS，兩項 variation guardrail 為非阻擋 note。
11. `P1-R10` — COMPLETE；asset optimizer / single-file size guard，105/105 regression 與 15/15 browser acceptance PASS。
12. `P0-R11` — SUPERSEDED；真實 Claude Code 入口曾揭露 `R11-03` acceptance gap，現由 `P0-R11-R1` closure 補齊。
13. `P0-R11-R1` — COMPLETE；S1 preservation gate、S2 real-skill lifecycle 與 available-CLI S3 replay PASS；Gemini CLI unavailable，維持 UNVERIFIED。

Do not reopen Q2 for cosmetic polish. VQ3 may feed evidence-backed refinements back into Q2 grammar, but must not restart the Q2 architecture rewrite or add a blocking Q2 polish card.

S2 已證明 Style portability，不得回退成把 Typography Hero 換色冒充另一個 Style。VQ3 後續美術提升只走 Golden Visual Regression，不阻塞 MVP。

---

# 9. Owner-approved pre-generation upgrade — PGQ-20260914

**Status:** INCREMENTAL DELIVERY — PGQ-WP1 COMPLETE（Slice 1 + Slice 2）；PGQ-WP2 COMPLETE（Slice 1～4）；PGQ-WP3 COMPLETE（Slice 1～3；無 measured gap 支持 Slice 4）；PGQ-WP4 COMPLETE（Slice 1～4；無 measured gap 支持 Slice 5）；EDX dependency spikes may run，formal editor integration NOT STARTED
**Priority:** AFTER P0-R11-R1 S3 AND EXISTING RELEASE CLOSURE  
**Decision trace and acceptance:** [前期品質強化整合](research/donors/html-slide-builder-oss/pre-generation-integration.md)（PGQ-D01～D16；7 個責任區；4 個工作包）。

本節只補既有主幹的缺口，不新開 16 張 subsystem 卡，不取代以上完成卡或收據。原規格與本次 Owner 目標的衝突詳列在整合文件第 9 節，不能靠改 prompt 靜默放寬。後期直接拖曳／插入／Undo 等 UX 仍保留待後續整合，不混入本節一次重做。

**PGQ-WP1 Slice 1 receipt：** `evidence/pgq-wp1/slice-1-receipt.md`。Pure preflight、既有 Grill 整合、Main/Appendix/Drop allocation 與 optional outline `section` 已完成；portable DeckSpec source/derivation refs 仍依原邊界延後，不視為本 slice 已交付。

**PGQ-WP1 Slice 2 receipt：** `evidence/pgq-wp1-s2/slice-2-receipt.md`。Optional compact claim/source/derivation contract 已完成 schema、sanitizer、renderer、browser editor export、recipient reparse 與 legacy compatibility 閉環；percentage-point 明示 `ratio | percent` scale，模糊輸入 fail loud。

**PGQ-WP2 Slice 1 receipt：** `evidence/pgq-wp2-s1/slice-1-receipt.md`。Generation planner、installed `plan-new`、renderer 與 editor 共用 truthful capability contract；目前只把非負值 `bar` 視為可保真 chart，line／area／pie／donut 與負值 bar 明示 unavailable，不再偷畫成正值 bar-row。語意構圖、Golden reference routing 與跨頁節奏仍待後續 WP2 slices。

**PGQ-WP2 Slice 2 receipt：** `evidence/pgq-wp2-s2/slice-2-receipt.md`。Approved content 現可經 allowlisted semantic signals 產生 bounded ranked CompositionSpec proposals；comparison／sequence／evidence／explanation／asset-led 與 cover／section role 均由 deterministic reason codes 排序，再通過 Slice 1 capability hard filter。Content hash 保持不變；Golden reference routing 與 deck-level rhythm 明確延後至 Slice 3／4。

**PGQ-WP2 Slice 3 receipt：** `evidence/pgq-wp2-s3/slice-3-receipt.md`。Slice 2 available candidates 現依 selected StyleSpec 路由到零至兩筆 Owner-accepted Golden design logic refs；semantic／density／anchor／style match 與 anti-pattern conflict 均有 structured reasons。同一 primitive 可因 Style 不同取得不同 logic，但 rank、primitive 與 content hash 不變；找不到可信 reference 時回 `none`。Deck-level rhythm 仍延後至 Slice 4。

**PGQ-WP2 Slice 4 receipt：** `evidence/pgq-wp2-s4/slice-4-receipt.md`。Slice 2／3 的 available candidates 現可經 allowlisted rhythm signals 產生 plan-only Deck Rhythm Plan；跨頁 composition／Golden logic／anchor 重複、高密度／高證據／高動態 runs、quiet balance 與 narrative roles 均有 deterministic reasons／warnings。Planner 只在 top semantic score 10 分內調整候選，保留 continuity group 的 intentional repetition，並輸出實際 selected CompositionSpec proposal；content hash 不變。至此 PGQ-WP2 COMPLETE。

**PGQ-WP3 Slice 1 receipt：** `evidence/pgq-wp3-s1/slice-1-receipt.md`。WP2 Deck Rhythm Plan 現可透過 allowlisted `motionSignals` 產生 truthful NumberFlow B odometer proposal；pinned `number-flow@0.6.2` 以 deterministic inline IIFE 進同一 renderer/export，CompositionSpec、Node/browser editor、recipient reparse 與 installed ZIP 路徑閉環。Browser editor 與 Node 共用正式 motion semantic validator，非法 animated metric edit 會 fail loud 並 rollback，合法修改會同步 canonical value、NumberFlow target 與 export。Normal replay、reduced-motion、forced-static、offline、20 MiB 與 content integrity 均有真實證據；E Sweep、背景 vocabulary 與 WP4 仍未開始。

**PGQ-WP3 Slice 2 task：** `tasks/pgq-wp3-s2-e-sweep-text-entrance.md`。Frontier 限定為既有 motion seam 上的 bounded title／supporting-copy entrance 與 subtitle underline sweep；背景 runtime/dependency、grouped reveal、WP4 與 EDX formal integration 不在本卡。

**PGQ-WP3 Slice 2 closure receipt：** `evidence/pgq-wp3-s2/slice-2-receipt.md`。`underline-sweep` 已沿 Slice 1 的唯一 motion seam 穿透 planner、CompositionSpec、Node/browser editor、renderer、export/reopen 與 installed Skill/adapters；Repair 1 補上可觀測的完整 replay reset 與 title→subtitle 中間序列，獨立 review GO 後整合。Slice 2 COMPLETE；背景 effects 與後續 slices 仍未開始，整個 WP3 尚未 COMPLETE。

**PGQ-WP3 Slice 3 task：** `tasks/pgq-wp3-s3-background-effects-runtime.md`。Frontier 限定為 truthful background capability、pinned Vanta/Three runtime、Style palette adapter、lifecycle/fallback、offline single-file 與 20 MiB gate；p5 effects 維持 license gate，upstream 未正式展示的 RIPPLE 只有真 browser matrix 通過才可 offered。

**PGQ-WP3 Slice 3 closure receipt：** `evidence/pgq-wp3-s3/slice-3-receipt.md`。11 個 Vanta/Three effects 已通過正式 renderer 單檔 Chrome matrix；CLOUDS2 因缺 pinned texture、TOPOLOGY/TRUNK 因 p5 license gate 維持 unavailable。Planner、CompositionSpec、Node/browser editor、export、真實 recipient Chrome reopen、初始與動態 reduced/static/WebGL fallback、offline ZIP 與 20 MiB gate 已閉環；review repair 關閉 CSS palette、reopen 與 console/network gate findings，獨立 re-review 無新 finding並給出 GO。Slice 3 COMPLETE；不預設新增 Slice 4、WP4 或 EDX。

**PGQ-WP3 completion decision：** G6／PGQ-D04 的 B odometer、E Sweep、truthful background vocabulary、Style mapping、replay/static/reduced/offline/round-trip 均已由 Slice 1～3 閉環；未發現新的 WP3 capability gap。Whole-deck consistency 的剩餘缺口是代表頁與全份 QA，已屬 G7／PGQ-D05/11；因此不為編號另造 Slice 4，也不把 WP2 rhythm 或 WP4 QA 複製進 motion runtime。

**PGQ-WP4 Slice 1 task：** `tasks/pgq-wp4-s1-representative-sample-plan.md`。Frontier 是把目前固定取前 1～2 頁的 `sampleCount` 行為改為 deterministic Typical／Stress plan；只重用既有 composition、Golden、rhythm、motion、background truth。自動 repair、scope-aware feedback、sample persistence／失效與三層 readability 延後至後續 slices。

**PGQ-WP4 Slice 1 closure receipt：** `evidence/pgq-wp4-s1/slice-1-receipt.md`。Planner 已由既有正式 truth 選出 1 張 `both` 或互異的 Typical／Stress，保留 bounded reason codes；`sampleCount=0` 只移除人工等待，不解除 full-deck QA。Direct／installed parity、legacy fallback、single-slide 收斂、deterministic rerun、planner output immutability、WP1～WP4 compatibility、full regression 與 fresh ZIP lifecycle 均 PASS；獨立 review 無 blocking finding並給出 GO。Slice 1 COMPLETE；不預設後續 repair／feedback slice。

**PGQ-WP4 Slice 2 task：** `tasks/pgq-wp4-s2-hard-gate-repair-budget.md`。Frontier 是把 Slice 1 stable sample IDs 與 allowlisted content／geometry／static／animation evidence 接成 pure hard-gate decision，並以 `slideId + issue code` 共用同一個兩次 repair budget。只輸出 `pass | repair | blocked` 與 bounded next action，不自動 mutation；feedback persistence、sample freeze 與 Layer-2/3 判讀仍延後。

**PGQ-WP4 Slice 2 closure receipt：** `evidence/pgq-wp4-s2/slice-2-receipt.md`。`qa-sample` 已將 Representative Sample Plan、完整 allowlisted hard checks、local repair history 與 last-success reference 接成 pure `pass | repair | blocked` gate；NOT_RUN/UNKNOWN fail closed，同 issue 第 1／2 次只回 bounded action，第 3 次前 blocked。Repair 1 補齊 Slice 1 sample role／shape invariant，direct／installed 偽造 role regression 均 fail loud；獨立 re-review 無新 finding並給出 GO。Slice 2 COMPLETE；不預設 feedback／persistence slice。

**PGQ-WP4 Slice 3 task：** `tasks/pgq-wp4-s3-sample-approval-freeze.md`。Frontier 是把 Slice 2 PASS 與 human approval 綁成 deterministic sample freeze，並以 `slide-local | deck-wide | profile-opt-in` 薄規劃回饋及 affected-only invalidation；不執行 mutation／profile write，Layer-2/3 readability 仍延後。

**PGQ-WP4 Slice 3 closure receipt：** `evidence/pgq-wp4-s3/slice-3-candidate-receipt.md`。`approve-sample` 由 packaged Chrome producer 重驗同一 artifact，只在 trusted evidence 與 human approval 後建立 content／composition／style／contract fingerprints；局部內容／構圖變更只使對應樣張失效，Style／contract 變更才使全部樣張失效，非 sample 變更維持 freeze。三種 feedback scope 均為 allowlist plan；profile opt-in 不執行寫入。Repair 1～4 關閉 stale evidence、caller-authored identity 與 visible-content mismatch；managed browser、203/203 full regression、fresh ZIP 與 post-integration independent review 均 PASS。Slice 3 COMPLETE，發布於 `main@e9172136e04209bd762f8e0420475baad29cd0f3`。

**PGQ-WP4 Slice 4 task：** `tasks/pgq-wp4-s4-three-layer-full-deck-qa.md`。Measured gap 是 G7 尚缺 Layer-2 有引用理由的結構／閱讀 advisory、綁定同一 identity 的 Layer-3 Owner confirmation，以及不可由 sample shortcut 的逐頁 full-deck release gate。只重用 Slice 1～3 trusted producer／identity／repair budget／freeze；不新增 QA service、任意 score、自動改文或 renderer primitive。

**PGQ-WP4 Slice 4 closure receipt：** `evidence/pgq-wp4-s4/slice-4-candidate-receipt.md`。`qa-full-deck` 已由 packaged Chrome producer 對每張 canonical slide 建立 Layer-1 coverage；Layer-2 review 必須綁定 current identity 並引用 trusted evidence，Layer-3 human confirmation 與 accepted-risk 亦綁定同一 identity。Sample shortcut、caller-authored PASS／coverage、stale confirmation、無引用 advisory 與 repair-budget reset 均 fail closed。第三次 visibility bypass 後，Owner 授權將 final authority 升級為同 renderer／viewport／DPR／font／final-state 的 canonical-vs-candidate per-target raster signal；computed style／hit-test 只作 precheck。Repair 4 把 normal resting frame納入同一 authority；Repair 5 固定 canonical slide-relative raster coordinates並加入 normalized target-box authority；Repair 6 再以 absolute canonical page clip與 slide page-box authority阻止整張 candidate slide位移時 capture 跟隨。Visibility、contrast、clip、missing identity、normal-only hidden、target transform與slide-root transform probes均精準 fail。Full 211/211、fresh ZIP lifecycle PASS；Codex Native3 independent re-review GO，Slice 4 COMPLETE。

**PGQ-WP4 completion decision：** Slice 1～4 已依序閉環 deterministic Typical／Stress sample、hard gate與共用 repair budget、human approval freeze／scope-aware feedback／affected-only invalidation，以及不可由 sample shortcut 的三層逐頁 full-deck QA。G7／PGQ-D05/D09/D11 已具可重播 evidence；未發現需要 Slice 5 的 measured gap，因此 WP4 COMPLETE。EDX 保持未開始，須另行決策。

| 工作包 | 既有 surfaces / 重用卡 | 本次增量 | 依賴與驗收 |
|---|---|---|---|
| **PGQ-WP1 Preflight / Brief Upgrade** | `grill-outline.js`、`layout-repair-policy.js`、`workflow-entry.js`；R1/R2/R6/R10 | 素材歧義、文案校對、事實／衍生值、來源衝突與 linkage、時間／自讀、Main/Appendix/Drop；合併 D01/07/09/10/12/13/14/15/16 | release closure 後；核心來源衝突會問、無害未知不多問、不補造事實、主線＋附錄總計 ≤15；核准後縮文權限先契約化 |
| **PGQ-WP2 Generation Planner Upgrade** | `generation-plan.js`、`composition-primitives.js`、`full-deck-variants.js`、`design-grammar.js`、既有 renderer / Golden；R3/R4/R5 | 語意到呈現、真實選例、跨頁節奏、實際能力視圖與 candidate；合併 D02/03/06/08 | WP1 核准輸入／共用契約；content hash 不漂移、3～5 點完整可见、chart 不支援時不偷換、候選驗證後才用 |
| **PGQ-WP3 Motion Vocabulary Upgrade** | `motion-primitives.js`、既有 renderer/editor/export、StyleSpec、ZIP；VQ3/R7/R8/R10 | B odometer、E Sweep、14 類 donor 背景選單、Style 色彩映射、參數／重播／靜態狀態；D04 | WP2 能力視圖＋共用契約；逐 effect 真 runtime 驗證、所有 offered 選項離線可切、正常／reduced／fallback、20 MiB、編輯另存 round-trip |
| **PGQ-WP4 Representative QA Loop** | sample plan、既有 browser/geometry tools/tests、layout repair、Golden；R4/R6/R11 | Typical/Stress、自動修復、scope-aware 回饋、樣張保留、三層 readability；D05/11＋D09 | 隨 WP1/2 增量串驗，再加入 WP3；不必最後才寫 QA；sample 不替代完整逐頁驗收、同一問題最多兩次修復、skip sample 不新增人工等待 |

**Shared contract work，不另開第五套系統：** 僅為本次行為補必要的 sanitized source/derivation refs、結構化數字、motion 設定與 outline 的 main/appendix 標記；欄位與版本先做小 diff 和相容測試。schema、sanitizer、renderer、browser editor/export、recipient reparse 必須一起閉環；原件、路徑、prompt、Grill、profile 與工作理由不出檔。Source refs 不代表收件者拿到了來源全文。

**Motion decision correction：** B/E 是 Owner 對原型方向的接受，整合後仍需正式 runtime evidence；背景先前所有低保真示意不作 donor PASS/FAIL。完整 14 種效果是已核准的產品範圍，不是已驗證可用。none 永遠存在；一個效果失敗應明示 unavailable，不冒充全部支援。PGQ-D04 是對舊版「預設不採環境／3D 效果」的規劃例外，不放寬 arbitrary HTML、隨機逐元素動畫或 static readability。

**No extra machinery：** 沿用一份 core、一個 Grill、一份 outline、一個 renderer/export；不新增 Evidence DB、workflow engine、中央服務、逐層 Agent、逐頁選例或新的使用者審批步驟。這 4 包不得以「前期品質」為由阻塞尚未完成的原 release closure。

---

# 10. Owner-approved post-generation direct editor upgrade — EDX-20260914

**Status:** EDX-WP1-S1 COMPLETE — DEPENDENCY ADOPTION DECISION CLOSED；FORMAL EDITOR INTEGRATION NOT STARTED
**Priority:** AFTER P0-R11-R1 S3 AND EXISTING RELEASE CLOSURE；與 PGQ 依實際共享 schema / motion 依賴排序，不插隊目前 release blocker。  
**Decision trace / prior art:** [research/editor-prior-art.md](research/editor-prior-art.md)。

本節是 P0-R7 後續能力擴充，不把舊 P0-R7 receipt 改寫成「以前就有拖拉」。目前 MVP 的 `no free x/y dragging` 歷史決策繼續描述舊版；EDX 的新 Owner 方向是 **No ungoverned freeform canvas; support guided direct manipulation**。只有 EDX 完成實作、schema migration、sanitizer/export/browser evidence 後才更新現行 runtime contract。

**EDX-WP1 Slice 1 task：** `tasks/edx-wp1-s1-editor-core-dependency-spike.md`。Frontier 只做 Moveable／Selecto／Floating UI 的 pinned version、license／integrity、實際 bundle、offline browser與架構適配 spike；正式 dependency、stable-ID migration、Operation Registry mutation與 editor runtime改動均保持 blocked。

**EDX-WP1 Slice 1 closure receipt：** `research/edx/wp1-editor-core-dependency-spike.md`。三個候選的official version、MIT license、registry integrity與實測bundle已鎖定；R1 已關閉 editor chrome export leak 並獨立 review GO。Final adoption：Moveable `0.53.0` **GO / ADAPT**、Selecto `1.26.3` **GO / ADAPT**、`@floating-ui/dom` `1.8.0` **REJECT FOR WP1**；Floating UI 缺少 native/CSS positioning 不足的 measured gap。Formal EDX implementation 尚未開始。

**EDX-WP1 Slice 1 Repair 1 task：** `tasks/edx-wp1-s1-r1-export-cleanup-seam.md`。Frontier只補正式exporter的bounded editor-only chrome cleanup seam：first-party marker＋明確Moveable／Selecto／context-toolbar selector、clone-only移除、canonical/presentation不變與mis-mark fail-loud。Direct＋managed-browser GO前，dependency adoption與所有正式EDX interaction implementation保持blocked。

**EDX-WP1 Slice 1 Repair 1 candidate：** clone-only export cleanup已接入正式 `prepareExport()`／`exportHtml()`；direct 5/5與fresh managed-browser export→recipient reopen PASS，canonical／presentation／live DOM保持且mis-mark fail loud。Non-browser 200/200與fresh ZIP lifecycle PASS；ZIP 2,149,207 bytes，SHA-256 `0fb680c0c0c3427bc6f36b47c58004d820a5fecb21cd24419042f9fe6c97bdf8`。PGQ browser-backed compatibility 已由 independent reviewer 補跑通過；三候選仍為 DEFER，未開始 dependency adoption或正式 EDX interaction implementation。

**EDX-WP1 Slice 1 Repair 1 closure：** independent reviewer 已重播既有 PGQ browser compatibility 16/16 PASS，並確認 exporter 功能無 finding；P2 teardown race 已以 bounded exit wait＋profile removal retry 關閉，fresh export→recipient reopen exit 0，direct 5/5、non-browser 200/200 均 PASS。Independent re-review 最終 **GO**；R1 COMPLETE。Dependency adoption decision 已由下一筆 closure 收斂。

**EDX-WP1 Slice 1 adoption decision：** Moveable＋Selecto 通過後續 implementation 採用 gate；兩者只能產生／承接 bounded operation payload，DOM／selection 不具 canonical authority。Floating UI 本輪拒絕，contextual toolbar 先用 native/CSS positioning；只有 fresh edge-collision evidence 證明 measured gap 才可重開。下一步需另切 WP1 implementation card；不得由本決策直接安裝 dependency 或修改 runtime/schema。

**EDX-WP1 Slice 2 task：** `tasks/edx-wp1-s2-stable-identity-operation-path.md`。Frontier先建立backward-compatible slide-local element identity與第一條descriptor-backed `edit-text` operation；舊`applyLocalPatch`只作adapter。Moveable／Selecto仍不安裝，geometry overrides、drag/resize/snap、marquee與完整Operation Registry vocabulary保持blocked。

**EDX-WP1 Slice 2 candidate：** legacy keyPoints deterministic backfill為stable IDs，role／point／component使用互斥element identity namespace；renderer、Node/browser editor、export/reopen與duplicate閉合同一target pair。第一條`edit-text` descriptor拒絕arbitrary payload，legacy patch只作adapter。Independent review的Repair 1已移除operation path私設的slide ID長度上限，以deterministic slide-local allocator關閉合法long ID／hash suffix碰撞，並deep-freeze descriptor且以private immutable role allowlist執行。Focused 10/10、targeted 29/29、non-browser 210/210、PGQ browser compatibility 16/16與fresh editor export→reopen均PASS；234字元legacy slide ID已在真Chrome完成operation/export/reopen。Fresh ZIP 2,152,740 bytes，SHA-256 `f0dff328f707889deac71f8616ab4d06cdc62ade79d7781769756cc40656f2c0`；等待independent re-review，vendor install與geometry interaction仍blocked。

## 10.1 八項 Owner 決策

1. **Guided Direct Manipulation**：可 drag/resize/snap、keyboard nudge；不是 Canva 式無治理自由畫布；geometry hard gate 仍有效。
2. **Direct Text Editing**：單擊選物件、雙擊文字編輯；Role-based Typography、manual override、Copy/Paste Style；IME 必須正常。
3. **Replace-first + Safe Insert**：文字／圖片／影片；圖片拖入與 clipboard paste；替換預設保留原位置／大小／crop；Evidence 圖裁切有正確性 guard。
4. **Multi-select / Alignment / Group / Lock**：框選、Shift 多選、align/distribute/equal-gap、invisible snap grid、lightweight group/lock。
5. **Safe Editing History**：operation-level Undo/Redo、local draft、edit-start recovery；只有真 file handle／等價能力存在時才做 external-change detection，否則 Save As New。
6. **Role-aware Motion Inspector**：效果／速度／強度／順序／replay；背景 animation 獨立控制；不做專業 timeline；動畫中間狀態不得污染 canonical content。
7. **Human Intent Preservation**：content patch 不洗 manual geometry/typography/motion；visual patch 不改內容；`recompose-slide` 才能明確取代相關 overrides；可直接操作元素要 stable identity。
8. **Progressive Contextual Editor + Unified Operation Registry + Optional AI Bridge**：點什麼顯示什麼；toolbar/keyboard/AI 都走同一 mutation registry；portable HTML 本身不依賴 AI，bridge 只屬 optional host capability。

## 10.2 Prior-Art-First mandatory gate

任何 EDX 實作卡在進 code 前必須列：`Prior Art / Classification / License / Pinned Version / Bundle+Portable Cost / Why Custom / Acceptance`。沒有證據證明 OSS 不適用，不得手刻通用 editor primitive。

| OSS / donor | Verified license / status | Classification | EDX 用途 | Gate / 不吸收 |
|---|---|---|---|---|
| `daybrush/moveable` | MIT；repo 描述含 draggable/resizable/groupable/snappable | **ADAPT / P0 GO** | drag/resize/group transform/snap guides | DOM state 不作 canonical；warp/任意 rotate 不作一般預設；只接 bounded operation path |
| `daybrush/selecto` | MIT；mouse/touch drag-area selection | **ADAPT / P0 GO** | marquee、多選 | selection/editor chrome 不 export；只提供 selection input |
| donor `html-slide-builder-oss` editor | repo snapshot / research-only | **ADAPT** | 8px grid、align/distribute、arrow nudge、IME、style copy/paste、undo/redo、first-edit backup、animation editor guardrails | 不吸收 HTML-as-only-truth、Python server、任意 HTML、runtime `@latest`、mtime 假設 |
| `floating-ui/floating-ui` | MIT；活躍 | **REJECT FOR WP1 / REOPEN-ON-GAP** | contextual toolbar/inspector positioning prior art | native/CSS first；缺 measured gap 不新增 dependency；未來 fresh edge-collision failure 才重開 |
| `fengyuanchen/cropperjs` | MIT；2026 活躍 | **ADAPT / P0 candidate** | crop/move/zoom/fit | Evidence 圖由 PPTSKILL policy 保護；crop 不取代原 Evidence |
| `GoogleChromeLabs/browser-fs-access` | Apache-2.0；2026 活躍 | **ADAPT / P1 candidate** | file open/save + handle capability seam | 無 handle 不宣稱 mtime/conflict detection；portable editor 不依賴此 lib 才能基本運作 |
| `jakearchibald/idb-keyval` | LICENSE 明示 Apache-2.0；2026 活躍 | **DIRECT_REUSE candidate** | local draft/recovery IndexedDB | 先 probe file:// persistence；失敗不得顯示「已自動儲存」；不升級成 app DB |
| `immerjs/immer` | MIT；2026 活躍；官方 patches docs 有 inverse patches / undo use | **ADAPT / P0 candidate** | Undo/Redo patch/inversePatch + replay | Operation Registry 仍是 mutation authority；history 不 export |
| `barvian/number-flow` | MIT；animated number for TS/JS；source 有 trend / respectMotionPreference / prefix/suffix | **DIRECT_REUSE / ADAPT P0 candidate** | Owner B odometer | canonical 數值仍在 DeckSpec content；必測負值、小數、百分比/pp、locale、reduced motion、portable bytes |
| `motiondivision/motion` | MIT；2026 活躍 | **ADAPT candidate** | native WAAPI/CSS 不足時的 sequence/easing/replay/transform composition | Anime.js 最多二選一；先 benchmark native + bundle，不預設引入 |
| `tengbao/vanta` | MIT；donor 同一 effect vocabulary；repo 未封存 | **ADAPT** | 背景 effects 真 runtime family / options / lifecycle | pin/checksum/offline；不採 CDN / `@latest`；逐 effect capability |
| `processing/p5.js` | LGPL-2.1；2026 活躍 | **LICENSE GATE / REFERENCE UNTIL CLEARED** | donor TOPOLOGY/TRUNK 類 backend | 未完成 legal/bundle review 前不得打包進商用 ZIP/single HTML；可單獨標 unavailable / 找 permissive backend |
| `facebook/lexical` | MIT；2026 活躍 | **REFERENCE_ONLY initially** | IME/selection/accessibility/editor-state prior art | 不先導入第二套 rich-text document model；只有 contenteditable 證明不足才升級 |
| `excalidraw/excalidraw` | MIT；2026 活躍 | **REFERENCE_ONLY** | selection/group/history/keyboard/contextual UX/recovery prior art | 不嵌 whiteboard/collaboration/canvas canonical model |

**Alternatives only:** `interact.js` 只和 Moveable benchmark、二選一；Anime.js 只和 Motion benchmark、二選一；GrapesJS / Theatre.js Studio / tldraw 目前只作架構／UX 研究，禁止未經 license/bundle/domain-fit review 直接變 dependency。

## 10.3 四個 EDX 工作包，不開 8 套 subsystem

| Work package | Prior art first | PPTSKILL custom delta | Primary existing surfaces | Acceptance summary |
|---|---|---|---|---|
| **EDX-WP1 Editor Core** | Moveable + Selecto；contextual toolbar 先用 native/CSS positioning；donor grid/nudge | stable element identity、Operation Registry、guided overrides、safe-area/QA、contextual selection | `runtime/deck-editor.js`、DeckSpec/CompositionSpec、geometry gate | drag/resize/multi-select/snap 可用；一個 gesture 一筆 history；不產生任意 CSS/DOM truth；save/reopen geometry 一致 |
| **EDX-WP2 Content / Asset Editing** | donor IME/style copy；Cropper.js；browser clipboard/file primitives | role typography、text/style overrides、replace/insert component IDs、Evidence crop policy、portable video limits、group/lock relationship | `deck-editor.js`、asset optimizer/policy、StyleSpec、sanitizer/export | 雙擊中文輸入、style copy/paste、image replace/crop/insert/group/lock；overflow/geometry recheck；另存不丟 overrides |
| **EDX-WP3 History / Motion** | Immer + idb-keyval + browser-fs-access；NumberFlow；existing motion + donor rules + Vanta；Motion only if needed | operation coalescing、draft capability probe、recovery/source fingerprint semantics、role/motion metadata、slide lifecycle、Style color adapter | editor/history seam、`motion-primitives.js`、renderer、PGQ-WP3、size guard | Undo/Redo/recovery/降級 truthful；B odometer/E sweep/背景可 replay；reduced motion 終態正確；history/draft/chrome 不出檔；20 MiB 不放寬 |
| **EDX-WP4 Human Intent / Compatibility** | Excalidraw/成熟 editor UX 只作 reference | scoped patch precedence、destructive confirmation、stable ID migration、manual override preservation、recipient reparse、optional AI bridge bounded operation contract | DeckSpec/CompositionSpec/schema/sanitizer/editor/export/CLI adapters | content edit 不洗人工版面；recompose 明示 destructive scope；舊 deck 可讀；新 deck save/reopen/recipient AI 不丟 identity/overrides；無 bridge 仍完整人工可編輯 |

## 10.4 Unified Operation Registry — shared contract

Toolbar、keyboard、future AI bridge **不得各寫一套 mutation code**。至少規劃：

`move-element / resize-element / edit-text / set-typography / copy-style / paste-style / replace-asset / insert-element / delete-element / align-selection / distribute-selection / group / ungroup / lock / unlock / set-motion / reorder-slide / duplicate-slide / delete-slide / reset-slide / recompose-slide`。

每個 operation descriptor 必須定義：input schema、allowed target roles、mutates scopes、preserve scopes、destructive flag、confirmation rule、undoable、QA invalidation、portable serialization、fallback/unsupported reason。AI bridge 有也只能回 bounded operation payload；不接受任意 HTML/JS/CSS patch。

## 10.5 Shared schema / portability rules

- Components 已有 ID；keyPoints 目前以 array index 定位，不足以承載 point reorder/drag/typography/motion。EDX-WP1 先做 backward-compatible stable element identity proposal；舊 deck 可讀，新版另存不丟 identity。
- Manual override 不建立第二套 layout DB；有效 presentation state 仍由 CompositionSpec + bounded overrides 表達。
- `current request > explicit manual override > deck setting > generated Composition/Style > default`；content-only patch 不重置人工 geometry/typography/motion。
- 新欄位必須同時閉環：schema → sanitizer → renderer → editor → export → reopen → recipient AI parse。Browser 當下看得到但另存被 sanitizer 丟掉 = hard fail。
- Undo stack、selection、editor chrome、autosave draft、backup/recovery history 全部是 local work state，不進 portable HTML。
- Local autosave 是 capability，不是保證；storage probe fail 時降級 session history + leave warning。External-change detection 只有持續 file handle/等價能力時啟用。
- `Reset this slide`、`Restore edit-start deck`、`AI recompose` 是不同操作，不合併成含糊的 Reset。

## 10.6 Motion/editor donor guardrails

吸收 donor 實跑 lessons：動畫不能把 live 中間值序列化成 canonical；background-tab / frozen rAF 必須 force final value；離頁 reset 才能 replay；animation transform compose 既有 transform；reveal failsafe 在 hide 時就 armed；multi-select animation order 重新編連續序；order badge 是 editor chrome 不出檔。

PPTSKILL 可比 donor 更乾淨：canonical DeckSpec 與 live animation layer 分離，因此正式 slide preview 可在 presentation layer 執行；但任何 animation 中間的 text/opacity/transform 不得回寫 canonical。Reduced motion 直接顯示完整終態。

## 10.7 Dependency / license / bundle hard gate

- dependency 進 repo 前必須固定版本與 integrity/checksum，保存 repo/license/NOTICE；禁止 runtime `latest`。
- 量測實際 minified/gzip 與 **inline 到最終 deck.html 後的 bytes**，不可拿 repo size 猜；12 MiB warning / 20 MiB hard fail 保持。
- MIT / Apache-2.0 仍要正確保留 license/NOTICE。LGPL-2.1 p5.js 單獨 legal review；未通過時只使相關 p5-backed effect unavailable，不阻塞其他 Vanta effect。
- 新 dependency 必須 prove：offline、fresh browser、save/reopen、recipient parse、reduced motion / static fallback、no external CDN、no second canonical state。
- 每個 `CUSTOM_DELTA` 必須在卡上回答「為什麼現有 prior art 不能解」；答案若只是「自己寫比較快」不接受。

## 10.8 Product simplicity hard stop

功能增加不能把 UI 變 PowerPoint ribbon。Editor 以 selection-driven contextual toolbar 為主：未選取時只保留低干擾編輯入口；文字／圖片／多選／slide background 各只顯示相關常用操作；exact geometry、letter-spacing、raw motion params 等進 advanced。完整 WYSIWYG desktop-first；手機只做合理的輕量修改，不為手機強做精密 freeform editing。

EDX 不能建立第二 editor architecture、第二 renderer、第二 export、中央 backend、雲端 collaboration、專業 timeline 或 AI API 直塞 deck.html。Optional AI bridge 之後若做，必須可缺席且不能拿 token/key 寫進 HTML。
