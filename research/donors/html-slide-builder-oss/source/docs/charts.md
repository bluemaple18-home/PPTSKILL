# Charts

`chart.py` renders inline SVG — no chart library, by design. Chart.js is 204KB and
ECharts 1MB against ~5KB for a hand-built SVG, and more importantly a canvas chart
is one opaque rectangle in the editor while every SVG element is individually
selectable (verified: the TYPE panel works on chart labels).

- **Colours are nested CSS `var()` fallbacks**, not a passed-in token dict:
  `--chart-*` → mocha's name → glass's name → literal. The two themes name things
  differently (`--ink-primary` vs `--ink`), so one chart matches both and degrades
  sanely on a page with no theme. Override per deck by defining `--chart-*`.
- **Fonts use `var(--body-font)`** so `build_deck.py`'s font swap still applies. A
  literal family would drop CJK glyphs on export.
- **Title, subtitle and source are NOT in the SVG.** They are separate slide
  elements, so they stay editable text with the normal type controls.
- **Emphasis colouring only** — one highlighted row, everything else muted.
  Multi-hue categorical palettes are not offered: this warm near-monochrome ramp
  fails contrast checks between adjacent categories.
- `color="mono"` is the default so the tool stays reusable across decks;
  `color="accent"` picks up the theme accent.
- **Labels are de-collided, not clipped.** Slope labels sit at their data height,
  which overlaps whenever values cluster; `_decollide` pushes them apart and draws
  a hairline leader. Overlapping text is worse than any layout compromise.
- **`chart.suggest(question)` picks the family; you still pick the form.** It
  matches `shortcuts:` first, then character-bigram overlap on the `ask` fields,
  and filters to forms that have a renderer — so it cannot name a tenth form
  that does not exist. It returns an empty list rather than a zero-score guess;
  that means "read the YAML yourself", not "no chart fits".
- **Pick the form from the data's shape, not the question alone.** A slope chart
  collapses to a single point on the left when every series starts from the same
  value (three indexed-to-1× series stacked their labels on top of each other); a
  line chart separates them at the right, where they have diverged.
- **Measure the slide's real geometry before sizing a chart.** Reading the
  bounding boxes in the browser showed the cover's right column starts at x=495,
  so a 520px chart at x=76 overlapped it by 101px. Guessing the width wasted a
  round trip.
- Charts are inserted into the slide HTML, **not** produced at generation time.
  Generating them upstream would mean regenerating a deck to add a chart,
  destroying every edit — the exact architecture phase 1 removed. (`CHART_BRIEF.md`
  predates that flip and says otherwise; it is a survey doc, not a spec.)

