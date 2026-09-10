# Text animation

The right panel can give any text element a number roll-up: it counts from 0 to
the element's own value on entry, easing out. Config lives in `data-anim` on the
element as JSON (`{effect, ease, dur}`), the same
source-of-truth-is-the-slide-HTML rule as `data-vanta`. The runtime is injected
into the page on first use and removed again when the last animation on that page
is deleted — the same download/attach-on-demand shape as `/api/vanta`.

Three constraints the implementation depends on. All three were found by running
it, not by reading:

- **It must never run in the editing iframe.** Saving serializes the live DOM, so
  animating `textContent` while editing means a save mid-count writes `3×` into
  the file permanently. The runtime checks `frameElement.id === 'frame'` and
  returns. `data-live` is the *wrong* fix here: it would make `serializeDoc`
  restore the container from the file on every save, so the text would stop being
  editable.
- **Never leave the number on a wrong value.** `requestAnimationFrame` does not
  run in a background tab, and the first version zeroed the text and then froze
  at `0×` — worse than no animation, and a print-to-PDF would capture it. So the
  zeroing happens *inside the first real frame*, and a `setTimeout` guard
  force-completes. Verified with rAF frozen: it still ends on the true value.
- **Reset when the slide leaves the viewport**, or going back to a slide shows a
  finished number instead of replaying. The packed deck holds every slide's
  iframe at once, so entry is detected with the *parent's*
  `IntersectionObserver` on the iframe; `.track` moves slides by transform, so
  an off-screen slide genuinely stops intersecting.

A second effect, **進場滑入**, hides text and slides it in on entry, staggered by a
per-element `order`. Three things it must get right beyond the rules above:

- **Compose onto the existing transform, never assign.** Themes position with
  their own `translateY(-50%)`, and `data-ed` writes to the same property, so
  assigning `style.transform` moves the element somewhere else. Cache the inline
  value, append the offset, restore it exactly.
- **The failsafe is armed at hide time, not at start time.** The counter can wait
  because it never pre-mutates; a reveal must hide up front or the text flashes.
  The first version armed its guard inside the start handler, which the observer
  never calls in a background tab — measured result: all eight items stuck at
  `opacity:0`, the whole slide's text invisible. Worse than the `0×` bug.
- **Multi-select renumbers 1..N in click order; it must not read the panel
  field.** The field shows `primary()`, which is the *last* selected element, so
  using it as a base turned 1–8 into 8–15 on a second apply. Single-select
  editing an order *moves* that element and closes ranks, like a drag reorder —
  only changing its own number leaves duplicates and gaps.

Order badges are drawn on the `#ov` overlay, which is editor chrome and never
serialized. They deliberately do **not** use `--accent`: that colour is reserved
for selection state, and spending it on order numbers would make "what is
selected" ambiguous. A badge turns accent only when its element is also selected.

The panel preview deliberately runs **in the panel, not on the slide** — the
editor chrome is never serialized, so it carries no risk, while a "preview on the
slide" button would reintroduce exactly the hazard the first constraint avoids.

Elements with no digits get the control disabled with a reason, rather than
silently doing nothing (same rule as the type panel's font roles).

