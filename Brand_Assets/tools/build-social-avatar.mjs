// Builds the ALVSolutions social profile image into Brand_Assets/ALVSolutions_Social_Avatar/.
//
//   node Brand_Assets/tools/build-social-avatar.mjs
//
// One master for every platform: the locked ALV symbol, flat #F2F1EE, centred on a flat
// #0B0B0B square, symbol-only. The symbol path is read from the locked master logo SVG and
// only positioned and scaled here (its shapes are never edited).
//
//   canvas   1000 x 1000 units (the SVG); PNGs are opaque squares
//   symbol   visible width = 56% of the canvas. The ink is 90.5 grid units wide, so scale =
//            560 / 90.5. The ink box is centred on the canvas (grid x 4.75-95.25, y 6-94).
//   safe     the farthest ink corner is 63.12 grid units from the symbol centre; at this
//            scale that is 78.1% of a circular crop's radius.
//
// Regenerates svg/ and png/ only; README.md in the output folder is hand-written.
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = resolve(ROOT, "Brand_Assets/ALVSolutions_Social_Avatar");
const MASTER = resolve(ROOT, "Brand_Assets/ALVSolutions_Master_Logo/svg/alvsolutions-symbol-light.svg");

const ROOM = "#0B0B0B", KEY = "#F2F1EE";
const CANVAS = 1000;
const INK_W = 90.5; // symbol ink width on its grid (x 4.75 to 95.25)
const SCALE = (0.56 * CANVAS) / INK_W;
const SIZES = [2000, 1000, 512, 400, 320];

const d = readFileSync(MASTER, "utf8").match(/<path fill="[^"]+" d="([^"]+)"/)[1];
// The master path is absolute M/L/Z only: scale each coordinate pair about the grid centre (50, 50).
const n = (v) => +v.toFixed(3);
const placed = d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_, x, y) => `${n(CANVAS / 2 + (x - 50) * SCALE)} ${n(CANVAS / 2 + (y - 50) * SCALE)}`);
if (/[^MLZ0-9. -]/.test(d)) throw new Error("master symbol path has commands other than M/L/Z; extend the placer");

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}" role="img" aria-labelledby="t d">\n` +
  `  <title id="t">ALVSolutions social avatar</title>\n` +
  `  <desc id="d">The ALV symbol in ${KEY} centred on a ${ROOM} square, 56% of the width. Symbol only.</desc>\n` +
  `  <rect width="${CANVAS}" height="${CANVAS}" fill="${ROOM}"/>\n` +
  `  <path fill="${KEY}" d="${placed}"/>\n</svg>\n`;

for (const dir of ["svg", "png"]) rmSync(resolve(OUT, dir), { recursive: true, force: true });
mkdirSync(resolve(OUT, "svg"), { recursive: true });
mkdirSync(resolve(OUT, "png"), { recursive: true });
writeFileSync(resolve(OUT, "svg/alvsolutions-avatar.svg"), svg);

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
try {
  for (const px of SIZES) {
    const page = await browser.newPage();
    await page.setViewport({ width: px, height: px, deviceScaleFactor: 1 });
    await page.setContent(`<body style="margin:0;background:${ROOM}"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" style="display:block;width:${px}px;height:${px}px">`);
    const file = `alvsolutions-avatar-${px}.png`;
    await page.screenshot({ path: resolve(OUT, "png", file), clip: { x: 0, y: 0, width: px, height: px } }); // opaque: no omitBackground
    await page.close();
    console.log("wrote png/" + file);
  }
} finally {
  await browser.close();
}
console.log(`wrote svg/alvsolutions-avatar.svg | scale ${SCALE.toFixed(4)} | symbol width ${n(INK_W * SCALE)} of ${CANVAS}`);
