/**
 * /work/ (Work, the portfolio; "What I build" is /builds/). The page is complete without this file: every
 * screen is lit, every strip rests on its first frame, every link works.
 *
 * With script:
 *   - each showcase's light is sampled from its own desktop screen's pixels
 *     (the top of the strip, which is what the glass shows first) and
 *     written as --e-* / --exp, so the room takes the work's colour and
 *     never an assigned one. The close's floor keeps a trace of each;
 *   - when motion is on (html.wk-arm, set before paint by
 *     work/prepaint.njk), a showcase waits as dark glass and powers on
 *     (.is-on) once it reaches the viewport and its light is known. An
 *     IntersectionObserver decides arrival; there is no scroll listener;
 *   - just after a screen powers on, its caption's "Built by ALVSolutions"
 *     is signed (identity/motions.ts, the homepage's own motion), once.
 *     With motion off it simply rests signed.
 */
import { sampleEmission, type Emission } from "../light/emission";
import { motionOn, onMotionChange } from "../motion/env";
import { playSign, signNow } from "../identity/motions";

declare global {
  interface Window { __alvWorkReady?: boolean }
}

const root = document.documentElement;
const wk = document.querySelector<HTMLElement>(".wk");
const shows = Array.from(document.querySelectorAll<HTMLElement>("[data-show]"));
const GLASS = 900 / 1440;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const SIGN_DELAY = 1400; // ms after a screen powers on, once its light has settled

function writeLight(show: HTMLElement, e: Emission): void {
  const s = show.style;
  s.setProperty("--e-all", e.all);
  s.setProperty("--e-left", e.left);
  s.setProperty("--e-right", e.right);
  s.setProperty("--e-bottom", e.bottom);
  s.setProperty("--exp", e.exposure.toFixed(3));
  // The close keeps each client's floor light at its edge (--wk-hac, --wk-luc).
  const look = Array.from(show.classList).find((c) => c.startsWith("wk-show--"))?.slice(9);
  if (look) wk?.style.setProperty(`--wk-${look}`, e.bottom);
}

// Each showcase: its light, then (once the desktop screen has a picture to
// show) it is ready to power on.
const ready = new Map<HTMLElement, Promise<void>>();
for (const show of shows) {
  const img = show.querySelector<HTMLImageElement>(".wk-screen--desk .wk-feed");
  if (!img) continue;
  // The small strip is enough to read a screen's light from.
  const small = img.srcset.split(",")[0]?.trim().split(" ")[0] || img.getAttribute("src")!;
  const light = sampleEmission(small, GLASS)
    .then((e) => writeLight(show, e))
    .catch(() => { /* white light stays: the page's own fallback */ });
  ready.set(show, light);
}

function powerOn(show: HTMLElement): void {
  const img = show.querySelector<HTMLImageElement>(".wk-screen--desk .wk-feed");
  const picture = img ? img.decode().catch(() => undefined) : Promise.resolve();
  // Never leave a screen dark for long: a slow image still powers on.
  Promise.race([Promise.all([ready.get(show), picture]), wait(1600)]).then(() => {
    show.classList.add("is-on");
    // The screen comes on first; then the work is signed, once.
    const sign = show.querySelector<HTMLElement>(".alv-sign");
    if (sign) wait(SIGN_DELAY).then(() => (motionOn() ? playSign(sign) : signNow(sign)));
  });
}

/** Every signature signed at once: motion is off, or there is nothing to stage. */
function signAll(): void {
  shows.forEach((s) => {
    const sign = s.querySelector<HTMLElement>(".alv-sign");
    if (sign) signNow(sign);
  });
}

if (root.classList.contains("wk-arm") && motionOn() && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        powerOn(e.target as HTMLElement);
      }
    },
    { rootMargin: "0px 0px -16% 0px" }
  );
  shows.forEach((s) => io.observe(s));
  // Motion switched off mid-visit: everything is simply on.
  onMotionChange((on) => {
    if (on) return;
    io.disconnect();
    root.classList.remove("wk-arm");
    signAll();
  });
} else {
  // No arrival to stage: every screen is on and the key has already yielded.
  root.classList.remove("wk-arm");
  shows.forEach((s) => s.classList.add("is-on"));
  signAll();
}

window.__alvWorkReady = true;
