/**
 * Screen Light: a screen's emission.
 *
 * Client work is a screen, and a screen's light is its own colour: nothing
 * about it is assigned. Ported unchanged from the locked exploration
 * (src/screen-light/light.ts): the light is sampled from the work's own
 * pixels at runtime.
 *
 * That runtime sampling is the temporary production representation. The
 * build-time pipeline (Phase 4H) will write the same shape of values into
 * the markup as `data-emission` on each screen; emissionFor() prefers that
 * whenever it is present, so the reel never needs rewriting for it.
 */

export type Emission = {
  all: string; // "r g b" of the whole screen's light
  bottom: string; // what its lower third throws onto the floor
  left: string;
  right: string;
  exposure: number; // 0..1: how much light it gives, after the eye adapts
};

const toLin = (c: number): number => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (v: number): number => {
  v = Math.max(0, Math.min(1, v));
  return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
};

/**
 * The light a region of pixels gives off. Averaged in linear light and
 * weighted by luminance, because bright pixels dominate what a screen emits;
 * then scaled so its brightest channel is full. Scaling linear light keeps
 * the colour exactly and changes only its exposure, so nothing is invented.
 */
function regionLight(d: Uint8ClampedArray, w: number, x0: number, x1: number, y0: number, y1: number): { rgb: string; lum: number } {
  let r = 0, g = 0, b = 0, wsum = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      const lr = toLin(d[i]), lg = toLin(d[i + 1]), lb = toLin(d[i + 2]);
      const lum = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
      r += lr * lum; g += lg * lum; b += lb * lum; wsum += lum; n++;
    }
  }
  if (wsum === 0) return { rgb: "242 241 238", lum: 0 };
  r /= wsum; g /= wsum; b /= wsum;
  const m = Math.max(r, g, b) || 1;
  return { rgb: `${toSrgb(r / m)} ${toSrgb(g / m)} ${toSrgb(b / m)}`, lum: wsum / n };
}

/**
 * Samples an image's light. `glassRatio` is the height/width of the glass it
 * is shown in: only the part of the image the glass actually shows (Lucid's
 * crop stops above its statistics bar) is sampled.
 */
export async function sampleEmission(src: string, glassRatio: number): Promise<Emission> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const visible = Math.min(1, glassRatio / (img.naturalHeight / img.naturalWidth || 1));
  const W = 48, H = 30;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const cx = cv.getContext("2d", { willReadFrequently: true })!;
  cx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight * visible, 0, 0, W, H);
  const d = cx.getImageData(0, 0, W, H).data;
  const all = regionLight(d, W, 0, W, 0, H);
  return {
    all: all.rgb,
    bottom: regionLight(d, W, 0, W, Math.round(H * 0.62), H).rgb,
    left: regionLight(d, W, 0, Math.round(W / 3), 0, H).rgb,
    right: regionLight(d, W, Math.round((W * 2) / 3), W, 0, H).rgb,
    // A dark site gives less light, honestly, but the eye adapts: the room
    // is dimmer for Lucid than for Hacienda without disappearing.
    exposure: 0.45 + 0.55 * Math.sqrt(Math.min(1, all.lum / 0.1)),
  };
}

/** A screen's emission: build-time metadata when present, else sampled. */
export async function emissionFor(dev: HTMLElement): Promise<Emission | null> {
  const preset = dev.dataset.emission;
  if (preset) {
    try {
      return JSON.parse(preset) as Emission;
    } catch {
      /* fall through to sampling */
    }
  }
  const glass = dev.querySelector<HTMLElement>(".dev-glass");
  const img = glass?.querySelector<HTMLImageElement>("img");
  if (!glass || !img) return null;
  const ratio = glass.offsetWidth ? glass.offsetHeight / glass.offsetWidth : 900 / 1440;
  try {
    return await sampleEmission(img.getAttribute("src")!, ratio);
  } catch {
    return null;
  }
}
