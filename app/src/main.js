// Vice Panels editor: wires the page to the poster renderer in cover.js. Photos are read from
// the visitor's own machine with object URLs and never leave it; the preview canvas is kept at
// the full export resolution, so what is on screen is exactly what the PNG export writes.

import { drawPoster, panelLayout, PANEL_COUNT } from './cover.js';
import { PRESETS, PRESET_ORDER } from './presets.js';
import { applyShot, markShotReady } from './shots.js';

export const SIZES = {
  square: { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
};

const state = {
  panels: Array.from({ length: PANEL_COUNT }, () => ({ img: null, panX: 0, panY: 0, zoom: 1 })),
  preset: 'vice',
  title: 'VICE HEAT',
  subtitle: 'One city. No brakes.',
  halftone: false,
  edges: true,
  activePanel: 0,
  size: 'portrait',
};

const library = []; // every photo loaded this session: { img, name }
let libraryPick = -1; // tray photo chosen for assignment, or -1

const canvas = document.getElementById('poster');
const ctx = canvas.getContext('2d');
const els = {
  file: document.getElementById('photo-input'),
  drop: document.getElementById('stage'),
  tray: document.getElementById('tray'),
  panelChips: document.getElementById('panel-chips'),
  zoom: document.getElementById('zoom'),
  title: document.getElementById('title-input'),
  subtitle: document.getElementById('subtitle-input'),
  presets: document.getElementById('preset-row'),
  halftone: document.getElementById('halftone'),
  edges: document.getElementById('edges'),
  size: document.getElementById('size-select'),
  exportBtn: document.getElementById('export'),
  fillAll: document.getElementById('fill-all'),
  clearPanel: document.getElementById('clear-panel'),
  sampleBtn: document.getElementById('load-samples'),
  status: document.getElementById('status'),
};

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function render() {
  const { w, h } = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  drawPoster(ctx, w, h, state);
  buildPanelChips();
}

function say(text) { els.status.textContent = text; }

/** Adds a loaded image to the tray and places it in the next free panel (or the active one). */
function placePhoto(img, name) {
  library.push({ img, name });
  const free = state.panels.findIndex((p) => !p.img);
  const target = free === -1 ? state.activePanel : free;
  state.panels[target] = { img, panX: 0, panY: 0, zoom: 1 };
  state.activePanel = target;
  buildTray();
  render();
  say(`Placed ${name} in panel ${target + 1}. Drag the poster to reposition it.`);
}

async function addFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(file));
    placePhoto(img, file.name);
  }
}

function buildTray() {
  els.tray.replaceChildren();
  library.forEach((item, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tray-item' + (i === libraryPick ? ' picked' : '');
    const thumb = document.createElement('img');
    thumb.src = item.img.src;
    thumb.alt = item.name;
    const cap = document.createElement('span');
    cap.textContent = item.name.length > 14 ? item.name.slice(0, 13) + '…' : item.name;
    b.append(thumb, cap);
    b.title = `Use ${item.name}: click, then click a panel number — or Fill all panels`;
    b.addEventListener('click', () => {
      libraryPick = i;
      state.panels[state.activePanel].img = item.img;
      buildTray();
      render();
      say(`${item.name} is in panel ${state.activePanel + 1}. Pick another panel number to reuse it.`);
    });
    els.tray.append(b);
  });
  els.fillAll.disabled = libraryPick < 0 && state.activePanel < 0;
}

function buildPanelChips() {
  els.panelChips.replaceChildren();
  state.panels.forEach((panel, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (i === state.activePanel ? ' active' : '') + (panel.img ? ' filled' : '');
    b.textContent = String(i + 1);
    b.title = panel.img ? `Panel ${i + 1} — has a photo` : `Panel ${i + 1} — empty`;
    b.addEventListener('click', () => {
      state.activePanel = i;
      if (libraryPick >= 0) state.panels[i].img = library[libraryPick].img;
      syncZoom();
      render();
    });
    els.panelChips.append(b);
  });
}

function syncZoom() { els.zoom.value = String(state.panels[state.activePanel].zoom); }

function buildPresets() {
  els.presets.replaceChildren();
  for (const key of PRESET_ORDER) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset' + (key === state.preset ? ' active' : '');
    b.dataset.preset = key;
    b.innerHTML = `<i style="background:linear-gradient(135deg, ${PRESETS[key].accent}, ${PRESETS[key].accent2})"></i>${PRESETS[key].label}`;
    b.addEventListener('click', () => { state.preset = key; buildPresets(); render(); });
    els.presets.append(b);
  }
}

// --- controls -------------------------------------------------------------
els.file.addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
for (const evt of ['dragover', 'dragenter']) els.drop.addEventListener(evt, (e) => { e.preventDefault(); els.drop.classList.add('dragging'); });
for (const evt of ['dragleave', 'drop']) els.drop.addEventListener(evt, (e) => { e.preventDefault(); els.drop.classList.remove('dragging'); });
els.drop.addEventListener('drop', (e) => addFiles([...e.dataTransfer.files]));

els.title.addEventListener('input', () => { state.title = els.title.value; render(); });
els.subtitle.addEventListener('input', () => { state.subtitle = els.subtitle.value; render(); });
els.halftone.addEventListener('change', () => { state.halftone = els.halftone.checked; render(); });
els.edges.addEventListener('change', () => { state.edges = els.edges.checked; render(); });
els.zoom.addEventListener('input', () => {
  state.panels[state.activePanel].zoom = Number(els.zoom.value);
  render();
});
els.size.addEventListener('change', () => { state.size = els.size.value; render(); });
els.fillAll.addEventListener('click', () => {
  const pick = libraryPick >= 0 ? library[libraryPick] : library[library.length - 1];
  if (!pick) { say('Add a photo first, then fill every panel with it.'); return; }
  state.panels.forEach((p, i) => {
    p.img = pick.img;
    p.zoom = 1 + i * 0.07;
    p.panX = [-0.3, 0.25, 0, 0.2, -0.25, 0.1][i];
    p.panY = [-0.1, 0.15, -0.25, -0.15, 0.2, 0][i];
  });
  render();
  say(`Every panel now shows ${pick.name}, each cropped a little differently.`);
});
els.clearPanel.addEventListener('click', () => {
  const p = state.panels[state.activePanel];
  p.img = null; p.panX = 0; p.panY = 0; p.zoom = 1;
  syncZoom();
  render();
});
els.sampleBtn.addEventListener('click', async () => {
  for (const name of ['pier', 'boulevard']) {
    placePhoto(await loadImage(`samples/${name}.jpg`), `${name} (sample)`);
  }
});
els.exportBtn.addEventListener('click', () => {
  const { w, h } = SIZES[state.size];
  const saved = state.activePanel;
  state.activePanel = -1;
  drawPoster(ctx, w, h, state);
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-panels-${w}x${h}.png`;
    a.click();
    state.activePanel = saved;
    render();
    say(`Saved vice-panels-${w}x${h}.png — ready to post.`);
  }, 'image/png');
});

// Drag on the poster pans the panel under the pointer and makes it active.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const { rects } = panelLayout(canvas.width, canvas.height);
  const i = rects.findIndex((r) => pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h);
  if (i === -1) return;
  state.activePanel = i;
  syncZoom();
  drag = { i, x: pt.x, y: pt.y, rect: rects[i] };
  canvas.setPointerCapture(e.pointerId);
  render();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = canvasPoint(e);
  const p = state.panels[drag.i];
  p.panX = clamp(p.panX + ((pt.x - drag.x) / drag.rect.w) * 2, -1, 1);
  p.panY = clamp(p.panY + ((pt.y - drag.y) / drag.rect.h) * 2, -1, 1);
  drag.x = pt.x; drag.y = pt.y;
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });

function canvasPoint(e) {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - box.left) / box.width) * canvas.width,
    y: ((e.clientY - box.top) / box.height) * canvas.height,
  };
}
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// --- start ----------------------------------------------------------------
async function start() {
  buildPresets();
  const query = new URLSearchParams(location.search);
  const shotSize = query.get('size');
  if (shotSize && SIZES[shotSize]) { state.size = shotSize; els.size.value = shotSize; }
  const isShot = await applyShot(state, query, loadImage);
  if (isShot) {
    if (query.get('shot') === 'editor') {
      // Show the loaded samples in the tray too, as a real editing session would.
      for (const name of ['boulevard', 'pier']) {
        library.push({ img: await loadImage(`samples/${name}.jpg`), name: `${name} (sample)` });
      }
    }
    els.title.value = state.title;
    els.subtitle.value = state.subtitle;
    els.halftone.checked = state.halftone;
    buildPresets();
    buildTray();
    if (state.activePanel < 0) { /* cover shot: no editor highlight */ }
    render();
    if (query.get('shot') === 'cover') {
      const saved = state.activePanel;
      state.activePanel = -1;
      render();
      state.activePanel = saved;
    }
    markShotReady();
    return;
  }
  // First run: pre-load the two free sample photos so the poster is alive at once.
  placePhoto(await loadImage('samples/pier.jpg'), 'pier (sample)');
  placePhoto(await loadImage('samples/boulevard.jpg'), 'boulevard (sample)');
  const first = library[0];
  state.panels.forEach((p, i) => { if (!p.img) { p.img = (i % 2 ? library[1] : first).img; } });
  state.activePanel = 0;
  syncZoom();
  render();
  say('Samples loaded — drop your own photos anywhere on the poster to make it yours.');
}

start();
