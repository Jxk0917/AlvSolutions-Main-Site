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
import { motionOn } from "../motion/env";

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

/**
 * The package file swap. Choosing another package sends the old file
 * flying off to the right - gathering speed, fading and softening as it
 * goes - while the new one flows in from the left, the side the rail is
 * on, its parts following a beat behind. The stage eases between the two
 * heights so nothing below it jumps. A new choice mid-flight sends the
 * arriving file off from wherever it has got to. Off screen (a choice
 * made down at the chart) or with motion off, the file simply changes.
 */
const stage = document.querySelector<HTMLElement>(".pk-files");
if (stage) {
  const files = Array.from(stage.querySelectorAll<HTMLElement>(".pk-file"));
  const file = (slug: string): HTMLElement | undefined => files.find((f) => f.dataset.for === slug);
  let current = file(checkedSlug());
  current?.classList.add("is-shown");
  stage.classList.add("is-js");

  let running: Animation[] = [];
  const settle = (): void => {
    running.forEach((a) => a.cancel());
    running = [];
    files.forEach((f) => f.classList.remove("is-leaving"));
  };
  const inView = (): boolean => {
    const r = stage.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  };

  document.addEventListener("change", (e) => {
    if (!(e.target as HTMLElement).matches(".pk-rail-input")) return;
    const next = file(checkedSlug());
    const prev = current;
    if (!next || next === prev) return;
    current = next;

    // Read where everything is before anything is cancelled.
    const from = stage.offsetHeight;
    const animate = motionOn() && inView() && prev !== undefined;
    const prevStyle = prev && getComputedStyle(prev);
    const start = { opacity: prevStyle?.opacity ?? "1", transform: prevStyle?.transform === "none" ? "translateX(0)" : prevStyle?.transform ?? "translateX(0)" };

    settle();
    prev?.classList.remove("is-shown");
    next.classList.add("is-shown");
    if (!animate || !prev) return;

    prev.classList.add("is-leaving");
    const to = stage.offsetHeight;

    // Out: gathering speed to the right, softening as it goes; its light
    // drops away on its own, shorter curve, so it is gone before the new
    // file lands.
    const out = prev.animate(
      [
        { transform: start.transform, filter: "blur(0px)" },
        { transform: "translateX(24%)", filter: "blur(8px)" },
      ],
      { duration: 400, easing: "cubic-bezier(0.45, 0, 0.8, 0.4)", fill: "forwards" }
    );
    const fade = prev.animate([{ opacity: start.opacity }, { opacity: 0 }], {
      duration: 300, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards",
    });
    out.onfinish = () => {
      prev.classList.remove("is-leaving");
      out.cancel();
      fade.cancel();
    };
    running.push(out, fade);

    // In: the file glides from the left and settles; it lands on top of
    // the leaving one, and its opacity comes up quickly so the two never
    // read through each other.
    running.push(
      next.animate([{ transform: "translateX(-12%)" }, { transform: "translateX(0)" }], {
        duration: 760, delay: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards",
      }),
      next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 180, easing: "cubic-bezier(0.2, 0, 0.2, 1)", fill: "backwards" })
    );
    next.querySelectorAll<HTMLElement>(".pk-file-head, .pk-file-key, .pk-part-block, .pk-ex, .pk-file-act").forEach((part, i) => {
      running.push(
        part.animate(
          [
            { opacity: 0, transform: "translateX(-32px)" },
            { opacity: 1, transform: "translateX(0)" },
          ],
          { duration: 640, delay: 230 + i * 45, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" }
        )
      );
    });

    if (from !== to) {
      running.push(stage.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 640, easing: "cubic-bezier(0.45, 0, 0.2, 1)" }));
    }
  });
}

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

/**
 * The choice explorer inside each package file: a native <details> whose
 * body eases open and shut. All three stay in step, so choosing another
 * package keeps it as open or closed as it was. With motion off it just
 * toggles.
 */
const explorers = Array.from(document.querySelectorAll<HTMLDetailsElement>("[data-ex]"));
explorers.forEach((d) => {
  const sum = d.querySelector<HTMLElement>("summary");
  const body = d.querySelector<HTMLElement>(".pk-ex-body");
  if (!sum || !body) return;
  let anim: Animation | null = null;
  sum.addEventListener("click", (e) => {
    e.preventDefault();
    const open = !d.open;
    explorers.forEach((o) => {
      if (o !== d) o.open = open;
    });
    anim?.cancel();
    if (!motionOn()) {
      d.open = open;
      return;
    }
    const from = body.getBoundingClientRect().height;
    d.open = true;
    const to = open ? body.scrollHeight : 0;
    anim = body.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 420, easing: "cubic-bezier(0.45, 0, 0.2, 1)" });
    anim.onfinish = () => {
      anim = null;
      d.open = open;
    };
  });
});
