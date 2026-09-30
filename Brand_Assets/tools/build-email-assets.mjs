// Builds the launch email's images in the current identity (Dark Precision ALV
// symbol + Archivo wordmark, Screen Light neutrals; no accent colour).
//
//   node Brand_Assets/tools/build-email-assets.mjs
//
// Email clients will not render SVG (Gmail strips it), so everything ships as
// PNG/JPG, served from the live site out of src/assets/email/:
//   alv-lockup.png       the header logo, symbol + ALVSolutions   (declared 150x30)
//   ic-*.png             the six page-add-on icons                 (declared 52x52)
//   launch-hero.jpg      both concept builds, headline across them (declared 600x560)
// Each is rendered at 2x-3x. Do not edit them by hand; edit this file.
import { readFileSync } from "fs";
import { resolve } from "path";
import puppeteer from "puppeteer";

const ROOT = resolve(import.meta.dirname, "../..");
const OUT = resolve(ROOT, "src/assets/email");
const b64 = (p) => readFileSync(resolve(ROOT, p)).toString("base64");
const font = (family, file, extra = "") =>
  `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${b64(file)}) format("woff2");font-weight:100 900;${extra}}`;

const ROOM = "#0B0B0B";
const INK = "#F2F1EE";

const SLABS = `<path d="M17.25 6 L95.25 6 L88.01 57 L10.01 57 Z"/><path d="M9.15 63 L87.15 63 L82.75 94 L4.75 94 Z"/>`;
const CUT = `<mask id="c" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#fff"/><path fill="#000" d="M44 19 L56 19 L78 83 L60 83 L50 33 L40 83 L22 83 Z"/></mask>`;

// Tabler outline paths straight from the site's own sprite, so the icons match it.
const sprite = readFileSync(resolve(ROOT, "src/_includes/components/icon-sprite.njk"), "utf8");
const icon = (id) => {
  const m = sprite.match(new RegExp(`<symbol id="i-${id}"[^>]*>([\\s\\S]*?)</symbol>`));
  if (!m) throw new Error("icon not in sprite: " + id);
  return m[1];
};
const ICONS = { "ic-services": "list", "ic-menu": "menu", "ic-gallery": "photo", "ic-testimonials": "star", "ic-quote": "clipboard", "ic-area": "map" };

const browser = await puppeteer.launch();
async function shot(html, { width, height, scale, file, type = "png", quality }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(OUT, file), type, ...(quality ? { quality } : {}), omitBackground: type === "png", clip: { x: 0, y: 0, width, height } });
  await page.close();
  console.log("wrote", file);
}

try {
  // ---- the header logo: symbol 30, gap 11, wordmark 18 (the site's nav lockup)
  await shot(
    `<style>${font("Archivo Variable", "src/assets/fonts/Archivo-Variable.woff2")}
      html,body{margin:0;background:transparent}
      .l{display:flex;align-items:center;gap:11px;height:30px;width:150px;color:${INK};font:640 18px/1 "Archivo Variable";letter-spacing:-0.024em;white-space:nowrap}
      svg{width:30px;height:30px;flex:none}</style>
     <div class="l"><svg viewBox="0 0 100 100"><defs>${CUT}</defs><g fill="currentColor" mask="url(#c)">${SLABS}</g></svg><span>ALVSolutions</span></div>`,
    { width: 150, height: 30, scale: 3, file: "alv-lockup.png" }
  );

  // ---- the six icons
  for (const [file, id] of Object.entries(ICONS)) {
    await shot(
      `<style>html,body{margin:0;background:transparent}
        .t{width:52px;height:52px;box-sizing:border-box;border-radius:14px;background:${ROOM};box-shadow:inset 0 0 0 1px rgba(242,241,238,.2);display:grid;place-items:center}
        svg{width:26px;height:26px;fill:none;stroke:${INK};stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}</style>
       <div class="t"><svg viewBox="0 0 24 24">${icon(id)}</svg></div>`,
      { width: 52, height: 52, scale: 2, file: `${file}.png` }
    );
  }

  // ---- the hero: both concept builds, the headline across the seam
  const hac = b64("src/assets/work/hacienda-grill-desktop.jpg");
  const luc = b64("src/assets/work/lucid-detailing-desktop.jpg");
  await shot(
    `<style>${font("Bricolage Grotesque Variable", "src/assets/fonts/Bricolage-Grotesque-Variable.woff2")}
      html,body{margin:0;background:${ROOM}}
      .h{position:relative;width:600px;height:560px;overflow:hidden;background:${ROOM}}
      .f{position:absolute;left:20px;width:560px;height:255px;border-radius:9px;overflow:hidden;box-shadow:0 0 0 1px rgba(242,241,238,.16);background:#111}
      .f i{position:absolute;top:8px;left:11px;width:5px;height:5px;border-radius:50%;background:rgba(242,241,238,.3);box-shadow:11px 0 rgba(242,241,238,.3),22px 0 rgba(242,241,238,.3)}
      .f div{position:absolute;inset:0;background-size:100% auto;background-position:top center;background-repeat:no-repeat}
      .a{top:20px}.a div{background-image:url(data:image/jpeg;base64,${hac})}
      .b{top:289px}.b div{background-image:url(data:image/jpeg;base64,${luc})}
      .v{position:absolute;left:0;right:0;top:190px;height:190px;background:linear-gradient(transparent,rgba(11,11,11,.78) 32%,rgba(11,11,11,.78) 68%,transparent)}
      h1{position:absolute;left:0;right:0;top:226px;margin:0;text-align:center;color:${INK};font:620 37px/1.16 "Bricolage Grotesque Variable";letter-spacing:-0.035em;text-shadow:0 2px 20px rgba(0,0,0,.6)}</style>
     <div class="h"><div class="f a"><i></i><div style="top:0"></div></div><div class="f b"><i></i><div></div></div><span class="v"></span>
     <h1>Your business deserves<br>a better website.</h1></div>`,
    { width: 600, height: 560, scale: 2, file: "launch-hero.jpg", type: "jpeg", quality: 88 }
  );
} finally {
  await browser.close();
}
