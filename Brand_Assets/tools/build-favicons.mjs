// Builds the site's favicon set from the approved ALV symbol.
//
//   node Brand_Assets/tools/build-favicons.mjs
//
// The symbol geometry is the original Dark Precision drawing, unchanged (100
// grid: two raked slabs, seam y57-63, the A knocked out). Colours are the
// Screen Light neutrals only - the room (#0B0B0B) and the key-light ink
// (#F2F1EE) - never an accent.
//
// Writes into src/assets/brand/:
//   alv-favicon.svg        adaptive: ink flips with the tab's colour scheme,
//                          tight crop so the A keeps its weight at 16px
//   alv-favicon-32.png     fallback for browsers without SVG favicons
//   alv-favicon-48.png     multiple of 48, what search results ask for
//   alv-badge-180.png      apple-touch-icon (opaque square; iOS rounds it)
//   alv-badge-256.png      structured-data logo; the same tile, rounded
import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = resolve(ROOT, "src/assets/brand");
mkdirSync(OUT, { recursive: true });

const ROOM = "#0B0B0B";
const INK = "#F2F1EE";

const SLABS = `<path d="M17.25 6 L95.25 6 L88.01 57 L10.01 57 Z"/><path d="M9.15 63 L87.15 63 L82.75 94 L4.75 94 Z"/>`;
const CUT = `<mask id="c" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#fff"/><path fill="#000" d="M44 19 L56 19 L78 83 L60 83 L50 33 L40 83 L22 83 Z"/></mask>`;
// The favicon crop: tighter than the master's clear space.
const CROP = { x: 2, y: 3, w: 96, h: 94 };

// Adaptive, transparent: ink in a dark tab, room-black in a light one.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}" role="img" aria-label="ALVSolutions"><style>.s{fill:${ROOM}}@media (prefers-color-scheme:dark){.s{fill:${INK}}}</style><defs>${CUT}</defs><g class="s" mask="url(#c)">${SLABS}</g></svg>\n`;
writeFileSync(resolve(OUT, "alv-favicon.svg"), svg);

// A tile: the symbol, centred, on the room. `fill` is how much of the tile's
// width the symbol takes; `radius` is a fraction of the tile.
const tile = (size, fill, radius) => {
  const sw = size * fill;
  const sh = (sw * CROP.h) / CROP.w;
  const x = (size - sw) / 2;
  const y = (size - sh) / 2;
  return `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<defs>${CUT}</defs>
<rect width="${size}" height="${size}" rx="${size * radius}" fill="${ROOM}"/>
<svg x="${x}" y="${y}" width="${sw}" height="${sh}" viewBox="${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}"><g fill="${INK}" mask="url(#c)">${SLABS}</g></svg>
</svg>`;
};

const OUTPUTS = [
  ["alv-favicon-32.png", 32, 0.82, 0.16],
  ["alv-favicon-48.png", 48, 0.82, 0.16],
  ["alv-badge-180.png", 180, 0.66, 0],
  ["alv-badge-256.png", 256, 0.66, 0.2],
];

const browser = await puppeteer.launch();
try {
  for (const [name, size, fill, radius] of OUTPUTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(tile(size, fill, radius));
    await page.screenshot({ path: resolve(OUT, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    console.log("wrote", name);
  }
} finally {
  await browser.close();
}
console.log("wrote alv-favicon.svg");
