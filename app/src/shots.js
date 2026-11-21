// Vice Panels — deterministic screenshot scenes
// The screenshot harness loads the app with a query string such as
// ?shot=cover&photo=pier&caption=Sunset%20Heist&seed=3 and expects the
// exact same staged poster every time. This module only parses and
// normalises that query; the editor in main.js does the staging itself,
// so normal visits without a shot parameter are completely unaffected.

const KNOWN_PHOTOS = ["boulevard", "pier"];

export function parseShotQuery(search) {
  const raw = typeof search === "string" ? search : window.location.search;
  const params = new URLSearchParams(raw);
  const mode = params.get("shot");
  if (mode !== "cover" && mode !== "editor") {
    return null;
  }
  const requestedPhoto = (params.get("photo") || "pier").toLowerCase();
  const photo = KNOWN_PHOTOS.includes(requestedPhoto) ? requestedPhoto : "pier";
  const captionParam = params.get("caption");
  const caption = captionParam && captionParam.trim() ? captionParam.trim() : "Vice Panels";
  const seedParam = Number.parseInt(params.get("seed") || "7", 10);
  const seed = Number.isFinite(seedParam) ? seedParam : 7;
  return {
    mode,
    photo,
    photoPath: `samples/${photo}.jpg`,
    caption,
    seed,
    isCover: mode === "cover",
    isEditor: mode === "editor",
  };
}

export function shotLayoutForWindow(winWidth, winHeight) {
  // The cover scene picks its panel grid from the window shape, matching
  // the export rule: portrait windows get the tall 2 by 3 arrangement.
  if (winHeight > winWidth) {
    return { cols: 2, rows: 3, portrait: true };
  }
  return { cols: 3, rows: 2, portrait: false };
}

export function coverWindowSize() {
  // Headless screenshot windows report an inner height shorter than the
  // window itself, while the outer size matches the requested window.
  // Prefer the outer size so a cover poster truly fills its frame.
  const w = window.outerWidth || window.innerWidth;
  const h = window.outerHeight || window.innerHeight;
  return { w, h };
}

export function coverCanvasSizeForWindow(winWidth, winHeight) {
  // In cover mode the poster fills the window, but the backing canvas
  // still renders at a crisp resolution proportional to that window.
  const longSide = 1280;
  if (winWidth === winHeight) {
    return { width: 1080, height: 1080 };
  }
  if (winHeight > winWidth) {
    return { width: 1024, height: 1280 };
  }
  const ratio = winHeight / winWidth;
  return { width: longSide, height: Math.round(longSide * ratio) };
}
