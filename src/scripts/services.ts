/**
 * /services/ enhancement. The page is complete without this file: the rail
 * is a list of anchor links and every card is its own link.
 *
 * With script:
 *   - the rail's lit bar glides to the category being read. Progress comes
 *     from an IntersectionObserver watching each category cross a line
 *     a third of the way down the viewport (no scroll listener);
 *   - the rail's key light glides to the category under the pointer and
 *     returns to the one being read when the pointer leaves;
 *   - each category's spotlight glides to the card under attention, in
 *     that card's own hue.
 * Only custom properties and classes are written; interior.css turns them
 * into transforms and transitions those.
 */
import { Spot } from "../interior/spot";

const spots: Spot[] = [];

const rail = document.querySelector<HTMLElement>("[data-rail]");
const cats = Array.from(document.querySelectorAll<HTMLElement>("[data-cat]"));

if (rail && cats.length) {
  const links = Array.from(rail.querySelectorAll<HTMLAnchorElement>(".sv-rail-a"));
  let current = 0;

  const mark = (i: number): void => {
    rail.style.setProperty("--i", String(i));
  };
  const setCurrent = (i: number): void => {
    current = i;
    links.forEach((a, n) => {
      if (n === i) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    mark(i);
    railSpot.home();
  };

  // The bar rides with the key light while the pointer is on the rail, and
  // returns to the category being read when it leaves.
  const railSpot = new Spot(
    rail,
    ".sv-rail-a",
    () => links[current] ?? null,
    (el) => el && mark(links.indexOf(el as HTMLAnchorElement)),
    ".sv-spot"
  );

  // A category counts as reached once its top has passed the line, whether
  // it is still in the observed band or already scrolled off the top. The
  // current category is the last one reached.
  const reached = cats.map(() => false);
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const i = cats.indexOf(e.target as HTMLElement);
        if (i >= 0) reached[i] = e.boundingClientRect.top < innerHeight * 0.34;
      }
      const last = reached.lastIndexOf(true);
      const i = Math.max(0, last);
      if (i !== current || !links[i].hasAttribute("aria-current")) setCurrent(i);
    },
    { rootMargin: "0px 0px -66% 0px" }
  );
  cats.forEach((c) => io.observe(c));
  spots.push(railSpot);
  setCurrent(0);

  // On a phone the rail docks under the nav, whose own shade fades out at
  // its foot. While docked (.is-stuck) the rail closes that gap itself, so
  // nothing scrolls visibly between the two.
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--alv-nav-h")) || 72;
  new IntersectionObserver(
    ([e]) => rail.classList.toggle("is-stuck", e.intersectionRatio < 1 && e.boundingClientRect.top <= navH + 1),
    { rootMargin: `-${navH + 1}px 0px 0px 0px`, threshold: 1 }
  ).observe(rail);
}

document.querySelectorAll<HTMLElement>("[data-spot]").forEach((wrap) => {
  spots.push(new Spot(wrap, ".sv-card", () => null, undefined, ".sv-spot"));
});

// Offsets are measured: re-place every light once the real fonts have set
// the layout, and whenever the width changes.
const refresh = (): void => spots.forEach((s) => s.home());
document.fonts?.ready.then(refresh);
let frame = 0;
addEventListener("resize", () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(refresh);
});
