# Live LLM demo

A slide about per-turn context overhead can measure its own argument: it calls
`POST /v1/messages/count_tokens` for real and shows the user's question (20
tokens) against the system-prompt-plus-tools manual it must re-read every turn
(5,307 tokens) — **265×** — then the per-turn input cost at three levels.

- **`count_tokens`, not a completion.** The slide is about input weight, not
  output. Counting doesn't invoke the model, so there is no generation latency to
  stand through on stage and no inference bill.
- **The whole panel lives in `<div data-live>`**, so `serializeDoc` restores the
  authored placeholders on save and API results are never written into the slide
  file. Verified. This is also why the demo may run inside the editing iframe,
  unlike the text animations — there is nothing it can corrupt.
- **Three states, because a demo that dies on stage is worse than none.** Live
  when the server and key are present; recorded `data-rec-*` values, labelled as
  such, when the fetch fails (that is what the packed single file does); the
  numbers are always visible before the call returns.
- The sample manual lives in `slide_editor/demo_manual.py`, not in the slide —
  several thousand tokens of tool schemas would bloat every exported deck.
- Colour follows this page's existing vocabulary: brick marks the **fix**
  (`開快取`), muted ink marks the problem. That matches the `.b-hi` rule the page
  already used; inverting it would fight the deck.
- **Two bars, not three, and that was a measurement.** A `需要時再去查` bar using
  `defer_loading` + tool search was built and then removed: measured on
  `/v1/messages` (the `count_tokens` endpoint refuses server tools), the deferred
  form cost **5,675 input tokens against 5,327** — 348 *more*. This manual's
  weight is in the tools' prose descriptions, not their schemas; deferring hides
  only the schema, names and descriptions still ship so search can find them, and
  the search tool has its own cost. `defer_loading` pays off with many tools or
  large schemas, not twelve verbose small ones. The two surviving bars are both
  defensible: full price is measured, cache read at ~0.1× is published pricing.
  Do not re-add a third bar without measuring it at the manual's actual size.

