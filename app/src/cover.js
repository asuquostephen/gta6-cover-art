// Vice Panels — canvas rendering engine
// This module owns everything that happens on the poster canvas itself:
// the panel grid geometry, the colour grades, the per-panel photo fitting,
// the halftone and comic-edge overlays, and the bold caption lettering.
// It has no DOM wiring of its own beyond the canvas it is handed, which
// keeps the drawing logic separate from the editor controls.

export const EXPORT_SIZES = [
  { id: "square", label: "Square — 1080 × 1080", width: 1080, height: 1080 },
  { id: "portrait", label: "Portrait — 1080 × 1350", width: 1080, height: 1350 },
  { id: "wide", label: "Wide — 1920 × 1080", width: 1920, height: 1080 },
];

export const GRADES = {
  vice: {
    label: "Vice Sunset",
    filter: "saturate(1.45) contrast(1.12) brightness(1.04) hue-rotate(-8deg)",
    washFrom: "rgba(255, 94, 58, 0.28)",
    washTo: "rgba(255, 45, 149, 0.30)",
    accent: "#ff2d95",
    accentSoft: "#ffb347",
    sky: "#2b1055",
  },
  neon: {
    label: "Neon Nights",
    filter: "saturate(1.7) contrast(1.22) brightness(0.98) hue-rotate(18deg)",
    washFrom: "rgba(0, 229, 255, 0.24)",
    washTo: "rgba(176, 38, 255, 0.34)",
    accent: "#00e5ff",
    accentSoft: "#b026ff",
    sky: "#0b0620",
  },
  beach: {
    label: "Beach Day",
    filter: "saturate(1.25) contrast(1.02) brightness(1.14) hue-rotate(0deg)",
    washFrom: "rgba(255, 236, 170, 0.20)",
    washTo: "rgba(64, 196, 255, 0.22)",
    accent: "#ff9f1c",
    accentSoft: "#2ec4e6",
    sky: "#7ed6ff",
  },
  midnight: {
    label: "Midnight Crime",
    filter: "saturate(0.82) contrast(1.32) brightness(0.86) hue-rotate(6deg)",
    washFrom: "rgba(10, 20, 60, 0.34)",
    washTo: "rgba(0, 0, 0, 0.42)",
    accent: "#e63946",
    accentSoft: "#457b9d",
    sky: "#05070f",
  },
  goldenhour: {
    label: "Golden Hour",
    filter: "saturate(1.35) contrast(1.08) brightness(1.08) sepia(0.22)",
    washFrom: "rgba(255, 183, 77, 0.26)",
    washTo: "rgba(214, 90, 40, 0.26)",
    accent: "#ffb703",
    accentSoft: "#fb8500",
    sky: "#3d1d02",
  },
};

export function layoutForSize(width, height) {
  if (height > width) {
    return { cols: 2, rows: 3 };
  }
  return { cols: 3, rows: 2 };
}

export function panelCount() {
  return 6;
}

export function makeEmptyPanel() {
  return { image: null, label: "", offsetX: 0, offsetY: 0, zoom: 1 };
}

export function makePanelSet() {
  const set = [];
  for (let i = 0; i < panelCount(); i += 1) {
    set.push(makeEmptyPanel());
  }
  return set;
}

export function seededOffsets(seed, count) {
  let state = ((Number(seed) || 7) * 2654435761) % 4294967296;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const result = [];
  for (let i = 0; i < count; i += 1) {
    result.push({
      offsetX: (next() - 0.5) * 0.55,
      offsetY: (next() - 0.5) * 0.55,
      zoom: 1.08 + next() * 0.55,
    });
  }
  return result;
}

export function panelRects(width, height, gap) {
  const layout = layoutForSize(width, height);
  const rects = [];
  const cellW = width / layout.cols;
  const cellH = height / layout.rows;
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      rects.push({
        x: col * cellW + gap / 2,
        y: row * cellH + gap / 2,
        w: cellW - gap,
        h: cellH - gap,
        col,
        row,
      });
    }
  }
  return rects;
}

export function panelIndexAt(width, height, px, py) {
  const layout = layoutForSize(width, height);
  const col = Math.min(layout.cols - 1, Math.max(0, Math.floor(px / (width / layout.cols))));
  const row = Math.min(layout.rows - 1, Math.max(0, Math.floor(py / (height / layout.rows))));
  return row * layout.cols + col;
}

function drawCoverImage(ctx, image, rect, panel) {
  const zoom = Math.max(1, panel.zoom || 1);
  const scale = Math.max(rect.w / image.naturalWidth, rect.h / image.naturalHeight) * zoom;
  const drawW = image.naturalWidth * scale;
  const drawH = image.naturalHeight * scale;
  const spareX = drawW - rect.w;
  const spareY = drawH - rect.h;
  const centreX = rect.x + rect.w / 2;
  const centreY = rect.y + rect.h / 2;
  const drawX = centreX - drawW / 2 + (panel.offsetX || 0) * spareX * 0.5;
  const drawY = centreY - drawH / 2 + (panel.offsetY || 0) * spareY * 0.5;
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
}

function paintPlaceholder(ctx, rect, index, grade) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, grade.washFrom);
  grad.addColorStop(1, grade.washTo);
  ctx.fillStyle = grade.sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${Math.round(rect.h * 0.42)}px 'Arial Narrow', Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(index + 1), rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
}

function paintGradeWash(ctx, rect, grade) {
  const grad = ctx.createLinearGradient(rect.x, rect.y + rect.h, rect.x + rect.w, rect.y);
  grad.addColorStop(0, grade.washFrom);
  grad.addColorStop(0.55, "rgba(0, 0, 0, 0)");
  grad.addColorStop(1, grade.washTo);
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function paintHalftone(ctx, rect, width) {
  const step = Math.max(14, Math.round(width / 72));
  const maxR = step * 0.34;
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.30)";
  for (let y = rect.y + step / 2; y < rect.y + rect.h; y += step) {
    for (let x = rect.x + step / 2; x < rect.x + rect.w; x += step) {
      const down = (y - rect.y) / rect.h;
      const across = (x - rect.x) / rect.w;
      const r = maxR * (0.25 + 0.75 * ((down + across) / 2));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function paintComicEdges(ctx, rect) {
  const depth = Math.min(rect.w, rect.h) * 0.16;
  ctx.save();
  const top = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + depth);
  top.addColorStop(0, "rgba(0, 0, 0, 0.42)");
  top.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = top;
  ctx.fillRect(rect.x, rect.y, rect.w, depth);
  const bottom = ctx.createLinearGradient(rect.x, rect.y + rect.h, rect.x, rect.y + rect.h - depth);
  bottom.addColorStop(0, "rgba(0, 0, 0, 0.42)");
  bottom.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = bottom;
  ctx.fillRect(rect.x, rect.y + rect.h - depth, rect.w, depth);
  const left = ctx.createLinearGradient(rect.x, rect.y, rect.x + depth, rect.y);
  left.addColorStop(0, "rgba(0, 0, 0, 0.36)");
  left.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = left;
  ctx.fillRect(rect.x, rect.y, depth, rect.h);
  const right = ctx.createLinearGradient(rect.x + rect.w, rect.y, rect.x + rect.w - depth, rect.y);
  right.addColorStop(0, "rgba(0, 0, 0, 0.36)");
  right.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = right;
  ctx.fillRect(rect.x + rect.w - depth, rect.y, depth, rect.h);
  ctx.restore();
}

function drawPanel(ctx, rect, panel, index, grade, options) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (panel.image && panel.image.complete && panel.image.naturalWidth > 0) {
    ctx.filter = grade.filter;
    drawCoverImage(ctx, panel.image, rect, panel);
    ctx.filter = "none";
    paintGradeWash(ctx, rect, grade);
  } else {
    paintPlaceholder(ctx, rect, index, grade);
  }
  if (options.halftone) {
    paintHalftone(ctx, rect, options.posterWidth);
  }
  if (options.comic) {
    paintComicEdges(ctx, rect);
  }
  ctx.restore();
}

function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  const family = "'Arial Narrow', Impact, 'Franklin Gothic Medium', sans-serif";
  while (size > 28) {
    ctx.font = `900 ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) {
      break;
    }
    size -= 4;
  }
  return size;
}

function drawTitle(ctx, text, width, height, grade) {
  const clean = (text || "").trim();
  if (!clean) {
    return 0;
  }
  const upper = clean.toUpperCase();
  const margin = width * 0.055;
  const startSize = Math.round(width * 0.145);
  const size = fitTitleSize(ctx, upper, width - margin * 2, startSize);
  const family = "'Arial Narrow', Impact, 'Franklin Gothic Medium', sans-serif";
  ctx.save();
  ctx.font = `900 ${size}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const y = height * 0.035;
  const cx = width / 2;
  const lift = Math.max(4, Math.round(size * 0.07));
  ctx.fillStyle = grade.accent;
  ctx.fillText(upper, cx + lift, y + lift);
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(6, size * 0.14);
  ctx.strokeStyle = "#050505";
  ctx.strokeText(upper, cx, y);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(upper, cx, y);
  ctx.restore();
  return y + size;
}

function drawTaglinePill(ctx, text, width, height, grade) {
  const clean = (text || "").trim();
  if (!clean) {
    return;
  }
  const upper = clean.toUpperCase();
  const fontSize = Math.max(22, Math.round(width * 0.032));
  ctx.save();
  ctx.font = `700 ${fontSize}px 'Arial Narrow', 'Franklin Gothic Medium', sans-serif`;
  const textW = ctx.measureText(upper).width;
  const padX = fontSize * 0.9;
  const pillW = textW + padX * 2;
  const pillH = fontSize * 1.85;
  const x = (width - pillW) / 2;
  const y = height - pillH - height * 0.045;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, pillW, pillH, pillH / 2);
  } else {
    ctx.rect(x, y, pillW, pillH);
  }
  ctx.fillStyle = grade.accent;
  ctx.fill();
  ctx.lineWidth = Math.max(3, fontSize * 0.12);
  ctx.strokeStyle = "#050505";
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(upper, width / 2, y + pillH / 2 + 1);
  ctx.restore();
}

function drawSelectionFrame(ctx, rect) {
  ctx.save();
  ctx.lineWidth = Math.max(6, rect.w * 0.02);
  ctx.strokeStyle = "#ffe600";
  ctx.setLineDash([22, 14]);
  ctx.strokeRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
  ctx.restore();
}

export function renderPoster(canvas, state, view) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const grade = GRADES[state.gradeKey] || GRADES.vice;
  const gap = Math.max(8, Math.round(width * 0.011));
  ctx.save();
  ctx.filter = "none";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const rects = panelRects(width, height, gap);
  rects.forEach((rect, index) => {
    const panel = state.panels[index] || makeEmptyPanel();
    drawPanel(ctx, rect, panel, index, grade, {
      halftone: Boolean(state.halftone),
      comic: Boolean(state.comic),
      posterWidth: width,
    });
  });
  const scrim = ctx.createLinearGradient(0, 0, 0, height * 0.24);
  scrim.addColorStop(0, "rgba(0, 0, 0, 0.38)");
  scrim.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height * 0.24);
  drawTitle(ctx, state.title, width, height, grade);
  drawTaglinePill(ctx, state.tagline, width, height, grade);
  if (view && typeof view.selected === "number" && view.selected >= 0 && rects[view.selected]) {
    drawSelectionFrame(ctx, rects[view.selected]);
  }
  ctx.restore();
  return rects;
}
