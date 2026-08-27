import puppeteer from './node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

// Scroll through page to trigger reveal animations
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 400) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 80));
  }
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 500));
});

// Scroll to services section
await page.evaluate(() => {
  document.getElementById('services').scrollIntoView();
});
await new Promise(r => setTimeout(r, 600));

const rect = await page.evaluate(() => {
  const el = document.getElementById('services');
  const r = el.getBoundingClientRect();
  return { x: 0, y: r.top + window.scrollY, width: 1440, height: el.offsetHeight };
});

await page.screenshot({
  path: 'temporary screenshots/services-only.png',
  clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
});

await browser.close();
console.log('Saved services-only.png  height=' + rect.height);
