// Builds the ALVSolutions master logo system into Brand_Assets/ALVSolutions_Master_Logo/.
//
//   node Brand_Assets/tools/build-logo-system.mjs
//
// One identity, nothing redrawn:
//   - The symbol is the Dark Precision ALV drawing on its 100 grid (two raked
//     slabs, seam y57-63, the A knocked out). The site cuts the A with a mask;
//     here the cut is worked out exactly and written as plain compound paths,
//     so the files survive Illustrator, Figma, print and embroidery software.
//   - The wordmark is Archivo at weight 640, normal width, -0.024em: the live
//     text of the approved lockup, converted to outlines. Chrome lays out the
//     real lockup (approved CSS in src/styles/identity.css), this script reads
//     the position of every letter and the baseline, and the outlines from
//     tools/logo-system/wordmark-outline.json (extract-wordmark.py) are placed
//     on those numbers. No font is needed to open the results.
//   - Every build ends by rendering the outlines and the live text and
//     comparing them pixel for pixel. It fails if they differ.
//
// Proportions come from the approved lockup, in em (font size = 100 units):
// symbol box 1.6667em square, gap 0.6111em, symbol centred on the line box.
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { createCanvas, loadImage } from "canvas";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = resolve(ROOT, "Brand_Assets/ALVSolutions_Master_Logo");
// Embedded, because a page built with setContent cannot load file:// fonts (it silently falls back).
const FONT_URL = "data:font/woff2;base64," + readFileSync(resolve(ROOT, "src/assets/fonts/Archivo-Variable.woff2")).toString("base64");
const OUTLINE = JSON.parse(readFileSync(resolve(ROOT, "Brand_Assets/tools/logo-system/wordmark-outline.json"), "utf8"));

// Primary identity: the Screen Light inks (--sl-ink1 key light, --sl-room).
// Production monochrome: pure white / pure black for print, vendors, embroidery, signs and
// one-colour reproduction. Utility files, not a palette: they never replace the primary inks.
const INKS = [
  { tone: "light", color: "#F2F1EE", group: "primary", use: "for dark backgrounds" },
  { tone: "dark", color: "#0B0B0B", group: "primary", use: "for light backgrounds" },
  { tone: "production-white", color: "#FFFFFF", group: "production", use: "production monochrome, pure white, for dark backgrounds" },
  { tone: "production-black", color: "#000000", group: "production", use: "production monochrome, pure black, for light backgrounds" },
];
const WIDTHS = [500, 1000, 2000];
const MARGIN_EM = 0.4; // transparent margin around lockups, in em (100 units)
const SYMBOL_CANVAS = 128; // square canvas for the standalone symbol (grid is 100)

// ---------- the symbol, on its 100 grid ----------
// The A: apex (44,19)-(56,19); legs down to y83; inner apex (50,33). Edge x at a given y:
const lerp = (x0, y0, x1, y1, y) => x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
const leftOuter = (y) => lerp(44, 19, 22, 83, y);
const rightOuter = (y) => lerp(56, 19, 78, 83, y);
const leftInner = (y) => lerp(50, 33, 40, 83, y);
const rightInner = (y) => lerp(50, 33, 60, 83, y);
const n = (v) => +v.toFixed(4);
const P = (pts) => "M" + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join("L") + "Z";
// Upper slab (17.25,6 95.25,6 88.01,57 10.01,57) minus the A's outline, plus the
// counter of the A, which stands alone as an island (nothing joins it to the slab).
const SLAB_1 = P([
  [17.25, 6], [95.25, 6], [88.01, 57], [rightOuter(57), 57], [56, 19], [44, 19], [leftOuter(57), 57], [10.01, 57],
]);
const COUNTER = P([[50, 33], [rightInner(57), 57], [leftInner(57), 57]]);
// Lower slab (9.15,63 87.15,63 82.75,94 4.75,94) minus the two legs, which end inside it at y83.
const SLAB_2 = P([
  [9.15, 63], [leftOuter(63), 63], [22, 83], [40, 83], [leftInner(63), 63], [rightInner(63), 63], [60, 83], [78, 83],
  [rightOuter(63), 63], [87.15, 63], [82.75, 94], [4.75, 94],
]);
const SYMBOL_D = SLAB_1 + COUNTER + SLAB_2; // grid units; fill-rule irrelevant (no overlaps)
const SYMBOL_INK = { x0: 4.75, y0: 6, x1: 95.25, y1: 94 };

// ---------- path transform (absolute commands only, as the extractor writes) ----------
function transformPath(d, sx, sy, tx, ty) {
  const tok = d.match(/[MLHVCQZ]|-?\d*\.?\d+(?:e-?\d+)?/g);
  let out = "", i = 0, cmd = "", cx = 0, cy = 0;
  const X = (v) => n(v * sx + tx), Y = (v) => n(v * sy + ty);
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[MLHVCQZ]/.test(tok[i])) cmd = tok[i++];
    if (cmd === "Z") { out += "Z"; continue; }
    if (cmd === "H") { cx = num(); out += `H${X(cx)}`; continue; }
    if (cmd === "V") { cy = num(); out += `V${Y(cy)}`; continue; }
    const count = cmd === "C" ? 3 : cmd === "Q" ? 2 : 1;
    let seg = cmd;
    for (let k = 0; k < count; k++) {
      cx = num(); cy = num();
      seg += `${k ? " " : ""}${X(cx)} ${Y(cy)}`;
    }
    out += seg;
    if (cmd === "M") cmd = "L";
  }
  return out;
}

// ---------- measure the approved lockup in Chrome ----------
const EM_PX = 1000; // measure at 1000px so sub-pixel layout is negligible; 1 em = 100 units
const lockupHTML = (px, color = "#000") => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:"Archivo Logo";src:url("${FONT_URL}") format("woff2-variations");font-weight:100 900;font-display:block}
html,body{margin:0;background:transparent}
.alv-lockup{display:inline-flex;align-items:center;gap:0.6111em;font-size:${px}px;line-height:1;letter-spacing:-0.024em;color:${color};white-space:nowrap;position:absolute;left:0;top:0}
.alv-lockup-mark{width:1.6667em;height:1.6667em;display:block;flex:none;overflow:visible}
.alv-lockup-word{font-family:"Archivo Logo";font-weight:640;font-stretch:100%;line-height:1;display:inline-block}
</style>
<svg width="0" height="0" style="position:absolute"><defs><mask id="alvCut" maskUnits="userSpaceOnUse" x="-40" y="-40" width="180" height="180"><rect x="-40" y="-40" width="180" height="180" fill="#fff"/><path fill="#000" d="M44 19 L56 19 L78 83 L60 83 L50 33 L40 83 L22 83 Z"/></mask></defs></svg>
<span class="alv-lockup" id="l"><svg class="alv-lockup-mark" viewBox="0 0 100 100"><g fill="currentColor" mask="url(#alvCut)"><path d="M17.25 6 L95.25 6 L88.01 57 L10.01 57 Z"/><path d="M9.15 63 L87.15 63 L82.75 94 L4.75 94 Z"/></g></svg><span class="alv-lockup-word" id="w">ALVSolutions<i id="b" style="display:inline-block;width:0;height:0"></i></span></span>`;

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
let geo;
{
  const page = await browser.newPage();
  await page.setViewport({ width: 2400, height: 400 });
  await page.setContent(lockupHTML(EM_PX));
  await page.evaluate(async () => { await document.fonts.load('640 100px "Archivo Logo"', "ALVSolutions"); await document.fonts.ready; });
  geo = await page.evaluate(() => {
    const l = document.getElementById("l").getBoundingClientRect();
    const s = document.querySelector(".alv-lockup-mark").getBoundingClientRect();
    const w = document.getElementById("w");
    const text = w.firstChild;
    const chars = [];
    for (let i = 0; i < text.length; i++) {
      const r = document.createRange();
      r.setStart(text, i); r.setEnd(text, i + 1);
      chars.push(r.getBoundingClientRect().left - l.left);
    }
    const b = document.getElementById("b").getBoundingClientRect();
    return { lockupW: l.width, lockupH: l.height, sym: { x: s.left - l.left, y: s.top - l.top, w: s.width }, chars, baseline: b.bottom - l.top };
  });
  await page.close();
}
const U = 100 / EM_PX; // px -> units
const WORD = OUTLINE.word;
const upm = OUTLINE.unitsPerEm;
const gscale = 100 / upm; // font unit -> unit (1 em = 100 units)

// Wordmark outlines placed at their measured origins; returns path + ink extents.
function wordmarkPath(originX, baselineY) {
  let d = "";
  for (let i = 0; i < WORD.length; i++) {
    const g = OUTLINE.glyphs[WORD[i]];
    d += transformPath(g.d, gscale, -gscale, originX + geo.chars[i] * U, baselineY);
  }
  return d;
}

// ---------- SVG assembly ----------
const fmt = (v) => +(+v).toFixed(3);
const svgDoc = ({ vb, d, color, title, desc }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(fmt).join(" ")}" width="${fmt(vb[2])}" height="${fmt(vb[3])}" role="img" aria-labelledby="t d">\n` +
  `  <title id="t">${title}</title>\n  <desc id="d">${desc}</desc>\n` +
  `  <path fill="${color}" d="${d}"/>\n</svg>\n`;

const symScale = (geo.sym.w * U) / 100; // 1.6667 in the lockup

// Measure ink bounds of a path by rasterising it big (exact enough: 0.05 units).
async function inkBox(d, w, h, ox, oy) {
  const page = await browser.newPage();
  const S = 10; // px per unit
  await page.setViewport({ width: Math.ceil(w * S), height: Math.ceil(h * S) });
  await page.setContent(`<body style="margin:0;background:#fff"><svg width="${w * S}" height="${h * S}" viewBox="${ox} ${oy} ${w} ${h}" style="display:block"><path fill="#000" d="${d}"/></svg>`);
  const buf = await page.screenshot({ type: "png" });
  await page.close();
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height), x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const { data } = x.getImageData(0, 0, img.width, img.height);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let py = 0; py < img.height; py++) for (let px = 0; px < img.width; px++) {
    if (data[(py * img.width + px) * 4] < 128) { x0 = Math.min(x0, px); x1 = Math.max(x1, px + 1); y0 = Math.min(y0, py); y1 = Math.max(y1, py + 1); }
  }
  return { x0: ox + x0 / S, y0: oy + y0 / S, x1: ox + x1 / S, y1: oy + y1 / S };
}

// Horizontal lockup, laid out on the measured geometry (origin = lockup box, em = 100 units).
const symX = geo.sym.x * U, symY = geo.sym.y * U, baseY = geo.baseline * U;
const symbolInLockup = transformPath(SYMBOL_D, symScale, symScale, symX, symY);
const wordD = wordmarkPath(0, baseY);
const H_D = symbolInLockup + wordD;
const lockupW = geo.lockupW * U, lockupH = geo.lockupH * U;
const hInk = await inkBox(H_D, lockupW + 20, lockupH + 20, -10, -10);
const wordInk = await inkBox(wordD, lockupW + 20, lockupH + 20, -10, -10);
const symInk = { x0: symX + SYMBOL_INK.x0 * symScale, x1: symX + SYMBOL_INK.x1 * symScale, y0: symY + SYMBOL_INK.y0 * symScale, y1: symY + SYMBOL_INK.y1 * symScale };
const M = MARGIN_EM * 100;
// PNG canvas: ink plus the transparent margin. SVG master: the ink itself, plus 0.1 unit so
// antialiased edge pixels are never cut (the ink boxes are measured to 0.1 unit).
const padded = (b) => [b.x0 - M, b.y0 - M, b.x1 - b.x0 + 2 * M, b.y1 - b.y0 + 2 * M];
const SAFE = 0.1;
const tightBox = (b) => [b.x0 - SAFE, b.y0 - SAFE, b.x1 - b.x0 + 2 * SAFE, b.y1 - b.y0 + 2 * SAFE];
const H_VB = padded(hInk), H_TIGHT = tightBox(hInk);

// Stacked lockup: symbol centred over the wordmark's ink.
const wordW = wordInk.x1 - wordInk.x0;
const wordCx = (wordInk.x0 + wordInk.x1) / 2;
// Stacked at a symbol scale (mul x the lockup's symbol scale) and an ink gap (units).
// The approved master is Option B: symbol 1.35x the horizontal lockup's symbol scale (its width
// is about 34% of the wordmark's), 62 units between symbol ink and wordmark ink.
async function stackedLockup(mul, gap) {
  const sc = symScale * mul;
  const tx = wordCx - 50 * sc; // symbol ink is centred on x = 50 of its grid
  const ty = wordInk.y0 - gap - SYMBOL_INK.y1 * sc; // wordmark ink top sits `gap` below symbol ink bottom
  const d = transformPath(SYMBOL_D, sc, sc, tx, ty) + wordD;
  const ink = await inkBox(d, lockupW + 40, wordInk.y1 - ty + 60, -20, ty - 20);
  return { d, ink, vb: padded(ink), tight: tightBox(ink) };
}
const STACKED = { mul: 1.35, gap: 62 };
const stackedMaster = await stackedLockup(STACKED.mul, STACKED.gap);
const S_D = stackedMaster.d, sInk = stackedMaster.ink, S_VB = stackedMaster.vb, S_TIGHT = stackedMaster.tight;

// Standalone symbol, square canvas centred on the symbol's ink.
const SY_VB = [50 - SYMBOL_CANVAS / 2, 50 - SYMBOL_CANVAS / 2, SYMBOL_CANVAS, SYMBOL_CANVAS];

const VARIANTS = [
  { id: "horizontal", vb: H_VB, tight: H_TIGHT, d: H_D, name: "ALVSolutions horizontal logo", what: "ALV symbol and ALVSolutions wordmark, horizontal" },
  { id: "stacked", vb: S_VB, tight: S_TIGHT, d: S_D, name: "ALVSolutions stacked logo", what: "ALV symbol above the ALVSolutions wordmark" },
  { id: "symbol", vb: SY_VB, d: SYMBOL_D, name: "ALVSolutions symbol", what: "ALV symbol" },
];

// ---------- write masters + PNG exports ----------
// Clear only the generated folders; README.md in OUT is hand-written and stays.
for (const d of ["svg", "png"]) rmSync(resolve(OUT, d), { recursive: true, force: true });
mkdirSync(resolve(OUT, "svg/production"), { recursive: true });
const report = [];
async function png(svg, w, h, file) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" style="display:block;width:${w}px;height:${h}px">`);
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
}
for (const v of VARIANTS) {
  for (const { tone, color, group, use } of INKS) {
    const pngDir = group === "primary" ? resolve(OUT, "png", v.id) : resolve(OUT, "png/production", v.id);
    mkdirSync(pngDir, { recursive: true });
    const meta = { d: v.d, color, title: `${v.name} (${tone})`, desc: `${v.what}, ${tone} ink ${color}, ${use}.` };
    // Master SVG: tight to the artwork (the symbol keeps its intentional square canvas).
    writeFileSync(resolve(OUT, group === "primary" ? "svg" : "svg/production", `alvsolutions-${v.id}-${tone}.svg`), svgDoc({ ...meta, vb: v.tight ?? v.vb }));
    // PNGs render the padded canvas: file padding only, not brand clear space.
    const svg = svgDoc({ ...meta, vb: v.vb });
    for (const px of WIDTHS) {
      const w = px, h = Math.round(px * (v.vb[3] / v.vb[2]));
      const file = `alvsolutions-${v.id}-${tone}-${px}.png`;
      await png(svg, w, h, resolve(pngDir, file));
      report.push(`${group === "primary" ? "" : "production/"}${v.id}/${file} ${w}x${h}`);
    }
  }
}

// ---------- verification ----------
async function renderPx(html, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(async () => { await document.fonts.load('640 100px "Archivo Logo"', "ALVSolutions"); await document.fonts.ready; });
  const buf = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  const img = await loadImage(buf);
  const c = createCanvas(w, h), x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  return x.getImageData(0, 0, w, h).data;
}
// Pixels of `a` that `b` cannot explain even allowing b to move 1px in any direction.
// (Chrome snaps live text baselines to whole pixels, so an exact diff would flag the
// snap, not the drawing.) w is the image width.
function diff(a, b, w) {
  const h = a.length / 4 / w;
  let bad = 0, max = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = a[(y * w + x) * 4];
    let lo = 255, hi = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = Math.min(h - 1, Math.max(0, y + dy)), xx = Math.min(w - 1, Math.max(0, x + dx));
      const u = b[(yy * w + xx) * 4]; if (u < lo) lo = u; if (u > hi) hi = u;
    }
    const off = Math.max(lo - v, v - hi, 0);
    if (off > max) max = off;
    if (off > 64) bad++;
  }
  return { bad, max };
}
// (1) symbol: compound path vs the site's masked original, at 1000px.
const SZ = 1000;
const symLive = `<body style="margin:0;background:#fff"><svg width="${SZ}" height="${SZ}" viewBox="0 0 100 100" style="display:block"><defs><mask id="alvCut" maskUnits="userSpaceOnUse" x="-40" y="-40" width="180" height="180"><rect x="-40" y="-40" width="180" height="180" fill="#fff"/><path fill="#000" d="M44 19 L56 19 L78 83 L60 83 L50 33 L40 83 L22 83 Z"/></mask></defs><g fill="#000" mask="url(#alvCut)"><path d="M17.25 6 L95.25 6 L88.01 57 L10.01 57 Z"/><path d="M9.15 63 L87.15 63 L82.75 94 L4.75 94 Z"/></g></svg>`;
const symOut = `<body style="margin:0;background:#fff"><svg width="${SZ}" height="${SZ}" viewBox="0 0 100 100" style="display:block"><path fill="#000" d="${SYMBOL_D}"/></svg>`;
const dSym = diff(await renderPx(symLive, SZ, SZ), await renderPx(symOut, SZ, SZ), SZ);
// (2) horizontal lockup: outlines vs live Archivo text, at font-size 200px.
const FS = 400, PAD = FS / 10; // PAD px = 10 units, the viewBox origin below
const W2 = Math.ceil(lockupW * FS / 100) + 2 * PAD, H2 = Math.ceil(lockupH * FS / 100) + 2 * PAD;
const live = lockupHTML(FS).replace("position:absolute;left:0;top:0", `position:absolute;left:${FS / 10}px;top:${FS / 10}px`);
const liveA = await renderPx(`<body style="background:#fff">` + live.replace("<!doctype html>", ""), W2, H2);
const outHtml = `<body style="margin:0;background:#fff"><svg width="${W2}" height="${H2}" viewBox="-10 -10 ${W2 / FS * 100} ${H2 / FS * 100}" style="display:block"><path fill="#000" d="${H_D}"/></svg>`;
const dLock = diff(liveA, await renderPx(outHtml, W2, H2), W2);
console.log("symbol  outline vs site mask   : pixels unexplained (>25%, 1px tolerance):", dSym.bad, " worst", dSym.max);
console.log("lockup  outline vs live Archivo: pixels unexplained (>25%, 1px tolerance):", dLock.bad, " worst", dLock.max);
await browser.close();
if (dSym.bad > 0 || dLock.bad > 0) { console.error("VERIFY FAILED"); process.exit(1); }

console.log("\nmeasured (em = 100 units): symbol box", fmt(geo.sym.w * U), "at", fmt(symX), fmt(symY), "| baseline", fmt(baseY), "| lockup box", fmt(lockupW), "x", fmt(lockupH));
console.log("horizontal ink", Object.values(hInk).map(fmt).join(" "), "| wordmark ink", Object.values(wordInk).map(fmt).join(" "), "| stacked ink", Object.values(sInk).map(fmt).join(" "));
console.log("viewBoxes: horizontal", H_VB.map(fmt).join(" "), "| stacked", S_VB.map(fmt).join(" "), "| symbol", SY_VB.join(" "));
console.log(report.join("\n"));
