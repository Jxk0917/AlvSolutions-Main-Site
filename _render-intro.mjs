import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync, mkdirSync, rmSync } from 'fs';
import { join, extname } from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

const SP = process.env.SP;
const ffmpeg = createRequire(SP + '/package.json')('ffmpeg-static');
const ROOT = 'C:/Users/Jack/Projects/AlvSolutions-Main-Site';
const FPS = 60;
const TOTAL_MS = 5000; // lead-in 0.8s + intro ~2.3s + a 1.9s hold on the finished lockup
const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.woff2':'font/woff2' };

const srv = createServer((req, res) => {
  const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(5597);

// Virtual clock: the page's timers and animation frames only advance when
// this harness says so, so every frame is exactly 1/60s of the animation.
const CLOCK = `(() => {
  let now = 0, id = 1, timers = [], raf = [];
  performance.now = () => now;
  Date.now = () => 1700000000000 + now;
  window.requestAnimationFrame = (cb) => { raf.push(cb); return raf.length; };
  window.cancelAnimationFrame = () => {};
  window.setTimeout = (fn, ms = 0) => { timers.push({ at: now + ms, fn, id: id }); return id++; };
  window.clearTimeout = (x) => { timers = timers.filter(t => t.id !== x); };
  window.__advance = (dt) => {
    now += dt;
    for (;;) {
      let due = null;
      for (const t of timers) if (t.at <= now && (!due || t.at < due.at)) due = t;
      if (!due) break;
      timers = timers.filter(t => t !== due);
      due.fn();
    }
    const cbs = raf; raf = [];
    cbs.forEach(cb => cb(now));
  };
})();`;

async function render(name, page_, w, h, outMp4) {
  const frames = join(SP, 'frames-' + name);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: w, height: h });
  await page.evaluateOnNewDocument(CLOCK);
  await page.goto('http://localhost:5597/capture/intro/' + page_, { waitUntil: 'networkidle0' });
  // Fonts resolve in real time; the lead-in timer is registered then, at virtual 0.
  await page.evaluate(() => document.fonts.ready);
  const n = Math.round(TOTAL_MS / 1000 * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate((dt) => window.__advance(dt), 1000 / FPS);
    await page.screenshot({ path: join(frames, `f${String(i).padStart(4, '0')}.png`) });
  }
  await browser.close();
  execFileSync(ffmpeg, ['-y', '-framerate', String(FPS), '-i', join(frames, 'f%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outMp4], { stdio: 'ignore' });
  console.log(name, 'frames', n, 'errors', JSON.stringify(errors), '->', outMp4);
}

await render('16x9', 'index.html', 1920, 1080, join(ROOT, 'capture/intro/alvsolutions-intro-16x9.mp4'));
await render('9x16', 'mobile.html', 1080, 1920, join(ROOT, 'capture/intro/alvsolutions-intro-9x16.mp4'));
srv.close();
