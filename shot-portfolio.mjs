// Regenerates the portfolio thumbnails used on the main site's work section.
// Captures each demo build at 2x, then downscales, so the 720w and 1440w
// srcset entries stay the same framing at two resolutions.
//
// Usage: node shot-portfolio.mjs [demo-slug]
import puppeteer from 'puppeteer';
import { createCanvas, loadImage } from 'canvas';
import { writeFileSync } from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';
import { join, dirname } from 'path';

// Resolved from the script's own location, same as check-site.mjs and
// serve.mjs, so this works from any checkout path or machine rather than
// one hardcoded developer folder.
const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'src/assets/portfolio');

// `settle` is how long to wait before capturing. The hero animation needs
// ~1.8s; Hacienda waits longer because its hero GIF is a montage and most of
// the loop is a dark close-up. 6s lands on the lit grill-marks shot, which is
// the only frame that works as a still.
//
// Reads from the BUILT site (_site/), not the passthrough source folders,
// since the demo builds are copied there under their lowercase-hyphenated
// output names (see eleventy.config.mjs addPassthroughCopy).
const DEMOS = [
  { slug: 'hacienda-grill', dir: '_site/demo-restaurant/index.html', settle: 6000 },
  { slug: 'lucid-detailing', dir: '_site/demo-detailer/index.html', settle: 1800 },
];

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 430, height: 860 };
const SCALE = 2;

async function toJpeg(buffer, w, h, quality, outPath) {
  const img = await loadImage(buffer);
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.patternQuality = 'best';
  ctx.quality = 'best';
  ctx.drawImage(img, 0, 0, w, h);
  writeFileSync(outPath, canvas.toBuffer('image/jpeg', { quality }));
  return canvas.toBuffer('image/jpeg', { quality }).length;
}

async function capture(page, url, vp, settle) {
  await page.setViewport({ ...vp, deviceScaleFactor: SCALE });
  await page.goto(url, { waitUntil: 'networkidle0' });
  // Hero panel children animate in on load; let them land before capturing.
  await new Promise(r => setTimeout(r, settle));
  return page.screenshot({ type: 'png' });
}

const only = process.argv[2];
const targets = only ? DEMOS.filter(d => d.slug === only) : DEMOS;
if (!targets.length) {
  console.error(`No demo matching "${only}". Known: ${DEMOS.map(d => d.slug).join(', ')}`);
  process.exit(1);
}

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();

for (const demo of targets) {
  const url = pathToFileURL(join(ROOT, demo.dir)).href;

  const desktop = await capture(page, url, DESKTOP, demo.settle);
  const a = await toJpeg(desktop, 1440, 900, 0.88, join(OUT, `${demo.slug}-1440.jpg`));
  const b = await toJpeg(desktop, 720, 450, 0.84, join(OUT, `${demo.slug}-720.jpg`));

  const mobile = await capture(page, url, MOBILE, demo.settle);
  const c = await toJpeg(mobile, 430, 860, 0.86, join(OUT, `${demo.slug}-mobile.jpg`));

  const kb = n => `${Math.round(n / 1024)}KB`;
  console.log(`${demo.slug}: 1440 ${kb(a)} · 720 ${kb(b)} · mobile ${kb(c)}`);
}

await browser.close();
