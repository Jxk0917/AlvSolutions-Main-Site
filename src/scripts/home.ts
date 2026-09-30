/**
 * Homepage enhancement (Phase 4E-A): the opening and the held work reel,
 * layered over the static homepage. The page is complete without this file;
 * everything here only changes how it is presented.
 *
 * The head script (home/prepaint.njk) has already decided, before first
 * paint, whether the reel is held and whether the opening plays, and set a
 * failsafe that restores the static page if this never takes over.
 */
import { motionOn, onMotionChange } from "../motion/env";
import { Reel } from "../home/reel";
import { Opening } from "../home/opening";
import { geoFor, layoutFor, watchResize } from "../home/reel-geometry";
import { finishIntro } from "../identity/motions";
import { Process } from "../home/process";
import { Picker } from "../home/picker";
import { initClose } from "../home/close";
import { initQuoteForm } from "../forms/quote-wizard";

// The intake form works independently of the reel: wire it at once, not
// after the fonts and the opening have settled.
const quoteForm = document.getElementById("quote-form");
if (quoteForm instanceof HTMLFormElement) initQuoteForm(quoteForm);

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

async function boot(): Promise<void> {
  const work = document.querySelector<HTMLElement>(".h-work");
  const fly = document.querySelector<HTMLElement>("[data-fly]");
  const stage = document.querySelector<HTMLElement>("[data-intro]");
  const nav = document.querySelector<HTMLElement>("[data-nav]");
  const navMark = nav?.querySelector<HTMLElement>(".alv-nav-mark");
  if (!work || !fly || !stage || !nav || !navMark) return;

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

  const reel = new Reel(work);
  reel.setLayout(layoutFor(innerWidth, innerHeight, motionOn()), geoFor(innerWidth, innerHeight));
  const opening = new Opening(reel, fly, stage, nav, navMark);

  // The rest of the room below the reel. None of it pins or holds the page:
  // everything follows native scrolling or answers a click. Each degrades
  // on its own if its section is missing, so none of it gates the reel.
  const $ = (sel: string): HTMLElement | null => document.querySelector<HTMLElement>(sel);
  const procRoot = $("#process");
  const proc = procRoot ? new Process(procRoot) : null;
  const pickers = Array.from(document.querySelectorAll<HTMLElement>("[data-pick]"), (el) => new Picker(el));
  const close = $(".h-close");
  if (close) initClose(close);

  // Every screen's own light; the opening waits a moment for it, not
  // forever, and not at all for a visitor who has already moved on.
  await Promise.race([reel.lightScreens(), wait(900), intent]);

  // Someone who scrolled (or pressed a scrolling key) before we were ready
  // has told us what they want: the finished room, now. prepaint.njk has
  // already dropped the dark start state so they were not left on black.
  const yielded = window.__alvIntent === true;
  const atTop = scrollY < innerHeight * 0.4 && !location.hash && !yielded;
  if (html.classList.contains("alv-opening") || yielded) {
    if (motionOn() && atTop && html.classList.contains("alv-opening")) opening.play();
    else {
      finishIntro(stage);
      Opening.settle(nav, navMark, fly);
    }
  } else if (reel.layout === "held" && motionOn() && atTop) {
    // A returning visitor: the room is already arranged; only the light comes up.
    reel.raiseLight();
  }
  // Coming back through history to a place the browser has already restored
  // (Back/Forward), the visitor's own position wins over the anchor.
  const nav0 = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!(nav0?.type === "back_forward" && scrollY > 4)) reel.followHash();

  watchResize((w, h) => {
    opening.skip();
    reel.setLayout(layoutFor(w, h, motionOn()), geoFor(w, h));
    pickers.forEach((p) => p.refresh());
  });

  onMotionChange((on) => {
    html.classList.toggle("alv-enhance", on);
    if (!on) {
      opening.skip();
      reel.signAll();
    }
    reel.setLayout(layoutFor(innerWidth, innerHeight, on), geoFor(innerWidth, innerHeight));
    proc?.setMotion(on);
  });
}

void boot();
