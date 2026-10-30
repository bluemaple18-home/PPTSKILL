# Interactive slides (WebGL / Wasm / demos)

Slides may run JavaScript. Three constraints make that safe; all were verified
by building a deck and loading it, not by reading the code.

**Demos must live inside `<div data-live>`.** Saving serializes the live DOM, so
any node a script creates would be written into the source file, permanently and
cumulatively — measured at 706→923 bytes with three junk lines after one save.
`serializeDoc` replaces the contents of every `[data-live]` element with the
*authored* version, snapshotted from the file text on slide open (not from the
DOM — scripts run at parse time, before the load event). Verified: 52 runtime
nodes in the DOM, four saves, zero written, no file growth. Anything a script
mutates *outside* a `data-live` container is still saved; that is the contract.

**Export uses `sandbox="allow-same-origin allow-scripts"`. Both flags are
required; do not "tighten" this.** Dropping `allow-scripts` kills every
interactive demo. Dropping `allow-same-origin` renders theme-generated slides
**completely blank** — measured on mocha and glass, with only that flag changed
and identical content that renders fine standalone. Dropping `allow-same-origin` because nothing seems to need it is the tempting
mistake. Always verify an export change against a **real theme deck**, visually.

The cost is real: the two flags together let framed content remove its own
sandbox. That is acceptable for slides you authored yourself, and unacceptable as
a way to frame someone else's HTML. Do not run untrusted HTML through this
pipeline.

**The editor overlay blocks demo interaction while editing.** `#ov` sits over the
slide so clicks select elements. The 互動 toggle drops `pointer-events` so the
demo can be operated directly; present mode has no overlay and is always
interactive.

Practical limits: assets must be embedded, so a Wasm binary has to be
base64-inlined and instantiated from an ArrayBuffer rather than `fetch`ed, and
pays a +33% size tax. A real terminal or a live LLM call needs a server or a key
and cannot work in a standalone shared file — replay a recorded transcript
instead, or keep it live only while the editor server runs.

