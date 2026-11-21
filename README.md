# Vice Panels — GTA-Style Cover Art Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/asuquostephen/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/asuquostephen/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Panels turns your own photos and a caption into bold, six-panel
poster art in the spirit of classic game-cover collages — white keylines
between every panel, punchy colour grades, and big condensed lettering
drawn live on the canvas. It is an original design: no third-party
logos, artwork, characters, or font files are included, and all
lettering uses system font stacks rendered by the canvas itself.

Competition page: https://make.fun/bounty/gta6-cover-art-01

## What it does

- **Six-panel collage** — a 3 × 2 grid for square and landscape
  posters, switching to 2 × 3 for portrait posters, with bright white
  keylines separating the panels.
- **Your photos, your way** — add photos with the file picker or by
  dragging them onto the poster. Photos land in a tray; click a tray
  photo and then a panel to place it, or use one photo to fill every
  panel at once with a different crop in each cell.
- **Per-panel editing** — click a panel (or press keys 1–6) to select
  it, drag inside it to pan its photo, use the zoom slider to tighten
  the crop, and clear a panel with one button when you want it empty.
- **Caption lettering** — the title is drawn in heavy condensed type
  with an accent-coloured offset shadow, a thick black keyline, and a
  white face, automatically shrunk until it fits the poster width. A
  tagline sits in an accent pill near the bottom.
- **Colour grades** — Vice Sunset, Neon Nights, Beach Day, Midnight
  Crime, and Golden Hour, each pairing a canvas filter chain with a
  gradient wash in the grade's own colours. Optional halftone dots and
  comic edge shading (a per-panel inner vignette) add print texture.
- **Real export sizes** — 1080 × 1080, 1080 × 1350, and 1920 × 1080.
  The on-screen preview is the very canvas that exports, so what you
  see is exactly the PNG you download (Export button, or press E).
- **Fully offline** — the app is plain static files with no build step
  and no network requests. Photos are read on your own machine and are
  never uploaded anywhere. Two bundled sample photos (Boulevard and
  Pier) preload into the tray so you can try it instantly.

## How to run it

Serve the app locally from the repository root:

```sh
node serve.ts
```

Then open the local address it prints (http://localhost:8080) in a
desktop browser. Add photos, arrange the panels, write your caption,
pick a grade and size, and export your PNG.

## How the entry is handed in

Running the entry program copies `app/` and `screenshots/` to the
output directory and writes the `dossier.json` summary there:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Outside the grading container, `MAKEFUN_OUTPUT_DIR` stands in for
`/output`. The run prints a short Vice Panels summary — the export
sizes and how many screenshots were handed in — after the dossier is
written.
