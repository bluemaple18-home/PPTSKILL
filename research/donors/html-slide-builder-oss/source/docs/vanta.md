# Vanta backgrounds

The right panel can turn any of Vanta's 14 effects on for a slide. Effect files
download on demand into `<slides_dir>/lib/` (`/api/vanta`), the same
download-on-first-use pattern as `ensure_font` — three.js is 604KB and p5.js
796KB, too big to vendor. TOPOLOGY and TRUNK need p5; the other twelve need
three. CLOUDS2 additionally needs `noise.png`.

Config lives in `data-vanta` on the layer element, so the slide HTML stays the
only source of truth and the panel reads it back on reopen. Parameter schemas and
defaults in `VANTA_SCHEMA` were extracted from each effect's own
`defaultOptions`, not invented.

Three rules the implementation depends on:

- **The layer is `data-live`**, so the WebGL canvas never reaches the file.
- **Libraries can append nodes *outside* the layer.** p5.js (TOPOLOGY, TRUNK)
  puts a `<main>` on the body, which sat outside `data-live` and was written into
  the slide file — one per attempt. `vantaApply` now diffs `body.children` before
  and after init and tags anything new as `data-vanta-junk`, which `serializeDoc`
  removes entirely. It diffs rather than looking for `<main>` specifically, so
  another library's stray node is caught too.
- **The slide's own background is inherited into whichever option is that
  effect's "background"** — `VANTA_INHERIT` names it per effect, because it is
  not always `backgroundColor`. WAVES has no `backgroundColor` at all: the wave
  mesh *is* the surface, so the slide colour goes to `color`, and Vanta's lighting
  brightens it, so it is multiplied by 0.85 first (measured against a reference
  swatch — feeding the paper colour straight in renders near-white). FOG uses
  `baseColor`. Without this, enabling an effect repaints the slide in the effect's
  own palette and the theme's text turns unreadable.
  WAVES can never match a flat background exactly: the effect has a built-in light
  gradient across the surface. `shininess` barely affects the hue — do not reach
  for it to fix colour.
  For CLOUDS the sky is `skyColor`; `backgroundColor` alone changes nothing
  visible. Same for CELLS — its `backgroundColor` renders pixel-identical to the
  default, and the visible surface is the `color1`/`color2` gradient, so both
  inherit (the second darkened to 0.80 so cell edges keep contrast).
  **Before wiring an effect's inherit, test each colour option in isolation
  against a reference swatch.** Three of the fourteen expose a `backgroundColor`
  that does nothing, and guessing from the option name has been wrong every
  time. **CLOUDS2 cannot take a light background**: only `skyColor` has any
  visible effect (backgroundColor, cloudColor and lightColor were each tested in
  isolation and changed nothing), and its zenith is hard-coded to fade to near
  black in the shader. On a light-paper deck the top third stays dark and dark
  theme text is unreadable there — it is a dark-deck effect, or a foreground one.
- **Foreground layers force `backgroundAlpha: 0` and `pointer-events: none`**
  (z-index 80). An opaque effect on top would simply hide the slide, and without
  pointer-events the whole slide becomes unclickable.

