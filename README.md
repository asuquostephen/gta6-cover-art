[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/asuquostephen/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/asuquostephen/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Panels — GTA-Style Cover Art Maker

Vice Panels turns your own photo and a caption into bold, multi-panel poster-style cover art —
the collage-grid poster look with heavy condensed lettering and a sunset or neon colour grade —
and exports it as a PNG ready to post. The design is entirely original: no Rockstar logos,
artwork, characters or fonts. Lettering is drawn on canvas with system font stacks, and the two
sample photos bundled under `app/samples/` were made for make.fun and are free to use.

## Features

- **Six-panel collage poster** — the classic cover-art grid (3×2 landscape, 2×3 portrait/square),
  with white keylines between panels.
- **Any photo, any panel** — add photos by file picker or drag-and-drop onto the poster, click a
  photo then a panel number to place it, or fill all six panels with one photo (each panel gets a
  slightly different crop, like a real cover shoot).
- **Per-panel crop and position** — drag inside a panel to pan its photo; a zoom slider per panel.
- **Shuffle panels** — one click randomly reassigns your photos across the six panels, while
  each panel keeps its own pan and zoom, so a framed crop stays framed — it just frames a
  different photo. Keep clicking for a fresh layout every time.
- **Caption editor** — a big title in bold condensed poster lettering with an accent shadow and
  black keyline, plus a tagline in an accent pill.
- **Five colour grades** — Vice Sunset, Neon Nights, Beach Day, Midnight Crime and Golden Hour
  (warm amber highlights over deep teal shadows), applied as canvas filters plus gradient
  washes; optional halftone print dots and comic edge shading.
- **Post sizes** — export a PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080. The preview canvas is
  kept at full export resolution, so what you see is exactly what downloads.
- **Offline and private** — plain static files, no build step, no network requests; photos are
  read on your own machine and never uploaded.

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

or serve `app/` with any static file server and open `index.html`. Node 22 runs `serve.ts`
directly; there is nothing to install.

## Hand it in (make.fun)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json`
with the vendored `vendor/makefun-app.ts` library, exactly as the bounty requires.

## Screenshots

`screenshots/` holds renders of this app: the wide exported cover (the cover image), the editor
with sample photos loaded, a portrait cover with halftone dots, and a square cover. They are
produced from the app's own `?shot=` scenes (see `shots.json`): `?shot=cover` shows the exported
poster full-frame and `?shot=editor` shows the editor, so every screenshot is a genuine render
of the app or of a cover it exported.

## License

MIT — see `LICENSE`.
