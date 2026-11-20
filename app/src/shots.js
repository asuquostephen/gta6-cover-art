// Fixed scenes for screenshots, in the starter's ?shot= convention. ?shot=cover shows only the
// finished poster (the exported cover itself); ?shot=editor shows the whole editor with photos
// loaded. Query params: photos (comma list of sample names, cycled across the six panels),
// title, subtitle, preset, halftone=1, edges=0|1 (the comic edge shading, on unless a scene
// turns it off), and size=square|portrait|wide for the poster canvas.
// window.__shotReady is set once the scene has painted, so a screenshot tool can wait for it.

const PAN_FLAIR = [
  { panX: -0.35, panY: -0.15, zoom: 1.12 },
  { panX: 0.3, panY: 0.1, zoom: 1.25 },
  { panX: 0, panY: -0.3, zoom: 1.05 },
  { panX: 0.25, panY: -0.2, zoom: 1.35 },
  { panX: -0.2, panY: 0.25, zoom: 1.18 },
  { panX: 0.1, panY: 0, zoom: 1.45 },
];

export async function applyShot(state, query, loadImage) {
  const shot = query.get('shot');
  if (!shot) return false;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');

  const names = (query.get('photos') ?? query.get('photo') ?? 'pier,boulevard').split(',').map((s) => s.trim()).filter(Boolean);
  const images = [];
  for (const name of names) images.push(await loadImage(`samples/${name}.jpg`));
  state.panels.forEach((panel, i) => {
    panel.img = images[i % images.length];
    Object.assign(panel, PAN_FLAIR[i % PAN_FLAIR.length]);
  });
  state.title = query.get('title') ?? query.get('caption') ?? state.title;
  state.subtitle = query.get('subtitle') ?? state.subtitle;
  if (query.get('preset')) state.preset = query.get('preset');
  if (query.get('halftone') === '1') state.halftone = true;
  if (query.get('edges') !== null) state.edges = query.get('edges') !== '0';
  state.activePanel = shot === 'editor' ? 1 : -1;
  return true;
}

/** Called by the editor after a shot scene has rendered, so the screenshot can be taken. */
export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
