const { loadImage, createCanvas } = require('canvas');
const fs = require('fs');

function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return [h, s, v];
}

function hsv2rgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const SRC = process.argv[2];
const OUT = process.argv[3];
const TARGET_HUE = parseFloat(process.argv[4] || '345');
const SAT_BOOST = parseFloat(process.argv[5] || '1.05');
const VAL_MULT = parseFloat(process.argv[6] || '0.82');

loadImage(SRC).then(img => {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, img.width, img.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a === 0) continue;
    const [h, s, v] = rgb2hsv(d[i], d[i + 1], d[i + 2]);
    // gold/yellow/orange range
    if (h >= 15 && h <= 65 && s > 0.12) {
      const newS = Math.min(1, s * SAT_BOOST);
      const newV = Math.min(1, v * VAL_MULT);
      const [r2, g2, b2] = hsv2rgb(TARGET_HUE, newS, newV);
      d[i] = r2; d[i + 1] = g2; d[i + 2] = b2;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  fs.writeFileSync(OUT, canvas.toBuffer('image/png'));
  console.log('wrote', OUT);
});
