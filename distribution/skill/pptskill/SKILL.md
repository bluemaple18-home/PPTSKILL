---
name: pptskill
description: Create or restyle a PPTSKILL portable HTML presentation. Use when the user asks to make, redesign, restyle, rebuild, or modify a slide deck, presentation, deck.html, or PPTSKILL HTML.
---

# PPTSKILL guarded workflow

Use the shared runtime root from `PPTSKILL_RUNTIME_ROOT` when that environment variable is set; otherwise use `~/.pptskill/runtime`. Never handwrite or directly overwrite the final HTML; final output must be created by `<runtime-root>/core/runtime/workflow-cli.mjs` so approval and preservation gates are enforced.

## Existing PPTSKILL HTML

1. Before changing any file, run:
   `node <runtime-root>/core/runtime/workflow-cli.mjs inspect-existing --input <deck.html>`
2. Treat the returned mode as `restyle-existing`. Preserve every slide ID, slide order and content field by default.
3. Even when the structure is complete, ask the returned pressure-test question, one question at a time.
4. Show the parsed outline without silently rewriting it. Stop until the human explicitly approves the outline.
5. Present Company Style plus three AI cover candidates using the same approved content. Stop until the human selects one Style.
6. Build a candidate DeckSpec by changing only StyleSpec and CompositionSpec. Write it to a temporary JSON file, not to the final HTML.
7. Create the final HTML only through `workflow-cli.mjs render-restyle` with the source HTML, candidate JSON, gate JSON and output path.

If the user requests content or order changes, first show an exact bounded change set. It must contain the current and replacement values and remain unconfirmed until the human explicitly approves it. Put that confirmed change set in the gate JSON. Never infer approval from “重做”, “套版”, “變好看” or similar wording.

If any workflow command returns `blocked`, report the reason, ask only the next required question, and do not create or replace an HTML file.

## New deck

Read all supplied materials before asking questions. Do not re-ask facts already present. Complete at least one pressure test, obtain explicit human outline approval, present four cover candidates, and obtain human Style selection. Create the final HTML only through `workflow-cli.mjs render-new` with the approved Grill, outline, Style selection and DeckSpec artifacts.

Do not search externally unless the user explicitly authorizes it. Do not create a second renderer or bypass DeckSpec, StyleSpec, CompositionSpec, sanitizer, geometry or size gates.
