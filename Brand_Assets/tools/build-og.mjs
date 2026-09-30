// Renders the website's social share image (og:image, 1200 x 630) into src/assets/brand/og-image.png.
//
//   node Brand_Assets/tools/build-og.mjs
//
// Evergreen card in the approved Screen Light system, same recipe as the social banners
// (build-social-banners.mjs): #0B0B0B room, soft wash, the locked horizontal-light lockup
// untouched, "Built around your business." in Bricolage Grotesque 620, and the A1 low
// light-blue Screen Light bar under the headline. No price, promotion or claims.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const LOCKUP = readFileSync(resolve(ROOT, "Brand_Assets/ALVSolutions_Master_Logo/svg/alvsolutions-horizontal-light.svg"), "utf8");
const VB = LOCKUP.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
const LD = LOCKUP.match(/<path fill="#F2F1EE" d="([^"]+)"/)[1];
const FONT = "data:font/woff2;base64," + readFileSync(resolve(ROOT, "src/assets/fonts/Bricolage-Grotesque-Variable.woff2")).toString("base64");
const ROOM = "#0B0B0B", KEY = "#F2F1EE";
const HEAD = "Built around your business.";
const W = 1200, H = 630;
const TYPE = 76, LW = 500, K = 1.6; // headline size, lockup width, bar scale

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"] });
const FONTCSS = `@font-face{font-family:"Bricolage OG";src:url("${FONT}") format("woff2-variations");font-weight:200 800;font-stretch:75% 100%}`;
const TEXTCSS = `font-family:'Bricolage OG';font-weight:620;letter-spacing:-0.04em;word-spacing:0.07em;font-variation-settings:'opsz' 92;font-optical-sizing:none;text-rendering:geometricPrecision`;

const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.setContent(`<style>${FONTCSS}</style><svg width="3000" height="300"><text id="t" x="0" y="200" font-size="100" style="${TEXTCSS}">${HEAD}</text></svg>`);
await page.evaluate(async () => { await document.fonts.load('620 100px "Bricolage OG"', "Built"); await document.fonts.ready; });
const headW = (await page.evaluate(() => document.getElementById("t").getBBox().width)) * TYPE / 100;

const LH = (LW * VB[3]) / VB[2];
const gap = 58;                                  // lockup to headline
const blockH = LH + gap + TYPE * 0.75;           // lockup + cap-height of the headline
const top = (H - blockH) / 2 - 20;
const lockY = top, headY = top + LH + gap + TYPE * 0.75;
const barY = headY + 48, horizon = barY + 92;
const barH = 2 * K, rowW = Math.max(headW, LW);
const x0 = (W - rowW) / 2;
const k = K;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:0;top:0">
<defs>
<linearGradient id="hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${KEY}"/><stop offset="1" stop-color="#c4c3bf"/></linearGradient>
<radialGradient id="w" gradientUnits="userSpaceOnUse" cx="${W / 2}" cy="${H / 2 - 20}" r="${0.47 * W}"><stop offset="0" stop-color="${KEY}" stop-opacity="0.05"/><stop offset="0.6" stop-color="${KEY}" stop-opacity="0.0175"/><stop offset="1" stop-color="${KEY}" stop-opacity="0"/></radialGradient>
<linearGradient id="e" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${KEY}" stop-opacity="0"/><stop offset="0.5" stop-color="${KEY}" stop-opacity="0.55"/><stop offset="1" stop-color="${KEY}" stop-opacity="0"/></linearGradient>
<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${KEY}" stop-opacity="0.04"/><stop offset="1" stop-color="${KEY}" stop-opacity="0"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="${ROOM}"/><rect width="${W}" height="${H}" fill="url(#w)"/>
<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#f)"/>
<rect y="${horizon - 0.5}" width="${W}" height="1" fill="url(#e)"/>
<svg x="${(W - LW) / 2}" y="${lockY}" width="${LW}" height="${LH}" viewBox="${VB.join(" ")}"><path fill="${KEY}" d="${LD}"/></svg>
<text x="${W / 2}" y="${headY}" text-anchor="middle" font-size="${TYPE}" fill="url(#hl)" style="${TEXTCSS}">${HEAD}</text>
</svg>`;
const bar = `<i style="position:absolute;display:block;left:${x0}px;width:${rowW}px;top:${barY - barH / 2}px;height:${barH}px;border-radius:${barH}px;
background:oklch(0.97 0.03 245);
box-shadow:0 0 ${6 * k}px oklch(0.92 0.08 245 / 0.85), 0 0 ${18 * k}px ${1 * k}px oklch(0.8 0.15 245 / 0.42), 0 0 ${44 * k}px ${4 * k}px oklch(0.74 0.15 245 / 0.14)"></i>`;
await page.setContent(`<!doctype html><meta charset="utf-8"><style>${FONTCSS}html,body{margin:0;background:${ROOM}}#c{position:relative;width:${W}px;height:${H}px;overflow:hidden}</style><div id="c">${svg}${bar}</div>`);
await page.evaluate(async () => { await document.fonts.load('620 76px "Bricolage OG"', "Built"); await document.fonts.ready; });
await page.screenshot({ path: resolve(ROOT, "src/assets/brand/og-image.png"), clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();
console.log("rendered og-image.png");
