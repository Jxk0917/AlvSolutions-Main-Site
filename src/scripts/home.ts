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

declare global {
  interface Window {
    __alvHomeReady?: boolean;
  }
}

const html = document.documentElement;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function boot(): Promise<void> {
  const work = document.querySelector<HTMLElement>(".h-work");
  const fly = document.querySelector<HTMLElement>("[data-fly]");
  const stage = document.querySelector<HTMLElement>("[data-intro]");
  const nav = document.querySelector<HTMLElement>("[data-nav]");
  const navMark = nav?.querySelector<HTMLElement>(".alv-nav-mark");
  if (!work || !fly || !stage || !nav || !navMark) return;

  // Measure with the real faces: the introduction and the flight depend on them.
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('620 100px "Bricolage Grotesque Variable"', "ALVSolutions"),
        document.fonts.load('700 100px "Bricolage Grotesque Variable"', "ALV"),
        document.fonts.load('italic 560 20px "Instrument Sans Variable"', "ALVSolutions"),
      ]),
      wait(2500),
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

  // Every screen's own light; the opening waits a moment for it, not forever.
  await Promise.race([reel.lightScreens(), wait(900)]);

  const atTop = scrollY < innerHeight * 0.4 && !location.hash;
  if (html.classList.contains("alv-opening")) {
    if (motionOn() && atTop) opening.play();
    else {
      finishIntro(stage);
      Opening.settle(nav, navMark, fly);
    }
  } else if (reel.layout === "held" && motionOn() && atTop) {
    // A returning visitor: the room is already arranged; only the light comes up.
    reel.raiseLight();
  }
  reel.followHash();

  watchResize((w, h) => {
    opening.skip();
    reel.setLayout(layoutFor(w, h, motionOn()), geoFor(w, h));
  });

  onMotionChange((on) => {
    html.classList.toggle("alv-enhance", on);
    if (!on) {
      opening.skip();
      reel.signAll();
    }
    reel.setLayout(layoutFor(innerWidth, innerHeight, on), geoFor(innerWidth, innerHeight));
  });
}

void boot();
