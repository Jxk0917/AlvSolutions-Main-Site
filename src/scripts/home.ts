/**
 * Homepage enhancement: the opening and the hero stage, layered over the
 * static homepage. The page is complete without this file; everything here
 * only changes how it is presented.
 *
 * The head script (home/prepaint.njk) has already decided, before first
 * paint, whether the opening plays, and set a failsafe that restores the
 * static page if this never takes over.
 */
import { motionOn, onMotionChange } from "../motion/env";
import { Opening } from "../home/opening";
import { Hero } from "../home/hero";
import { finishIntro } from "../identity/motions";
import { Process } from "../home/process";
import { Picker } from "../home/picker";
import { initClose } from "../home/close";
import { initQuoteForm } from "../forms/quote-wizard";
import { initServices } from "../home/services";

// The intake form works independently of the hero: wire it at once, not
// after the fonts and the opening have settled.
const quoteForm = document.getElementById("quote-form");
if (quoteForm instanceof HTMLFormElement) initQuoteForm(quoteForm);

// The services row lights itself as it arrives, whatever the hero does.
const svcRow = document.querySelector<HTMLElement>("[data-svc]");
if (svcRow) initServices(svcRow);

declare global {
  interface Window {
    __alvHomeReady?: boolean;
    /** Set by home/prepaint.njk when the visitor scrolled before we were ready. */
    __alvIntent?: boolean;
  }
}

const html = document.documentElement;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
/** Resolves as soon as the visitor asks to move on (prepaint.njk latches it). */
const intent: Promise<void> = new Promise((r) => {
  if (window.__alvIntent) r();
  else addEventListener("alv-intent", () => r(), { once: true });
});

/** Calls back on meaningful viewport changes only: not a touch browser's toolbar showing or hiding. */
function watchResize(cb: () => void): void {
  let lastW = innerWidth, lastH = innerHeight, raf = 0;
  const coarse = matchMedia("(pointer: coarse)").matches;
  addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const w = innerWidth, h = innerHeight;
      if (w === lastW && h === lastH) return;
      if (coarse && w === lastW && Math.abs(h - lastH) < 120) return;
      lastW = w;
      lastH = h;
      cb();
    });
  });
}

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLElement>(".hx");
  const fly = document.querySelector<HTMLElement>("[data-fly]");
  const stage = document.querySelector<HTMLElement>("[data-intro]");
  const nav = document.querySelector<HTMLElement>("[data-nav]");
  const navMark = nav?.querySelector<HTMLElement>(".alv-nav-mark");
  if (!root || !fly || !stage || !nav || !navMark) return;

  // Measure with the real faces: the introduction and the flight depend on
  // them. But never make a visitor who has already moved on wait for them:
  // the opening will not play for them, so it needs no measuring.
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('640 100px "Archivo Variable"', "ALVSolutions"),
        document.fonts.load('620 100px "Bricolage Grotesque Variable"', "Built around your business."),
        document.fonts.load('italic 560 20px "Instrument Sans Variable"', "ALVSolutions"),
      ]),
      wait(2500),
      intent,
    ]);
  } catch {
    /* measure with what is there */
  }

  // Too late: the failsafe has already restored the static page. Leave it.
  if (html.classList.contains("alv-failsafe")) return;
  window.__alvHomeReady = true;

  const hero = new Hero(root);
  const opening = new Opening(hero, fly, stage, nav, navMark);

  // The rest of the page. None of it pins or holds the page: everything
  // follows native scrolling or answers a click.
  const $ = (sel: string): HTMLElement | null => document.querySelector<HTMLElement>(sel);
  const procRoot = $("#process");
  const proc = procRoot ? new Process(procRoot) : null;
  const pickers = Array.from(document.querySelectorAll<HTMLElement>("[data-pick]"), (el) => new Picker(el));
  const close = $(".h-close");
  if (close) initClose(close);

  // Someone who scrolled (or pressed a scrolling key) before we were ready
  // has told us what they want: the finished room, now. prepaint.njk has
  // already dropped the dark start state so they were not left on black.
  const yielded = window.__alvIntent === true;
  const atTop = scrollY < innerHeight * 0.4 && !location.hash && !yielded;
  if (html.classList.contains("alv-opening") && motionOn() && atTop) {
    // The stage begins as the words settle (or at once, if the opening is skipped).
    opening.onReveal = () => hero.start();
    opening.play();
  } else {
    finishIntro(stage);
    Opening.settle(nav, navMark, fly);
    hero.start();
  }

  watchResize(() => {
    if (opening.running) {
      // The opening carries on; the stage is measured when it begins.
      opening.remeasure();
      hero.room.measure();
      return;
    }
    hero.refresh();
    pickers.forEach((p) => p.refresh());
  });

  onMotionChange((on) => {
    html.classList.toggle("alv-enhance", on);
    if (!on) opening.skip();
    hero.setMotion(on);
    proc?.setMotion(on);
  });
}

void boot();
