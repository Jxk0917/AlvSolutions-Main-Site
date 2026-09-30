/**
 * /packages/ enhancement. The page is complete without this file: the rail
 * is a native radio group, and the package file, the rail's lit bar and the
 * chart's lit column all follow the checked radio through CSS :has().
 *
 * With script, three lights glide to whatever has attention and return to
 * the choice when it leaves, the way the homepage picker's key light does:
 *   - the package rail's spotlight, with its lit bar riding along,
 *   - the four builds' spotlight,
 *   - the comparison chart's lit column (slab and bar).
 * Only custom properties are written; interior.css turns them into
 * transforms and transitions those.
 *
 * On a phone (600px and under) the four builds fold into buttons: name,
 * price and See more. Opening one folds the last back to a button. The
 * cards are complete without this; it only adds the buttons and the fold.
 *
 * It also lets a deep link to one package (#foundation, #standard,
 * #complete) open that package, as the old anchors did.
 */
import { Spot } from "../interior/spot";

const radio = (slug: string): HTMLInputElement | null => document.getElementById(`pk-${slug}`) as HTMLInputElement | null;
const checkedSlug = (): string => document.querySelector<HTMLInputElement>(".pk-rail-input:checked")?.value ?? "standard";

const choose = (input: HTMLInputElement): void => {
  input.checked = true;
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const openFromHash = (): void => {
  const input = radio(location.hash.slice(1));
  if (input) choose(input);
};
addEventListener("hashchange", openFromHash);
openFromHash();

const spots: Spot[] = [];

const rail = document.querySelector<HTMLElement>('[data-spot="rail"]');
if (rail) {
  const opt = (): HTMLElement | null => rail.querySelector<HTMLElement>(`.pk-rail-opt:has(#pk-${checkedSlug()})`);
  // The lit bar rides with the spotlight: it follows the package under
  // attention, and returns to the chosen one when attention leaves.
  const opts = Array.from(rail.querySelectorAll<HTMLElement>(".pk-rail-opt"));
  spots.push(new Spot(rail, ".pk-rail-opt", opt, (el) => el && rail.style.setProperty("--i", String(opts.indexOf(el)))));
  rail.addEventListener("change", () => spots.forEach((s) => s.home()));
}

const builds = document.querySelector<HTMLElement>('[data-spot="builds"]');
if (builds) spots.push(new Spot(builds, ".pk-build", () => null));

/** The chart's lit column follows the pointer over any of its columns. */
const chart = document.querySelector<HTMLElement>(".pk-cmp-in");
if (chart) {
  const slugs = Array.from(chart.querySelectorAll<HTMLElement>("thead [data-col]"), (th) => th.dataset.col!);
  const set = (slug: string): void => {
    chart.dataset.on = slug;
    chart.style.setProperty("--i", String(Math.max(0, slugs.indexOf(slug))));
  };
  chart.querySelectorAll<HTMLElement>("[data-col]").forEach((cell) => {
    cell.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") set(cell.dataset.col!);
    });
  });
  chart.addEventListener("pointerleave", () => set(checkedSlug()));
  chart.querySelectorAll<HTMLElement>("thead label").forEach((l) =>
    l.addEventListener("focusin", () => set(l.closest<HTMLElement>("[data-col]")!.dataset.col!))
  );
  document.addEventListener("change", (e) => {
    if ((e.target as HTMLElement).matches(".pk-rail-input")) set(checkedSlug());
  });
  set(checkedSlug());
  chart.classList.add("is-js");
}

// Offsets are measured: re-place every light once the real fonts have set
// the layout, and whenever the width changes.
const refresh = (): void => spots.forEach((s) => s.home());
document.fonts?.ready.then(refresh);
let frame = 0;
addEventListener("resize", () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(refresh);
});

// A chart column head is a label for its package's radio, up in the rail.
// Clicked, a label also focuses that radio, and the browser would scroll
// the page back up to it: choose without moving the reader instead.
document.querySelectorAll<HTMLLabelElement>(".pk-cmp-pick").forEach((label) => {
  label.addEventListener("click", (e) => {
    const input = radio(label.htmlFor.replace(/^pk-/, ""));
    if (!input) return;
    e.preventDefault();
    choose(input);
  });
});

/** The four builds as an accordion on a phone: one open at a time. */
const buildList = document.querySelector<HTMLElement>(".pk-builds");
if (buildList) {
  const phone = matchMedia("(max-width: 600px)");
  const cards = Array.from(buildList.querySelectorAll<HTMLElement>(".pk-build"));
  const set = (card: HTMLElement, open: boolean): void => {
    card.classList.toggle("is-open", open);
    const btn = card.querySelector<HTMLButtonElement>(".pk-build-toggle");
    btn?.setAttribute("aria-expanded", String(open));
    const label = btn?.querySelector(".pk-build-toggle-l");
    if (label) label.textContent = open ? "See less" : "See more";
  };
  cards.forEach((card) => {
    const name = card.querySelector(".pk-build-name")?.textContent ?? "build";
    const more = card.querySelector<HTMLElement>(".pk-build-more");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pk-build-toggle";
    btn.setAttribute("aria-controls", more?.id ?? "");
    btn.setAttribute("aria-label", `${name}, what it includes`);
    btn.innerHTML = '<span class="pk-build-toggle-l">See more</span><svg class="int-ic" aria-hidden="true"><use href="#i-chevron-down"/></svg>';
    // The button sits after the price, before the folded detail.
    more?.before(btn);
    btn.addEventListener("click", () => {
      const open = !card.classList.contains("is-open");
      cards.forEach((c) => set(c, c === card && open));
    });
    set(card, false);
  });
  // A deep link to one build (#build-detailer) opens it.
  const fromHash = (): void => {
    const card = cards.find((c) => c.id === location.hash.slice(1));
    if (card) cards.forEach((c) => set(c, c === card));
  };
  addEventListener("hashchange", fromHash);
  fromHash();
  const sync = (): void => {
    buildList.classList.toggle("pk-acc", phone.matches);
    // Leaving phone width: nothing stays half-folded.
    if (!phone.matches) cards.forEach((c) => set(c, false));
  };
  phone.addEventListener("change", sync);
  sync();
}
