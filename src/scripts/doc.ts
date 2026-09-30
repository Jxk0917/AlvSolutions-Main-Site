/**
 * The document pages and the two package sub-pages: /policies/,
 * /legal/privacy/, /legal/terms/, /packages/add-ons/ and
 * /builds/. Each page is complete without this file:
 * the contents rail is a list of anchor links, every grid is plain, and
 * every section reads at rest.
 *
 * With script:
 *   - the contents rail ([data-toc]): its lit bar (the site's bar) glides to
 *     the section being read, as /pricing/'s rail does, and the key light
 *     glides to the link under the pointer. The section being read carries
 *     a lit bar beside its heading. Progress comes from an
 *     IntersectionObserver on each section (no scroll listener);
 *   - every [data-spot] grid has a spotlight that glides to the item under
 *     attention, in that item's own hue;
 *   - a rail of points ([data-ab-rail], interior/point-rail.ts).
 * Only classes and custom properties are written.
 */
import { Spot } from "../interior/spot";
import { pointRail } from "../interior/point-rail";
import { motionOn, onMotionChange } from "../motion/env";

const spots: Spot[] = [];

/* ---- the contents rail ---- */
const toc = document.querySelector<HTMLElement>("[data-toc]");
if (toc) {
  const box = toc.querySelector<HTMLElement>(".dc-toc-in")!;
  const bar = toc.querySelector<HTMLElement>(".dc-toc-bar")!;
  const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>(".dc-toc-a"));
  const secs = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  let current = 0;

  const mark = (el: HTMLElement | null): void => {
    if (!el) return;
    bar.style.setProperty("--by", `${el.offsetTop}px`);
    bar.style.setProperty("--bh", `${el.offsetHeight}px`);
  };
  // The bar rides with the key light while the pointer is on the rail, and
  // returns to the section being read when it leaves.
  const spot = new Spot(box, ".dc-toc-a", () => links[current] ?? null, mark, ".sv-spot");
  spots.push(spot);
  toc.classList.add("is-js");

  const setCurrent = (i: number): void => {
    current = i;
    links.forEach((a, n) => {
      if (n === i) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    secs.forEach((s, n) => s?.classList.toggle("is-current", n === i));
    spot.home();
  };

  // A section counts as reached once its top has passed a line a third of
  // the way down the viewport. The current section is the last one reached;
  // at the foot of the page, the last section is.
  const reached = secs.map(() => false);
  let atEnd = false;
  const decide = (): void => {
    const last = atEnd ? secs.length - 1 : Math.max(0, reached.lastIndexOf(true));
    if (last !== current || !links[current].hasAttribute("aria-current")) setCurrent(last);
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const i = secs.indexOf(e.target as HTMLElement);
        if (i >= 0) reached[i] = e.boundingClientRect.top < innerHeight * 0.34;
      }
      decide();
    },
    { rootMargin: "0px 0px -66% 0px" }
  );
  secs.forEach((s) => s && io.observe(s));
  const foot = document.querySelector(".int-cta, .alv-foot, footer");
  if (foot) {
    new IntersectionObserver(([e]) => {
      atEnd = e.isIntersecting;
      decide();
    }).observe(foot);
  }
  setCurrent(0);

  // The section's own bar only waits dark while motion is on.
  const arm = (on: boolean): void => {
    document.querySelector(".dc-doc")?.classList.toggle("is-armed", on);
  };
  arm(motionOn());
  onMotionChange(arm);
}

/* ---- spotlights ---- */
document.querySelectorAll<HTMLElement>("[data-spot]").forEach((wrap) => {
  spots.push(new Spot(wrap, wrap.dataset.spot || ".sv-card", () => wrap.querySelector<HTMLElement>("[data-rest]"), undefined, ".sv-spot"));
});

/* ---- a rail of points ---- */
document.querySelectorAll<HTMLElement>("[data-ab-rail]").forEach((rail) => spots.push(pointRail(rail)));

// Offsets are measured: place every light again once the real fonts have
// set the layout, and whenever the width changes.
const refresh = (): void => spots.forEach((s) => s.home());
document.fonts?.ready.then(refresh);
// A question opening or closing moves everything below it.
document.addEventListener("toggle", () => requestAnimationFrame(refresh), true);
let frame = 0;
addEventListener("resize", () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(refresh);
});
