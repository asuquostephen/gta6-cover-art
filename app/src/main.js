// Vice Panels — editor wiring and application state
// This module connects the controls in index.html to the rendering
// engine in cover.js. It owns the photo tray, the six panel slots, the
// current selection, drag-to-pan gestures, and the PNG export.

import {
  EXPORT_SIZES,
  GRADES,
  makeEmptyPanel,
  makePanelSet,
  panelIndexAt,
  renderPoster,
  seededOffsets,
} from "./cover.js";
import { coverCanvasSizeForWindow, coverWindowSize, parseShotQuery } from "./shots.js";

const canvas = document.querySelector("#posterCanvas");
const trayEl = document.querySelector("#tray");
const fileInput = document.querySelector("#fileInput");
const titleInput = document.querySelector("#titleInput");
const taglineInput = document.querySelector("#taglineInput");
const gradeSelect = document.querySelector("#gradeSelect");
const sizeSelect = document.querySelector("#sizeSelect");
const zoomRange = document.querySelector("#zoomRange");
const zoomValue = document.querySelector("#zoomValue");
const halftoneToggle = document.querySelector("#halftoneToggle");
const comicToggle = document.querySelector("#comicToggle");
const clearPanelBtn = document.querySelector("#clearPanelBtn");
const shuffleBtn = document.querySelector("#shuffleBtn");
const fillOneBtn = document.querySelector("#fillOneBtn");
const exportBtn = document.querySelector("#exportBtn");
const selectedInfo = document.querySelector("#selectedInfo");
const stageEl = document.querySelector("#stage");
const dropHint = document.querySelector("#dropHint");

const state = {
  title: "Vice Panels",
  tagline: "Six panels. One legend.",
  gradeKey: "vice",
  halftone: false,
  comic: true,
  panels: makePanelSet(),
};

const view = { selected: 0 };
const tray = [];
let armedTrayIndex = -1;
let dragSession = null;

function currentSize() {
  const found = EXPORT_SIZES.find((entry) => entry.id === sizeSelect.value);
  return found || EXPORT_SIZES[0];
}

function applyCanvasSize(width, height) {
  canvas.width = width;
  canvas.height = height;
}

function redraw() {
  renderPoster(canvas, state, view);
  refreshPanelControls();
}

function refreshPanelControls() {
  const panel = state.panels[view.selected];
  const hasPhoto = Boolean(panel && panel.image);
  selectedInfo.textContent = hasPhoto
    ? `Panel ${view.selected + 1} — ${panel.label || "photo"} · drag on the poster to pan`
    : `Panel ${view.selected + 1} — empty · pick a tray photo, then click this panel`;
  zoomRange.value = String(panel ? Math.round((panel.zoom || 1) * 100) : 100);
  zoomValue.textContent = `${zoomRange.value}%`;
  clearPanelBtn.disabled = !hasPhoto;
  document.querySelectorAll(".tray-item").forEach((node, idx) => {
    node.classList.toggle("armed", idx === armedTrayIndex);
  });
  document.querySelectorAll(".panel-chip").forEach((node, idx) => {
    node.classList.toggle("active", idx === view.selected);
  });
}

function buildPanelChips() {
  const host = document.querySelector("#panelChips");
  host.innerHTML = "";
  state.panels.forEach((_, index) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "panel-chip";
    chip.textContent = `Panel ${index + 1}`;
    chip.addEventListener("click", () => {
      view.selected = index;
      redraw();
    });
    host.appendChild(chip);
  });
}

function renderTray() {
  trayEl.innerHTML = "";
  tray.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tray-item";
    const thumb = document.createElement("img");
    thumb.src = item.thumbSrc;
    thumb.alt = item.label;
    const caption = document.createElement("span");
    caption.textContent = item.label;
    btn.appendChild(thumb);
    btn.appendChild(caption);
    btn.addEventListener("click", () => {
      armedTrayIndex = armedTrayIndex === index ? -1 : index;
      if (armedTrayIndex >= 0) {
        selectedInfo.textContent = `“${item.label}” ready — now click a panel on the poster`;
      }
      refreshPanelControls();
    });
    trayEl.appendChild(btn);
  });
  refreshPanelControls();
}

function addToTray(image, label, thumbSrc) {
  tray.push({ image, label, thumbSrc });
  renderTray();
  return tray.length - 1;
}

function loadImageFromSrc(src, label) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(addToTray(image, label, src));
    image.onerror = reject;
    image.src = src;
  });
}

function loadImageFromFile(file) {
  const url = URL.createObjectURL(file);
  return loadImageFromSrc(url, file.name.replace(/\.[^.]+$/, ""));
}

function assignTrayToPanel(trayIndex, panelIndex) {
  const item = tray[trayIndex];
  if (!item) {
    return;
  }
  const panel = state.panels[panelIndex];
  panel.image = item.image;
  panel.label = item.label;
  panel.offsetX = 0;
  panel.offsetY = 0;
  panel.zoom = 1;
}

function fillAllPanelsWith(trayIndex, seed) {
  const item = tray[trayIndex];
  if (!item) {
    return;
  }
  const variations = seededOffsets(seed ?? 11, state.panels.length);
  state.panels.forEach((panel, index) => {
    panel.image = item.image;
    panel.label = item.label;
    panel.offsetX = variations[index].offsetX;
    panel.offsetY = variations[index].offsetY;
    panel.zoom = variations[index].zoom;
  });
  redraw();
}

function canvasPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  const px = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
  const py = ((event.clientY - bounds.top) / bounds.height) * canvas.height;
  return { px, py };
}

canvas.addEventListener("pointerdown", (event) => {
  const { px, py } = canvasPoint(event);
  const index = panelIndexAt(canvas.width, canvas.height, px, py);
  if (armedTrayIndex >= 0) {
    assignTrayToPanel(armedTrayIndex, index);
    view.selected = index;
    armedTrayIndex = -1;
    redraw();
    return;
  }
  view.selected = index;
  const panel = state.panels[index];
  if (panel && panel.image) {
    dragSession = {
      panelIndex: index,
      startX: event.clientX,
      startY: event.clientY,
      originX: panel.offsetX,
      originY: panel.offsetY,
    };
    canvas.setPointerCapture(event.pointerId);
  }
  redraw();
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragSession) {
    return;
  }
  const bounds = canvas.getBoundingClientRect();
  const panel = state.panels[dragSession.panelIndex];
  const dx = ((event.clientX - dragSession.startX) / bounds.width) * 2.4;
  const dy = ((event.clientY - dragSession.startY) / bounds.height) * 2.4;
  panel.offsetX = Math.max(-1, Math.min(1, dragSession.originX + dx));
  panel.offsetY = Math.max(-1, Math.min(1, dragSession.originY + dy));
  redraw();
});

function endDrag() {
  dragSession = null;
}

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

function acceptFiles(fileList) {
  const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
  if (!files.length) {
    return;
  }
  let firstNewIndex = -1;
  const jobs = files.map((file, i) =>
    loadImageFromFile(file).then((idx) => {
      if (i === 0) {
        firstNewIndex = idx;
      }
    }).catch(() => {}),
  );
  Promise.all(jobs).then(() => {
    if (firstNewIndex >= 0 && !state.panels.some((p) => p.image)) {
      fillAllPanelsWith(firstNewIndex, 5);
    }
    redraw();
  });
}

fileInput.addEventListener("change", () => {
  acceptFiles(fileInput.files);
  fileInput.value = "";
});

for (const eventName of ["dragenter", "dragover"]) {
  stageEl.addEventListener(eventName, (event) => {
    event.preventDefault();
    stageEl.classList.add("dragging");
    dropHint.textContent = "Drop photos to add them to the tray";
  });
}
for (const eventName of ["dragleave", "drop"]) {
  stageEl.addEventListener(eventName, (event) => {
    event.preventDefault();
    stageEl.classList.remove("dragging");
    dropHint.textContent = "Drag photos here, or use Add Photos";
  });
}
stageEl.addEventListener("drop", (event) => {
  acceptFiles(event.dataTransfer ? event.dataTransfer.files : []);
});

titleInput.addEventListener("input", () => {
  state.title = titleInput.value;
  redraw();
});
taglineInput.addEventListener("input", () => {
  state.tagline = taglineInput.value;
  redraw();
});
gradeSelect.addEventListener("change", () => {
  state.gradeKey = gradeSelect.value;
  redraw();
});
halftoneToggle.addEventListener("change", () => {
  state.halftone = halftoneToggle.checked;
  redraw();
});
comicToggle.addEventListener("change", () => {
  state.comic = comicToggle.checked;
  redraw();
});
sizeSelect.addEventListener("change", () => {
  const size = currentSize();
  applyCanvasSize(size.width, size.height);
  redraw();
});
zoomRange.addEventListener("input", () => {
  const panel = state.panels[view.selected];
  if (panel) {
    panel.zoom = Number(zoomRange.value) / 100;
  }
  zoomValue.textContent = `${zoomRange.value}%`;
  redraw();
});
clearPanelBtn.addEventListener("click", () => {
  state.panels[view.selected] = makeEmptyPanel();
  redraw();
});
shuffleBtn.addEventListener("click", () => {
  // One click, a fresh collage rhythm: every filled panel keeps its photo
  // but jumps to a new crop, so a single photo can be re-rolled until the
  // six frames sit well together.
  const variations = seededOffsets(Date.now() % 100000, state.panels.length);
  state.panels.forEach((panel, index) => {
    if (!panel.image) {
      return;
    }
    panel.offsetX = variations[index].offsetX;
    panel.offsetY = variations[index].offsetY;
    panel.zoom = variations[index].zoom;
  });
  redraw();
});
fillOneBtn.addEventListener("click", () => {
  const source = armedTrayIndex >= 0 ? armedTrayIndex : tray.length - 1;
  if (source >= 0) {
    fillAllPanelsWith(source, Date.now() % 97);
  }
});

exportBtn.addEventListener("click", () => {
  // Export renders without the selection dashes, then restores the editor view.
  const savedSelection = view.selected;
  view.selected = -1;
  renderPoster(canvas, state, view);
  canvas.toBlob((blob) => {
    view.selected = savedSelection;
    redraw();
    if (!blob) {
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slug = (state.title || "vice-panels").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    link.href = url;
    link.download = `${slug || "vice-panels"}-${canvas.width}x${canvas.height}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, "image/png");
});

document.addEventListener("keydown", (event) => {
  if (event.target && (event.target.tagName === "INPUT" || event.target.tagName === "SELECT")) {
    return;
  }
  if (event.key === "e" || event.key === "E") {
    exportBtn.click();
  }
  if (event.key >= "1" && event.key <= "6") {
    view.selected = Number(event.key) - 1;
    redraw();
  }
});

function populateGradeSelect() {
  gradeSelect.innerHTML = "";
  Object.entries(GRADES).forEach(([key, grade]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = grade.label;
    gradeSelect.appendChild(option);
  });
  gradeSelect.value = state.gradeKey;
}

function populateSizeSelect() {
  sizeSelect.innerHTML = "";
  EXPORT_SIZES.forEach((size) => {
    const option = document.createElement("option");
    option.value = size.id;
    option.textContent = size.label;
    sizeSelect.appendChild(option);
  });
  sizeSelect.value = "square";
}

async function stageShotScene(shot) {
  document.body.classList.add(shot.isCover ? "shot-cover" : "shot-editor");
  titleInput.value = shot.caption;
  state.title = shot.caption;
  if (shot.isCover) {
    const win = coverWindowSize();
    const size = coverCanvasSizeForWindow(win.w, win.h);
    applyCanvasSize(size.width, size.height);
    // Pin the displayed poster to the full window, not just the layout
    // viewport, so no stage background peeks out in the capture.
    canvas.style.width = `${win.w}px`;
    canvas.style.height = `${win.h}px`;
    canvas.style.position = "fixed";
    canvas.style.left = "0";
    canvas.style.top = "0";
  }
  const trayIndex = await loadImageFromSrc(shot.photoPath, shot.photo);
  fillAllPanelsWith(trayIndex, shot.seed);
  if (shot.isCover) {
    // A cover scene is a finished poster: no editor selection marks.
    view.selected = -1;
  }
  redraw();
}

async function boot() {
  populateGradeSelect();
  populateSizeSelect();
  buildPanelChips();
  const size = currentSize();
  applyCanvasSize(size.width, size.height);
  titleInput.value = state.title;
  taglineInput.value = state.tagline;
  comicToggle.checked = state.comic;
  halftoneToggle.checked = state.halftone;
  redraw();
  const shot = parseShotQuery(window.location.search);
  if (shot) {
    try {
      await stageShotScene(shot);
    } catch {
      redraw();
    }
    return;
  }
  // Everyday start: both bundled samples wait in the tray, ready to use.
  try {
    await loadImageFromSrc("samples/boulevard.jpg", "Boulevard");
    await loadImageFromSrc("samples/pier.jpg", "Pier");
  } catch {
    // The tray simply stays shorter if a sample is missing.
  }
  redraw();
}

boot();
