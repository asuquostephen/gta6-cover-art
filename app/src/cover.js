// The poster renderer for Vice Panels. drawPoster paints the whole cover onto any 2D context
// at whatever size that canvas is, so the on-screen preview and the exported PNG are the same
// drawing: a multi-panel collage in the spirit of big-city crime-movie posters, a colour grade
// from the chosen preset, optional halftone dots and comic edge darkening, then the caption in
// heavy condensed lettering across the top. Everything is drawn with canvas primitives and the
// visitor's own photos — no artwork, logo or font file from anyone else's game. The last pass
// over the sheet is a finish: a soft vignette plus a deterministic film grain, so the flat
// digital colour reads as a printed poster.

import { PRESETS } from './presets.js';

export const PANEL_COUNT = 6;
export const TITLE_FONT_STACK = '"Arial Narrow", "Liberation Sans Narrow", Impact, "Franklin Gothic Medium", sans-serif';

/** The panel rectangles for a poster of w x h: 3 across x 2 down in landscape, 2 x 3 otherwise. */
export function panelLayout(w, h) {
  const landscape = w >= h;
  const cols = landscape ? 3 : 2;
  const rows = landscape ? 2 : 3;
  const gap = Math.max(6, Math.round(w * 0.011));
  const rects = [];
  const cellW = (w - gap * (cols + 1)) / cols;
  const cellH = (h - gap * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({ x: gap + c * (cellW + gap), y: gap + r * (cellH + gap), w: cellW, h: cellH });
    }
  }
  return { rects, gap };
}

/** Draws one photo into a panel rect with cover-fit, the panel's zoom and pan applied, under the preset filter. */
function drawPanelPhoto(ctx, img, rect, panel, filter) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const maxPanX = Math.max(0, (dw - rect.w) / 2);
  const maxPanY = Math.max(0, (dh - rect.h) / 2);
  const dx = rect.x + (rect.w - dw) / 2 + panel.panX * maxPanX;
  const dy = rect.y + (rect.h - dh) / 2 + panel.panY * maxPanY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** A placeholder panel: a two-stop diagonal gradient with a big index number, before any photo is placed. */
function drawEmptyPanel(ctx, rect, index, preset) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, preset.emptyPanel[0]);
  g.addColorStop(1, preset.emptyPanel[1]);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.font = `700 ${Math.round(rect.h * 0.34)}px ${TITLE_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(index + 1), rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.textBaseline = 'alphabetic';
}

/** Halftone dot screen: a grid of soft dots, denser toward the foot of the poster. */
function drawHalftone(ctx, w, h) {
  const step = Math.max(10, Math.round(w / 90));
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  for (let y = step / 2; y < h; y += step) {
    const t = y / h;
    const radius = step * 0.30 * t;
    if (radius < 0.4) continue;
    for (let x = step / 2; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Darkens panel edges a touch, the cheap comic-print vignette inside each cell. */
function drawPanelShade(ctx, rect) {
  const g = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.42,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.78,
  );
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** A fixed-seed PRNG (mulberry32): the grain must come out identical on every render, so the
 *  poster a visitor exports is the poster they saw, whatever machine or moment it is drawn in. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
/** A square of per-pixel grey noise, drawn once and then tiled as a pattern: the film grain. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const size = 256;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  const data = tctx.createImageData(size, size);
  const rand = seededRandom(0x9e3779b9);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rand() * 256);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

/**
 * The finish pass, painted last over the whole graded poster — lettering included, the
 * editor's dashed highlight excluded: a soft vignette pulls the corners down, then a whisper
 * of film grain is tiled over everything in overlay blend. Neither half looks at the preset
 * (fixed gradient stops, fixed grain seed), so the finish sits the same on all five grades.
 */
function drawFinish(ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const vignette = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.42, cx, cy, Math.hypot(w, h) / 2);
  vignette.addColorStop(0, 'rgba(12, 6, 20, 0)');
  vignette.addColorStop(0.72, 'rgba(12, 6, 20, 0)');
  vignette.addColorStop(1, 'rgba(12, 6, 20, 0.30)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  if (typeof document !== 'undefined') {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.055;
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/** Fits the title font size so the words span most of the poster width on one line. */
function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px ${TITLE_FONT_STACK}`;
  while (ctx.measureText(text).width > maxWidth && size > 18) {
    size -= 4;
    ctx.font = `900 ${size}px ${TITLE_FONT_STACK}`;
  }
  return size;
}

/**
 * Paints the full poster. state = { panels: [{img, panX, panY, zoom} x6], preset: key,
 * title, subtitle, halftone: bool, edges: bool, activePanel: index or -1 (editor highlight) }.
 */
export function drawPoster(ctx, w, h, state) {
  const preset = PRESETS[state.preset] ?? PRESETS.vice;
  ctx.save();
  ctx.fillStyle = '#f5f2ea';
  ctx.fillRect(0, 0, w, h);

  const { rects } = panelLayout(w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (panel && panel.img) drawPanelPhoto(ctx, panel.img, rect, panel, preset.filter);
    else drawEmptyPanel(ctx, rect, i, preset);
    if (state.edges) drawPanelShade(ctx, rect);
  });

  // The preset's bottom glow washes up over the panels, then the halftone if asked for.
  const glow = ctx.createLinearGradient(0, h * 0.45, 0, h);
  glow.addColorStop(0, preset.bottomGlow[0]);
  glow.addColorStop(1, preset.bottomGlow[1]);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  if (state.halftone) drawHalftone(ctx, w, h);

  // Title block: a scrim band, the big condensed title with a hard offset shadow in the accent
  // colour, a black keyline, white fill, and the subtitle in a pill under it.
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (title) {
    const bandH = h * (subtitle ? 0.30 : 0.24);
    const scrim = ctx.createLinearGradient(0, 0, 0, bandH);
    scrim.addColorStop(0, preset.topScrim);
    scrim.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, bandH);

    const size = fitTitleSize(ctx, title, w * 0.92, h * 0.155);
    ctx.font = `900 ${size}px ${TITLE_FONT_STACK}`;
    ctx.textAlign = 'center';
    try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas */ }
    const ty = size * 1.06;
    ctx.lineWidth = size * 0.16;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = preset.accent;
    ctx.fillStyle = preset.accent;
    ctx.fillText(title, w / 2 + size * 0.045, ty + size * 0.055);
    ctx.strokeStyle = '#0b0b10';
    ctx.strokeText(title, w / 2, ty);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, w / 2, ty);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }

    if (subtitle) {
      const subSize = Math.max(15, size * 0.30);
      ctx.font = `700 ${subSize}px ${TITLE_FONT_STACK}`;
      const tw = ctx.measureText(subtitle).width + subSize * 1.6;
      const px = (w - tw) / 2;
      const py = ty + size * 0.22;
      ctx.fillStyle = preset.accent;
      ctx.beginPath();
      ctx.roundRect(px, py, tw, subSize * 1.62, subSize * 0.5);
      ctx.fill();
      ctx.fillStyle = '#0b0b10';
      ctx.textBaseline = 'middle';
      ctx.fillText(subtitle, w / 2, py + subSize * 0.84);
      ctx.textBaseline = 'alphabetic';
    }
  }

  // The finish goes over everything drawn so far, the lettering included.
  drawFinish(ctx, w, h);

  // Editor-only: outline the panel being adjusted.
  if (state.activePanel >= 0 && rects[state.activePanel]) {
    const r = rects[state.activePanel];
    ctx.strokeStyle = preset.accent2;
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.setLineDash([w * 0.02, w * 0.012]);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.setLineDash([]);
  }
  ctx.restore();
}
