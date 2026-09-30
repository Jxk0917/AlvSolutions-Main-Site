// Captures the screens for /work/ ("What I build") from the live demo builds.
//
// Each screen is a tall strip, not a single frame: the showcase scrolls the
// strip inside its glass as the page passes it, so the strip is the part of
// the demo a visitor sees "scrolled" on the display. Captured from the
// running site, so re-run it whenever a demo changes:
//
//   npm run serve        (or node serve.mjs after a build; BASE_URL overrides)
//   node shot-work.mjs [hacienda-grill|lucid-detailing]
//
// Output: src/assets/work/<slug>-desktop[-960].jpg and <slug>-mobile.jpg.
import puppeteer from 'puppeteer';
import { createCanvas, loadImage } from 'canvas';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'src/assets/work');
// Served over HTTP: some demo images do not load from file:// URLs.
const BASE = process.env.BASE_URL || 'http://localhost:3000';

// `strip` is how much of the page (CSS px from the top) each screen carries.
// `settle` lets each hero finish its own entrance before the capture.
const DEMOS = [
  {
    slug: 'hacienda-grill', path: '/demo-restaurant/', settle: 3500,
    desktop: { strip: 2060 }, mobile: { strip: 2000 },
  },
  {
    slug: 'lucid-detailing', path: '/demo-detailer/', settle: 2500,
    desktop: { strip: 2140 }, mobile: { strip: 1900 },
  },
];

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1.25 };
const MOBILE = { width: 430, height: 860, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true };

// Both demos hide `.reveal` content until it scrolls into view. The capture
// never scrolls, so show it all as it looks once revealed.
const SHOW_ALL = `.reveal, .js .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }`;

async function strip(page, url, vp, height, settle) {
  await page.setViewport(vp);
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  // ...and lazy images below the fold never load for a capture that does not
  // scroll, so load them all and wait for each before the shot.
  await page.evaluate((css) => {
    const s = document.createElement('style');
    s.textContent = css;
    document.head.append(s);
    const imgs = Array.from(document.images);
    imgs.forEach((i) => { i.loading = 'eager'; });
    const loaded = imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
    return Promise.race([
      Promise.all([document.fonts.ready, ...loaded]),
      new Promise((r) => setTimeout(r, 8000)),
    ]).then(() => true);
  }, SHOW_ALL);
  await new Promise((r) => setTimeout(r, settle));
  return page.screenshot({
    type: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: vp.width, height },
  });
}

async function toJpeg(buffer, width, quality, outPath) {
  const img = await loadImage(buffer);
  const h = Math.round((img.height * width) / img.width);
  const canvas = createCanvas(width, h);
  const ctx = canvas.getContext('2d');
  ctx.quality = 'best';
  ctx.patternQuality = 'best';
  ctx.drawImage(img, 0, 0, width, h);
  const out = canvas.toBuffer('image/jpeg', { quality });
  writeFileSync(outPath, out);
  return `${width}x${h} ${Math.round(out.length / 1024)}KB`;
}

const only = process.argv[2];
const targets = only ? DEMOS.filter((d) => d.slug === only) : DEMOS;
if (!targets.length) {
  console.error(`No demo matching "${only}". Known: ${DEMOS.map((d) => d.slug).join(', ')}`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();

// Every capture is taken before anything is written: writing into src/ makes
// a watching dev server rebuild and reload the page mid-capture.
const shots = [];
for (const d of targets) {
  const url = BASE + d.path;
  shots.push({ d, desk: await strip(page, url, DESKTOP, d.desktop.strip, d.settle), mob: await strip(page, url, MOBILE, d.mobile.strip, d.settle) });
}
for (const { d, desk, mob } of shots) {
  const a = await toJpeg(desk, 1800, 0.84, join(OUT, `${d.slug}-desktop.jpg`));
  const b = await toJpeg(desk, 960, 0.82, join(OUT, `${d.slug}-desktop-960.jpg`));
  const c = await toJpeg(mob, 645, 0.84, join(OUT, `${d.slug}-mobile.jpg`));
  console.log(`${d.slug}: desktop ${a} | ${b} | mobile ${c}`);
}

await browser.close();
