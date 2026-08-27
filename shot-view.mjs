// Viewport-only capture (no scroll). Usage: node shot-view.mjs <url> <out> [w] [h]
import puppeteer from 'puppeteer';

const url = process.argv[2];
const out = process.argv[3];
const width = parseInt(process.argv[4] || '1440', 10);
const height = parseInt(process.argv[5] || '900', 10);

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1600));
await page.screenshot({ path: out });
await browser.close();
console.log('saved ' + out);
