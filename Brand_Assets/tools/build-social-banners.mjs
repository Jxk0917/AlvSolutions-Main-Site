// Builds the ALVSolutions social banners into Brand_Assets/ALVSolutions_Social_Banners/.
//
//   node Brand_Assets/tools/build-social-banners.mjs
//
// The approved composition is Option A with the A1 (low) Screen Light bar. It is defined once,
// in composition units, and re-composed for each platform at its own scale and crop. Nothing is
// stretched: the logo, headline, divider and bar keep their relationships everywhere.
//
//   composition (1 unit = 1 px at the master's 3200 x 1200 canvas)
//     lockup 700 wide | 112 | 1 divider (124 tall, 26%) | 112 | headline "Built around your business."
//     92 units of type, Bricolage Grotesque 620, opsz pinned at 92, -0.04em tracking
//     A1 bar: the row's width, 135 units under the row's centre, drawn with the site's own recipe
//     environment: #0B0B0B room, soft wash, one dim horizon at +280 with a faint floor below it
//   the master (s = 1, centre y 520, horizon 800) is the approved artwork exactly. A platform
//   picks a scale s so the row fits its conservative safe area, then centres the composition in
//   that area, using the same offset the master has (row centre = safe centre - 80 s).
//
// The Screen Light bar is the website's: src/styles/tokens.css --sl-bar and --sl-bar-glow, a
// 2px bar with 2px radius as in .wiz-fill, scaled by one factor with the composition
// (x3 at the master, x3 s at a platform). The logo is the locked horizontal-light master SVG
// (Brand_Assets/ALVSolutions_Master_Logo/svg/alvsolutions-horizontal-light.svg), untouched.
// Regenerates master/ facebook/ linkedin/ x/ youtube/ only; README.md there is hand-written.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = resolve(ROOT, "Brand_Assets/ALVSolutions_Social_Banners");
const LOCKUP = readFileSync(resolve(ROOT, "Brand_Assets/ALVSolutions_Master_Logo/svg/alvsolutions-horizontal-light.svg"), "utf8");
const VB = LOCKUP.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
const LD = LOCKUP.match(/<path fill="#F2F1EE" d="([^"]+)"/)[1];
const FONT = "data:font/woff2;base64," + readFileSync(resolve(ROOT, "src/assets/fonts/Bricolage-Grotesque-Variable.woff2")).toString("base64");
const ROOM = "#0B0B0B", KEY = "#F2F1EE";
const HEAD = "Built around your business.";

// ---- composition constants (units at s = 1) ----
const LW = 700, GAP = 112, TYPE = 92;
const BAR_DY = 135, HORIZON_DY = 280, K = 3; // bar and horizon relative to the row centre; bar scale
const ROW_TOP = -64; // lockup half height (about 62) rounded, for centring the extent

// Safe areas (base px) and avatar zones. Sources: see README. Conservative by design.
const PLATFORMS = [
  { id: "master", W: 3200, H: 1200, s: 1, cy: 520, outs: [[3200, 1200, 1, "3200x1200"], [6400, 2400, 2, "6400x2400"]] },
  { id: "facebook", W: 851, H: 315, safe: { x: 146, y: 20, w: 559, h: 275 }, avatar: { x: 0, y: 232, w: 160, h: 83 }, outs: [[851, 315, 1, "851x315"], [1702, 630, 2, "1702x630"]] },
  { id: "linkedin", W: 1512, H: 256, safe: { x: 256, y: 40, w: 1000, h: 176 }, avatar: { x: 0, y: 150, w: 260, h: 106 }, outs: [[1512, 256, 1, "1512x256"], [3024, 512, 2, "3024x512"]] },
  { id: "x", W: 1500, H: 500, safe: { x: 250, y: 70, w: 1000, h: 360 }, avatar: { x: 0, y: 290, w: 300, h: 210 }, outs: [[1500, 500, 1, "1500x500"], [3000, 1000, 2, "3000x1000"]] },
  { id: "youtube", W: 2560, H: 1440, safe: { x: 507, y: 509, w: 1546, h: 423 }, avatar: null, outs: [[2560, 1440, 1, "2560x1440"]] },
];
const FIT = 0.84; // the row and its extent may use this much of the safe area

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-lcd-text", "--font-render-hinting=none", "--disable-gpu", "--disable-gpu-compositing", "--disable-gpu-rasterization", "--disable-threaded-rasterization", "--num-raster-threads=1"] });
const FONTCSS = `@font-face{font-family:"Bricolage Banner";src:url("${FONT}") format("woff2-variations");font-weight:200 800;font-stretch:75% 100%}`;
const TEXTCSS = `font-family:'Bricolage Banner';font-weight:620;letter-spacing:-0.04em;word-spacing:0.07em;font-variation-settings:'opsz' 92;font-optical-sizing:none;text-rendering:geometricPrecision`;

// headline width at 100px type (opsz pinned, so width scales linearly)
const mp = await browser.newPage();
await mp.setContent(`<style>${FONTCSS}</style><svg width="3000" height="300"><text id="t" x="0" y="200" font-size="100" style="${TEXTCSS}">${HEAD}</text></svg>`);
await mp.evaluate(async () => { await document.fonts.load('620 100px "Bricolage Banner"', "Built"); await document.fonts.ready; });
const W100 = await mp.evaluate(() => document.getElementById("t").getBBox().width);
await mp.close();
const headW = (size) => (W100 * size) / 100;
const LH = (LW * VB[3]) / VB[2];

function layout(p) {
  let s = p.s, cy = p.cy;
  if (!p.safe) return { s, cy };
  const rowW1 = LW + GAP * 2 + 1 + headW(TYPE); // row width at s = 1
  s = Math.min((FIT * p.safe.w) / rowW1, (FIT * p.safe.h) / (HORIZON_DY - ROW_TOP));
  cy = p.safe.y + p.safe.h / 2 - 80 * s;
  return { s, cy };
}

function scene(p) {
  const { s, cy } = layout(p);
  const W = p.W, H = p.H;
  const rowW = (LW + GAP * 2 + 1) * s + headW(TYPE) * s;
  const x0 = W / 2 - rowW / 2;
  const horizon = cy + HORIZON_DY * s;
  const u = s; // 1 composition unit in base px
  const barH = 2 * K * u, barY = cy + BAR_DY * u;
  const wr = 0.47 * W; // wash radius: the master's 1500 of 3200
  const lockX = x0, lockY = cy - (LH * u) / 2, lockW = LW * u;
  const divX = x0 + lockW + GAP * u, headX = divX + 1 * u + GAP * u;
  const floorH = Math.min(400 * u, H - horizon);
  const lineH = Math.max(1, 2 * u);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:0;top:0">
<defs>
<linearGradient id="hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${KEY}"/><stop offset="1" stop-color="#c4c3bf"/></linearGradient>
<radialGradient id="w" gradientUnits="userSpaceOnUse" cx="${W / 2}" cy="${cy - 50 * u}" r="${wr}"><stop offset="0" stop-color="${KEY}" stop-opacity="0.05"/><stop offset="0.6" stop-color="${KEY}" stop-opacity="0.0175"/><stop offset="1" stop-color="${KEY}" stop-opacity="0"/></radialGradient>
<linearGradient id="e" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${KEY}" stop-opacity="0"/><stop offset="0.5" stop-color="${KEY}" stop-opacity="0.55"/><stop offset="1" stop-color="${KEY}" stop-opacity="0"/></linearGradient>
<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${KEY}" stop-opacity="0.04"/><stop offset="1" stop-color="${KEY}" stop-opacity="0"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="${ROOM}"/><rect width="${W}" height="${H}" fill="url(#w)"/>
<rect y="${horizon}" width="${W}" height="${floorH}" fill="url(#f)"/>
<rect y="${horizon - lineH / 2}" width="${W}" height="${lineH}" fill="url(#e)"/>
<svg x="${lockX}" y="${lockY}" width="${lockW}" height="${LH * u}" viewBox="${VB.join(" ")}"><path fill="${KEY}" d="${LD}"/></svg>
<rect x="${divX}" y="${cy - 62 * u}" width="${Math.max(1, u)}" height="${124 * u}" fill="${KEY}" fill-opacity="0.26"/>
<text x="${headX}" y="${cy + 0.35 * TYPE * u}" font-size="${TYPE * u}" fill="url(#hl)" style="${TEXTCSS}">${HEAD}</text>
</svg>`;
  // The website bar, exactly (tokens.css --sl-bar / --sl-bar-glow), every length scaled by K * s.
  const k = K * u;
  const bar = `<i style="position:absolute;display:block;left:${x0}px;width:${rowW}px;top:${barY - barH / 2}px;height:${barH}px;border-radius:${barH}px;
background:oklch(0.97 0.03 245);
box-shadow:0 0 ${6 * k}px oklch(0.92 0.08 245 / 0.85), 0 0 ${18 * k}px ${1 * k}px oklch(0.8 0.15 245 / 0.42), 0 0 ${44 * k}px ${4 * k}px oklch(0.74 0.15 245 / 0.14)"></i>`;
  const html = `<!doctype html><meta charset="utf-8"><style>${FONTCSS}html,body{margin:0;background:${ROOM}}#c{position:relative;width:${W}px;height:${H}px;overflow:hidden}</style><div id="c">${svg}${bar}</div>`;
  return { html, s, cy, rowW, x0, barY, horizon };
}

// ---- build ----
for (const d of ["master", "facebook", "linkedin", "x", "youtube"]) rmSync(resolve(OUT, d), { recursive: true, force: true });
const manifest = [];
for (const p of PLATFORMS) {
  mkdirSync(resolve(OUT, p.id), { recursive: true });
  const sc = scene(p);
  for (const [w, h, dsf, tag] of p.outs) {
    const page = await browser.newPage();
    await page.setViewport({ width: p.W, height: p.H, deviceScaleFactor: dsf });
    await page.setContent(sc.html);
    await page.evaluate(async () => { await document.fonts.load('620 92px "Bricolage Banner"', "Built"); await document.fonts.ready; });
    const file = `alvsolutions-${p.id === "x" ? "x-header" : p.id === "youtube" ? "youtube-banner" : p.id === "master" ? "banner-master" : p.id + "-cover"}-${tag}.png`;
    await page.screenshot({ path: resolve(OUT, p.id, file), clip: { x: 0, y: 0, width: p.W, height: p.H } });
    await page.close();
    manifest.push({ platform: p.id, file, w, h, s: +sc.s.toFixed(4), cy: +sc.cy.toFixed(2), rowW: +sc.rowW.toFixed(1), x0: +sc.x0.toFixed(1), barY: +sc.barY.toFixed(1), horizon: +sc.horizon.toFixed(1), safe: p.safe, avatar: p.avatar, base: [p.W, p.H] });
    console.log(`${p.id}/${file}  ${w}x${h}  s=${sc.s.toFixed(3)}`);
  }
}
await browser.close();
// Optional QA manifest (layout numbers per export); not written into the repo by default.
if (process.env.SOCIAL_BANNER_MANIFEST) writeFileSync(process.env.SOCIAL_BANNER_MANIFEST, JSON.stringify(manifest, null, 1));
