// Renders the six launch-carousel slides (1080 x 1350 PNG), a contact sheet and a
// phone-size contact sheet. Run from the repo root:
//   node Brand_Assets/tools/build-launch-carousel.mjs
// Fails if fonts or images do not load, or if any text/image leaves the safe margins.
import puppeteer from "puppeteer";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const DIR = "Brand_Assets/ALVSolutions_Launch_Carousel";
const html = pathToFileURL(resolve(DIR, "source/carousel.html")).href;
mkdirSync(resolve(DIR, "png"), { recursive: true });
mkdirSync(resolve(DIR, "preview"), { recursive: true });

const names = ["cover", "what-i-build", "ways-to-build", "selected-work", "the-approach", "cta"];
const file = (i) => `png/alvsolutions-launch-${i + 1}-${names[i]}-1080x1350.png`;
const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
await page.goto(html, { waitUntil: "networkidle0" });
await page.evaluate(async () => {
  await document.fonts.load("620 100px Bricolage", "Built");
  await document.fonts.load("500 40px Instrument", "Built");
  await document.fonts.ready;
});

const report = await page.evaluate(() => {
  const out = { fonts: document.fonts.check("620 100px Bricolage") && document.fonts.check("500 40px Instrument"), badImages: [], overflow: [] };
  for (const im of document.images) if (!(im.complete && im.naturalWidth > 0)) out.badImages.push(im.src);
  document.querySelectorAll(".slide").forEach((s, i) => {
    const sb = s.getBoundingClientRect();
    s.querySelectorAll(".h, .sub, .rows b, .rows span, .url, .btn, .shot, .tag, figcaption, .biglogo, .logo, .count").forEach((el) => {
      const rg = document.createRange(); rg.selectNodeContents(el);
      const r = el.matches(".shot, .biglogo, .logo, .btn") ? el.getBoundingClientRect() : rg.getBoundingClientRect();
      const l = r.left - sb.left, rt = r.right - sb.left, t = r.top - sb.top, b = r.bottom - sb.top;
      if (l < 95.5 || rt > 984.5 || t < 90 || b > 1350 - 100) out.overflow.push({ slide: i + 1, el: el.className || el.tagName, l: Math.round(l), r: Math.round(rt), t: Math.round(t), b: Math.round(b) });
    });
  });
  return out;
});
console.log(JSON.stringify(report));
if (!report.fonts || report.badImages.length || report.overflow.length) throw new Error("Carousel check failed");

const slides = await page.$$(".slide");
for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: resolve(DIR, file(i)) });

// Contact sheets: a 3 x 2 sheet at 1/3 scale, and a phone-size strip (each slide 390 wide).
const sheet = async (w, cols, gap, out) => {
  const h = Math.round((w * 1350) / 1080), rows = Math.ceil(6 / cols);
  const p = await browser.newPage();
  await p.setViewport({ width: cols * w + (cols + 1) * gap, height: rows * h + (rows + 1) * gap });
  const imgs = names.map((_, i) => `<img src="${pathToFileURL(resolve(DIR, file(i))).href}" style="width:${w}px;height:${h}px">`).join("");
  const tmp = resolve(DIR, "preview/_sheet.html");
  writeFileSync(tmp, `<body style="margin:0;background:#1a1a1a;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:${gap}px;padding:${gap}px;align-content:start">${imgs}</body>`);
  await p.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle0" });
  await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  await p.screenshot({ path: resolve(DIR, out) });
  rmSync(tmp);
  await p.close();
};
await sheet(360, 3, 24, "preview/contact-sheet.png");
await sheet(390, 3, 16, "preview/phone-size-390.png");
await browser.close();
console.log("wrote 6 slides and previews to", DIR);
