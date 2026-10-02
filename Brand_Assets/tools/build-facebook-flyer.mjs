// Renders the Facebook-group flyer (1080 x 1350 PNG). Run from the repo root:
//   node Brand_Assets/tools/build-facebook-flyer.mjs
// Fails if fonts or images do not load, or if any text leaves the safe margins.
import puppeteer from "puppeteer";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";

const DIR = "Brand_Assets/ALVSolutions_Facebook_Flyer";
const html = pathToFileURL(resolve(DIR, "source/flyer.html")).href;
mkdirSync(resolve(DIR, "png"), { recursive: true });

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
await page.goto(html, { waitUntil: "networkidle0" });
await page.evaluate(async () => {
  await document.fonts.load("620 100px Bricolage", "Your");
  await document.fonts.load("500 40px Instrument", "Local");
  await document.fonts.ready;
});

const report = await page.evaluate(() => {
  const out = { fonts: document.fonts.check("620 100px Bricolage") && document.fonts.check("500 40px Instrument"), badImages: [], overflow: [] };
  for (const im of document.images) if (!(im.complete && im.naturalWidth > 0)) out.badImages.push(im.src);
  const f = document.getElementById("flyer").getBoundingClientRect();
  document.querySelectorAll(".h, .services, .also, .track, .foot img, .foot div, .sheet, .cards").forEach((el) => {
    const rg = document.createRange(); rg.selectNodeContents(el);
    const r = el.matches(".foot img, .track, .sheet, .cards") ? el.getBoundingClientRect() : rg.getBoundingClientRect();
    const l = r.left - f.left, rt = r.right - f.left, t = r.top - f.top, b = r.bottom - f.top;
    if (l < 79.5 || rt > 1000.5 || t < 60 || b > 1350 - 60) out.overflow.push({ el: el.className || el.tagName, l: Math.round(l), r: Math.round(rt), t: Math.round(t), b: Math.round(b) });
  });
  return out;
});
console.log(JSON.stringify(report));
if (!report.fonts || report.badImages.length || report.overflow.length) throw new Error("Flyer check failed");

await (await page.$("#flyer")).screenshot({ path: resolve(DIR, "png/alvsolutions-facebook-flyer-1080x1350.png") });
await browser.close();
console.log("wrote flyer to", DIR);
