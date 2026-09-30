/**
 * The two approved identity motions. The signature is ported without change
 * from the locked exploration (src/phase2/identity.ts, itself copied from
 * phase1-final.ts); only the class names follow production (.alv-*). The
 * introduction keeps its locked timeline and easings but now opens the master
 * identity instead of a width-axis wordmark.
 *
 *   Brand introduction  The ALV symbol stands alone, lit, for a beat; then
 *                       ALVSolutions opens out of it, and the lockup comes to
 *                       rest centred.
 *   Maker signature     "Built by ALVSolutions" is revealed left to right
 *                       behind a hard clip edge, as if signed.
 *
 * Every visual property of the introduction is a custom property whose
 * unset value is exactly the resting lockup (see identity.css). The motion
 * tweens one plain state object and writes it into those properties; when it
 * finishes it removes them, and because the final tweened values equal the
 * resting ones there is nothing left to snap. The lockup always comes to
 * rest as one even composition.
 *
 * The symbol itself never animates: its geometry is the logo, so it holds
 * still while the name unfolds beside it. (The previous introduction widened
 * a text "ALV" on Bricolage's width axis; the symbol has no such axis, and
 * nothing is invented to stand in for one.)
 */
import { gsap } from "gsap";

/* ================================================= brand introduction */

const REST = { ls: -0.024 }; // the wordmark's set tracking, em
const SOL_START = { ls: 0.05, x: -0.14 }; // em: slightly open, tucked towards the symbol

/**
 * grow is how much of the wordmark's final width the composition currently
 * claims. The centring offset is derived from it every frame rather than
 * tweened on its own clock, so the name always opens symmetrically about
 * the stage centre and never appears to slide in from one side.
 */
type IntroState = { grow: number; op: number; x: number; ls: number };
type Geometry = { finalWidth: number; markWidth: number };

const VARS = ["--sol-op", "--sol-x", "--sol-ls", "--sol-m", "--shift"] as const;

const introTimelines = new WeakMap<HTMLElement, gsap.core.Timeline>();

function writeIntro(wm: HTMLElement, s: IntroState, g: Geometry): void {
  const claimed = g.markWidth + s.grow * (g.finalWidth - g.markWidth);
  wm.style.setProperty("--sol-op", `${s.op}`);
  wm.style.setProperty("--sol-x", `${s.x}em`);
  wm.style.setProperty("--sol-ls", `${s.ls}em`);
  // The same grow value drives how much of the wordmark is unmasked, so what
  // is visible and what the layout has made room for always agree.
  wm.style.setProperty("--sol-m", `${(s.grow * 100).toFixed(3)}%`);
  wm.style.setProperty("--shift", `${(g.finalWidth - claimed) / 2}px`);
}

function clearIntro(wm: HTMLElement): void {
  VARS.forEach((v) => wm.style.removeProperty(v));
  wm.style.removeProperty("width");
}

/**
 * Puts one lockup into its first frame: the symbol alone. Runs
 * synchronously, so the browser never paints anything between the resting
 * measurement and the first frame.
 */
export function prepareIntro(stage: HTMLElement): { wm: HTMLElement; s: IntroState; g: Geometry } | null {
  const wm = stage.querySelector<HTMLElement>("[data-wm]");
  const mark = wm?.querySelector<HTMLElement>(".alv-lockup-mark");
  if (!wm || !mark) return null;

  introTimelines.get(stage)?.kill();
  clearIntro(wm);

  const finalWidth = wm.getBoundingClientRect().width;
  const markWidth = mark.getBoundingClientRect().width;
  const g: Geometry = { finalWidth, markWidth };

  const s: IntroState = { grow: 0, op: 0, x: SOL_START.x, ls: SOL_START.ls };
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

  // Hold: the symbol exists on its own, centred, for a beat.
  // Open: the name unfolds out of the symbol, and the composition makes room
  // for it from the centre outwards.
  tl.to(s, { grow: 1, duration: 1.0, ease: "power2.inOut" }, 0.36)
    .to(s, { op: 1, duration: 0.3, ease: "power1.out" }, 0.38)
    // It arrives tucked slightly towards the symbol and a little open, then
    // its position and spacing settle into the set wordmark.
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
