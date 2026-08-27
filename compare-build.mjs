/* Phase-0 guard: prove the built home page renders identically to the original
   single-file index.html.

   Serves the pre-Eleventy index.html from the project root on one port and the
   built _site on another, screenshots both, and counts differing pixels.

   Animation is the whole difficulty here. The services shader and the work
   aurora both move, so two captures of the SAME page differ. Both are gated on
   prefers-reduced-motion, so the capture emulates it: the shader then renders a
   single still frame and the aurora stops. Anything still differing after that
   is a real change.

   Usage: node compare-build.mjs [width]
*/
import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'fs';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIDTHS = process.argv[2] ? [parseInt(process.argv[2], 10)] : [1440, 900, 390];
const OUT = join(__dirname, 'temporary screenshots');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const mime = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif',
};

function serve(root, port) {
  return new Promise((resolve) => {
    const s = createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      let p = join(root, url === '/' ? '/index.html' : url);
      if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
      if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': mime[extname(p).toLowerCase()] || 'application/octet-stream' });
      res.end(readFileSync(p));
    });
    s.listen(port, () => resolve(s));
  });
}

/* `sel` clips the capture to one element. The footer legitimately changed in
   this phase — it gained two link groups — so comparing whole pages only ever
   reports that. Clipping to <main> isolates the content that must NOT have
   changed. Pass --full to compare whole pages instead. */
const SEL = process.argv.includes('--full') ? null : 'main';

async function shoot(browser, url, width, file) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible', 'in'));
  });
  await new Promise((r) => setTimeout(r, 1500));
  const target = SEL ? await page.$(SEL) : null;
  if (target) await target.screenshot({ path: file });
  else await page.screenshot({ path: file, fullPage: true });
  const h = await page.evaluate(() => document.body.scrollHeight);
  await page.close();
  return h;
}

async function diff(aPath, bPath) {
  const [a, b] = await Promise.all([loadImage(aPath), loadImage(bPath)]);
  if (a.width !== b.width || a.height !== b.height) {
    return { sizeMismatch: `${a.width}x${a.height} vs ${b.width}x${b.height}` };
  }
  const ca = createCanvas(a.width, a.height); ca.getContext('2d').drawImage(a, 0, 0);
  const cb = createCanvas(b.width, b.height); cb.getContext('2d').drawImage(b, 0, 0);
  const da = ca.getContext('2d').getImageData(0, 0, a.width, a.height).data;
  const db = cb.getContext('2d').getImageData(0, 0, b.width, b.height).data;

  let differing = 0;
  let firstRow = -1, lastRow = -1;
  for (let y = 0; y < a.height; y++) {
    let rowBad = false;
    for (let x = 0; x < a.width; x++) {
      const i = (y * a.width + x) * 4;
      // tolerance 2/255: PNG round-tripping and subpixel AA are not exact
      if (Math.abs(da[i] - db[i]) > 2 || Math.abs(da[i + 1] - db[i + 1]) > 2 || Math.abs(da[i + 2] - db[i + 2]) > 2) {
        differing++; rowBad = true;
      }
    }
    if (rowBad) { if (firstRow < 0) firstRow = y; lastRow = y; }
  }
  const total = a.width * a.height;
  return { differing, total, pct: ((differing / total) * 100).toFixed(4), firstRow, lastRow, h: a.height };
}

const sOld = await serve(__dirname, 3101);
const sNew = await serve(join(__dirname, '_site'), 3102);
const browser = await puppeteer.launch({ headless: 'new' });

let worst = 0;
for (const w of WIDTHS) {
  const fa = join(OUT, `cmp-old-${w}.png`);
  const fb = join(OUT, `cmp-new-${w}.png`);
  const ha = await shoot(browser, 'http://localhost:3101/index.html', w, fa);
  const hb = await shoot(browser, 'http://localhost:3102/', w, fb);
  const d = await diff(fa, fb);
  if (d.sizeMismatch) {
    console.log(`${w}px  PAGE SIZE DIFFERS  ${d.sizeMismatch}  (old body ${ha}, new body ${hb})`);
    worst = 100;
  } else {
    console.log(
      `${w}px  ${d.differing} / ${d.total} px differ  (${d.pct}%)  height ${d.h}` +
      (d.differing ? `  rows ${d.firstRow}-${d.lastRow}` : '  IDENTICAL')
    );
    worst = Math.max(worst, parseFloat(d.pct));
  }
}

await browser.close();
sOld.close(); sNew.close();
console.log(worst === 0 ? '\nPhase 0 clean: no pixel differs.' : `\nWorst difference: ${worst}%`);
