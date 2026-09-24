// Renders the launch Story to a 1080 x 1920 PNG, plus a QA-only safe-area preview.
// Run from the repo root:  node Social_Launch/tools/render-story.mjs
// Fails if fonts or the logo do not load, or if any text overflows the canvas margins.
import puppeteer from "puppeteer";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DIR = "Social_Launch/instagram-story";
const html = pathToFileURL(resolve(DIR, "alvsolutions-launch-story.html")).href;
const OUT = resolve(DIR, "alvsolutions-launch-story-1080x1920.png");
const PREVIEW = resolve(DIR, "preview/safe-area-check.png");

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox", "--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });

async function load(query = "") {
  await page.goto(html + query, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
}

await load();
const report = await page.evaluate(() => {
  const fonts = ["800 96px Manrope", "500 44px Geist"].map((f) => document.fonts.check(f));
  const img = document.querySelector(".logo img");
  const boxes = [...document.querySelectorAll(".logo, .headline, .support, .services")].map((el) => {
    const r = el.getBoundingClientRect();
    return { cls: el.className, top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width) };
  });
  // Tight text extents (the .stack boxes are full width), measured with a range.
  const ext = [".logo .word", ".headline", ".support", ".services"].map((s) => {
    const rg = document.createRange(); rg.selectNodeContents(document.querySelector(s));
    const r = rg.getBoundingClientRect();
    return { s, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom) };
  });
  return { fonts, logoLoaded: img.complete && img.naturalWidth > 0, boxes, ext };
});
console.log(JSON.stringify(report, null, 1));
if (!report.fonts.every(Boolean) || !report.logoLoaded) throw new Error("Font or logo failed to load");
for (const e of report.ext) if (e.left < 72 || e.right > 1008) throw new Error(`${e.s} is inside the 72px side margin`);
for (const e of [...report.ext, ...report.boxes.filter((b) => b.cls.includes("logo"))]) {
  const top = e.top, bottom = e.bottom;
  if (top < 270 || bottom > 1580) throw new Error(`content outside safe area: ${e.s || e.cls} ${top}-${bottom}`);
}

await (await page.$("#story")).screenshot({ path: OUT });
await load("?guides");
await (await page.$("#story")).screenshot({ path: PREVIEW });
await browser.close();
console.log("wrote", OUT, "\nwrote", PREVIEW);
