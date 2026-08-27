// Capture a page as sequential viewport-height bands.
// Usage: node shot-bands.mjs <url> <outPrefix> [width] [height]
import puppeteer from 'puppeteer';
import { existsSync, mkdirSync } from 'fs';

const url = process.argv[2] || 'http://localhost:3000';
const prefix = process.argv[3] || 'band';
const width = parseInt(process.argv[4] || '1440', 10);
const height = parseInt(process.argv[5] || '900', 10);

const outDir = './temporary screenshots';
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0' });

// Scroll-reveal elements start at opacity:0 - force them visible for capture.
await page.evaluate(() => {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible', 'in'));
});
await new Promise(r => setTimeout(r, 1200));

const total = await page.evaluate(() => document.body.scrollHeight);
const bands = Math.ceil(total / height);

for (let i = 0; i < bands; i++) {
  await page.evaluate(y => window.scrollTo(0, y), i * height);
  await new Promise(r => setTimeout(r, 450));
  await page.screenshot({ path: `${outDir}/${prefix}-${i}.png` });
}

await browser.close();
console.log(`${bands} bands at ${width}x${height} -> ${outDir}/${prefix}-*.png`);
