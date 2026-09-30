// Renders the website's social share image (og:image, 1200 x 630). Still the old-identity
// artwork: the OG image is its own asset project and has not been redone yet.
// Run from the repo root after build-logo.mjs and export-png.mjs:
//   node Brand_Assets/tools/build-og.mjs
import puppeteer from "puppeteer";
import { writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SITE = "src/assets/brand";
const url = (p) => pathToFileURL(resolve(p)).href;

// The favicon, apple-touch badge and header mark used to be copied from the old
// Brand_Assets/logo set here. They are now built from the approved ALV symbol by
// build-favicons.mjs, so nothing is copied: doing so would put the old blue
// identity back into src/assets/brand.

// Left-aligned like the site's hero. Headline is the home page H1, so the card and
// the page it previews say the same thing.
const host = resolve(SITE, "_og.html");
writeFileSync(host, `<!doctype html><html><head><style>
  @font-face { font-family: Manrope; src: url("${url("Brand_Assets/ALVS Fonts/Geist/ManRope/Manrope-VariableFont_wght.ttf")}"); font-weight: 200 800; }
  @font-face { font-family: Geist; src: url("${url("Brand_Assets/ALVS Fonts/Geist/Geist-VariableFont_wght.ttf")}"); font-weight: 100 900; }
  html, body { margin: 0; }
  #og { width: 1200px; height: 630px; box-sizing: border-box; padding: 76px 88px; background: #070C14;
        display: flex; flex-direction: column; justify-content: space-between; color: #EDF2F8; }
  .lockup { display: flex; align-items: center; gap: 16px; font: 800 38px/1 Manrope; letter-spacing: -.03em; }
  .lockup img { height: 54px; }
  .lockup span { color: #3DA8F8; }
  h1 { margin: 0; font: 800 84px/1.02 Manrope; letter-spacing: -.035em; max-width: 13ch; }
  p { margin: 22px 0 0; font: 450 28px/1.4 Geist; color: #B4C2D2; }
</style></head><body><div id="og">
  <div class="lockup"><img src="${url("Brand_Assets/logo/svg/alv-mark-reverse.svg")}" alt=""><b>Alv<span>Solutions</span></b></div>
  <div><h1>Websites that bring in work.</h1><p>Flat pricing from $500. San Antonio, Texas.</p></div>
</div></body></html>`);

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.goto(url(host), { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
const ok = await page.evaluate(() => document.fonts.check('800 20px Manrope') && document.fonts.check('400 20px Geist'));
if (!ok) throw new Error("Fonts did not load for the share image");
await (await page.$("#og")).screenshot({ path: resolve(SITE, "og-image.png") });
await browser.close();
rmSync(host);
console.log("rendered og-image.png");
