/**
 * The two approved Phase 1 identity motions, ported without change from the
 * locked exploration (src/phase2/identity.ts, itself copied from
 * phase1-final.ts). Only the class names follow production (.alv-*).
 *
 *   Brand introduction  ALV opens on Bricolage's width axis and becomes
 *                       ALVSolutions.
 *   Maker signature     "Built by ALVSolutions" is revealed left to right
 *                       behind a hard clip edge, as if signed.
 *
 * Every visual property of the introduction is a custom property whose
 * unset value is exactly the resting wordmark (see identity.css). The
 * motion tweens one plain state object and writes it into those properties;
 * when it finishes it removes them, and because the final tweened values
 * equal the resting ones there is nothing left to snap. The wordmark always
 * comes to rest as one even word.
 */
import { gsap } from "gsap";

/* ================================================= brand introduction */

const COMPACT = { w: 75, wght: 700 }; // the compact ALV, also frame one
const REST = { w: 100, wght: 620, ls: -0.038 };
const SOL_START = { ls: 0.05, x: -0.14 }; // em: slightly open, tucked towards ALV

/**
 * grow is how much of Solutions' final width the composition currently
 * claims. The centring offset is derived from it every frame rather than
 * tweened on its own clock, so the name always opens symmetrically about
 * the stage centre and never appears to slide in from one side.
 */
type IntroState = { w: number; wght: number; grow: number; op: number; x: number; ls: number };
type Geometry = { finalWidth: number; alvCompact: number; alvRest: number };

const VARS = ["--alv-w", "--alv-wght", "--sol-op", "--sol-x", "--sol-ls", "--sol-m", "--shift"] as const;

const introTimelines = new WeakMap<HTMLElement, gsap.core.Timeline>();

function writeIntro(wm: HTMLElement, s: IntroState, g: Geometry): void {
  // The width axis is close to linear, so ALV's current width is
  // interpolated from the two measured ends instead of re-measured per frame.
  const alvNow = g.alvCompact + ((g.alvRest - g.alvCompact) * (s.w - COMPACT.w)) / (REST.w - COMPACT.w);
  const claimed = alvNow + s.grow * (g.finalWidth - g.alvRest);
  wm.style.setProperty("--alv-w", `${s.w}%`);
  wm.style.setProperty("--alv-wght", `${s.wght}`);
  wm.style.setProperty("--sol-op", `${s.op}`);
  wm.style.setProperty("--sol-x", `${s.x}em`);
  wm.style.setProperty("--sol-ls", `${s.ls}em`);
  // The same grow value drives how much of Solutions is unmasked, so what
  // is visible and what the layout has made room for always agree.
  wm.style.setProperty("--sol-m", `${(s.grow * 100).toFixed(3)}%`);
  wm.style.setProperty("--shift", `${(g.finalWidth - claimed) / 2}px`);
}

function clearIntro(wm: HTMLElement): void {
  VARS.forEach((v) => wm.style.removeProperty(v));
  wm.style.removeProperty("width");
}

/**
 * Puts one wordmark into its compact first frame. Runs synchronously, so
 * the browser never paints anything between the resting measurement and
 * the compact state.
 */
export function prepareIntro(stage: HTMLElement): { wm: HTMLElement; s: IntroState; g: Geometry } | null {
  const wm = stage.querySelector<HTMLElement>("[data-wm]");
  const alv = wm?.querySelector<HTMLElement>(".alv-wm-alv");
  if (!wm || !alv) return null;

  introTimelines.get(stage)?.kill();
  clearIntro(wm);

  const finalWidth = wm.getBoundingClientRect().width;
  const alvRest = alv.getBoundingClientRect().width;
  wm.style.setProperty("--alv-w", `${COMPACT.w}%`);
  wm.style.setProperty("--alv-wght", `${COMPACT.wght}`);
  const alvCompact = alv.getBoundingClientRect().width;
  const g: Geometry = { finalWidth, alvCompact, alvRest };

  const s: IntroState = { w: COMPACT.w, wght: COMPACT.wght, grow: 0, op: 0, x: SOL_START.x, ls: SOL_START.ls };
  wm.style.width = `${finalWidth}px`;
  writeIntro(wm, s, g);
  stage.classList.add("is-ready");
  return { wm, s, g };
}

export function playIntro(stage: HTMLElement): void {
  const prepared = prepareIntro(stage);
  if (!prepared) return;
  const { wm, s, g } = prepared;
  const apply = (): void => writeIntro(wm, s, g);

  const tl = gsap.timeline({ onUpdate: apply, onComplete: () => clearIntro(wm) });

  // Hold: ALV exists on its own, centred, for a beat.
  // Open: the width axis widens and the weight relaxes.
  tl.to(s, { w: REST.w, wght: REST.wght, duration: 0.9, ease: "power2.inOut" }, 0.22)
    // Solutions unfolds out of ALV while ALV is still resolving, and the
    // composition makes room for it from the centre outwards.
    .to(s, { grow: 1, duration: 1.0, ease: "power2.inOut" }, 0.36)
    .to(s, { op: 1, duration: 0.3, ease: "power1.out" }, 0.38)
    // It arrives tucked slightly towards ALV and a little open, then its
    // position and spacing settle into the set wordmark.
    .to(s, { x: 0, duration: 0.95, ease: "expo.out" }, 0.42)
    .to(s, { ls: REST.ls, duration: 1.05, ease: "expo.out" }, 0.42);

  introTimelines.set(stage, tl);
}

/** Ends any running introduction on its resting wordmark. */
export function finishIntro(stage: HTMLElement): void {
  introTimelines.get(stage)?.kill();
  const wm = stage.querySelector<HTMLElement>("[data-wm]");
  if (wm) clearIntro(wm);
  stage.classList.add("is-ready");
}

/* ==================================================== maker signature */

const signTweens = new WeakMap<HTMLElement, gsap.core.Tween>();

/**
 * The reveal Sergio chose, kept as it was: a hard vertical clip edge moving
 * left to right over 1.2 s on power2.inOut, with the whole line drifting
 * 4 px right as it goes. The hidden first frame is set in CSS from the very
 * first paint; this only ever moves it forward.
 */
export function playSign(sign: HTMLElement): void {
  const line = sign.querySelector<HTMLElement>(".alv-sign-line");
  if (!line) return;

  signTweens.get(sign)?.kill();
  sign.classList.remove("is-signed");

  const tween = gsap.fromTo(
    line,
    { clipPath: "inset(0 100% 0 0)", x: -4 },
    {
      clipPath: "inset(0 0% 0 0)",
      x: 0,
      duration: 1.2,
      ease: "power2.inOut",
      onComplete: () => {
        // Hand the resting state back to the stylesheet. The tween ended on
        // exactly that state, so removing its inline styles changes nothing.
        sign.classList.add("is-signed");
        gsap.set(line, { clearProps: "clipPath,transform" });
      },
    }
  );
  signTweens.set(sign, tween);
}

/** Shows a signature signed, at once. */
export function signNow(sign: HTMLElement): void {
  signTweens.get(sign)?.kill();
  const line = sign.querySelector<HTMLElement>(".alv-sign-line");
  if (line) gsap.set(line, { clearProps: "clipPath,transform" });
  sign.classList.add("is-signed");
}
