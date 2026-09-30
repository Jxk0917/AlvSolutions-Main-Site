/**
 * /pricing/ enhancement. The page is complete without this file: the rail
 * is a list of anchor links, every price is printed lit, and every row with
 * a service page is its own link.
 *
 * With script:
 *   - the rail's lit bar glides to the category being read, measured from
 *     the link itself (the rail's links differ in size, and on a phone the
 *     rail scrolls sideways, keeping the current category in view). Progress
 *     comes from an IntersectionObserver, as on /services/;
 *   - the rail's key light glides to the category under the pointer;
 *   - each category's spotlight glides to the row or package under the
 *     pointer, in the category's hue;
 *   - a category's prices come on in a pass of light, in order, the first
 *     time it is reached.
 *
 * On a phone (600px and under) each category folds into a button: its name,
 * count, lowest price and See more, as the four builds do on /packages/.
 * Opening one folds the last back and lights its prices again; a deep link
 * into a category opens it. Without this the categories simply stay open.
 * Only custom properties and classes are written; pricing.css turns them
 * into transforms and transitions those.
 */
import { Spot } from "../interior/spot";
import { motionOn, onMotionChange } from "../motion/env";

const spots: Spot[] = [];

/* ---- the rail ---- */
const rail = document.querySelector<HTMLElement>("[data-rail]");
const railIn = rail?.querySelector<HTMLElement>(".pl-rail-in");
const cats = Array.from(document.querySelectorAll<HTMLElement>("[data-cat]"));

if (rail && railIn && cats.length) {
  const links = Array.from(rail.querySelectorAll<HTMLAnchorElement>(".pl-rail-a"));
  let current = 0;

  const mark = (a: HTMLElement | null): void => {
    if (!a) return;
    const s = railIn.style;
    s.setProperty("--bx", `${a.offsetLeft}px`);
    s.setProperty("--by", `${a.offsetTop}px`);
    s.setProperty("--bw", `${a.offsetWidth}px`);
    s.setProperty("--bh", `${a.offsetHeight}px`);
  };
  // On a phone the rail scrolls sideways: keep the category being read in
  // view, without moving the page.
  const reveal = (a: HTMLElement): void => {
    if (railIn.scrollWidth <= railIn.clientWidth) return;
    const left = a.offsetLeft - (railIn.clientWidth - a.offsetWidth) / 2;
    railIn.scrollTo({ left, behavior: motionOn() ? "smooth" : "auto" });
  };
  const setCurrent = (i: number): void => {
    current = i;
    links.forEach((a, n) => {
      if (n === i) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    railSpot.home();
    reveal(links[i]);
  };

  const railSpot = new Spot(railIn, ".pl-rail-a", () => links[current] ?? null, mark, ".sv-spot");
  spots.push(railSpot);

  const reached = cats.map(() => false);
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const i = cats.indexOf(e.target as HTMLElement);
        if (i >= 0) reached[i] = e.boundingClientRect.top < innerHeight * 0.34;
      }
      const i = Math.max(0, reached.lastIndexOf(true));
      if (i !== current || !links[i].hasAttribute("aria-current")) setCurrent(i);
    },
    { rootMargin: "0px 0px -66% 0px" }
  );
  cats.forEach((c) => io.observe(c));
  setCurrent(0);
  rail.classList.add("is-js");

  // On a phone the rail docks under the nav, whose own shade fades out at
  // its foot. While docked (.is-stuck) the rail closes that gap itself.
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--alv-nav-h")) || 72;
  new IntersectionObserver(
    ([e]) => rail.classList.toggle("is-stuck", e.intersectionRatio < 1 && e.boundingClientRect.top <= navH + 1),
    { rootMargin: `-${navH + 1}px 0px 0px 0px`, threshold: 1 }
  ).observe(rail);
}

/* ---- spotlights: packages and rows ---- */
document.querySelectorAll<HTMLElement>("[data-spot]").forEach((wrap) => {
  spots.push(
    new Spot(wrap, wrap.dataset.spot || ".pl-row", () => wrap.querySelector<HTMLElement>("[data-rest]"), undefined, ".sv-spot")
  );
});

/* ---- the prices come on, once per category ---- */
if (motionOn() && "IntersectionObserver" in window) {
  cats.forEach((c) => {
    c.querySelectorAll<HTMLElement>(".pl-p").forEach((p, i) => p.style.setProperty("--d", String(i)));
    c.classList.add("is-armed");
  });
  const lit = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-on");
        lit.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -20% 0px" }
  );
  cats.forEach((c) => lit.observe(c));
  onMotionChange((on) => {
    if (!on) cats.forEach((c) => c.classList.add("is-on"));
  });
}

/* ---- on a phone, each category folds to a button: one open at a time ---- */
const catList = document.querySelector<HTMLElement>(".pl-cats");
if (catList && cats.length) {
  const phone = matchMedia("(max-width: 600px)");
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--alv-nav-h")) || 72;
  const set = (cat: HTMLElement, open: boolean): void => {
    const was = cat.classList.contains("is-open");
    cat.classList.toggle("is-open", open);
    const btn = cat.querySelector<HTMLButtonElement>(".pl-cat-toggle");
    btn?.setAttribute("aria-expanded", String(open));
    const label = btn?.querySelector(".pl-cat-toggle-l");
    if (label) label.textContent = open ? "See less" : "See more";
    // Opened, its prices come on again: the pass shows what just opened.
    if (open && !was && cat.classList.contains("is-armed")) {
      cat.classList.remove("is-on");
      void cat.offsetWidth;
      cat.classList.add("is-on");
    }
  };
  // Folding the one above moves this one up: once the fold has run, bring
  // its top back into view if it went under the nav.
  const keepInView = (cat: HTMLElement): void => {
    setTimeout(() => {
      if (cat.getBoundingClientRect().top < navH) cat.scrollIntoView({ behavior: motionOn() ? "smooth" : "auto", block: "start" });
    }, motionOn() ? 440 : 0);
  };
  cats.forEach((cat) => {
    const name = cat.querySelector(".pl-cat-h")?.textContent ?? "category";
    const more = cat.querySelector<HTMLElement>(".pl-cat-more");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pl-cat-toggle";
    btn.setAttribute("aria-controls", more?.id ?? "");
    btn.setAttribute("aria-label", `${name}, see every price`);
    btn.innerHTML = '<span class="pl-cat-toggle-l">See more</span><svg class="int-ic" aria-hidden="true"><use href="#i-chevron-down"/></svg>';
    more?.before(btn);
    btn.addEventListener("click", () => {
      const open = !cat.classList.contains("is-open");
      cats.forEach((c) => set(c, c === cat && open));
      if (open) keepInView(cat);
    });
  });

  // A deep link into a category (#care, #brand-and-design, #founders) opens
  // that category, then lands on the part it named.
  const fromHash = (): void => {
    if (!phone.matches) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    const cat = target ? cats.find((c) => c.contains(target)) : undefined;
    if (!cat || !target) return;
    cats.forEach((c) => set(c, c === cat));
    setTimeout(() => target.scrollIntoView({ block: "start" }), motionOn() ? 440 : 0);
  };
  addEventListener("hashchange", fromHash);

  const sync = (): void => {
    catList.classList.toggle("pl-acc", phone.matches);
    // Leaving phone width: nothing stays half-folded.
    cats.forEach((c) => set(c, false));
    if (phone.matches) fromHash();
    refresh();
  };
  phone.addEventListener("change", sync);
  sync();
}

// Offsets are measured: re-place every light once the real fonts have set
// the layout, and whenever the width changes.
function refresh(): void {
  spots.forEach((s) => s.home());
}
document.fonts?.ready.then(refresh);
let frame = 0;
addEventListener("resize", () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(refresh);
});
