/**
 * /contact/ enhancement. The form is src/forms/quote-wizard.ts, unchanged;
 * this file only reads its state and writes classes and custom properties.
 * The page is complete without it: the form works, the road is three plain
 * items, and the back button stays hidden.
 *
 * With script:
 *   - the wizard runs;
 *   - a key light glides to the field under the pointer or focus, in the
 *     form's own surface, and goes out when neither is on a field;
 *   - the road after the form is a rail: its lit bar fills as the form
 *     moves through its steps, each station comes on as the bar reaches it,
 *     and sending lights them all;
 *   - the back button appears when the visit came from a package or a
 *     service, and returns to where the visitor was;
 *   - "what is useful to have" has a spotlight that glides across its grid;
 *     the process lights as it is scrolled past.
 */
import { initQuoteForm } from "../forms/quote-wizard";
import { Spot } from "../interior/spot";
import { Process } from "../home/process";
import { motionOn, onMotionChange } from "../motion/env";

const form = document.getElementById("quote-form");
const spots: Spot[] = [];

if (form instanceof HTMLFormElement) {
  initQuoteForm(form);

  /* ---- the light follows the field ---- */
  const light = document.createElement("span");
  light.className = "sv-spot ct-spot";
  light.setAttribute("aria-hidden", "true");
  form.append(light);
  const answering = (): HTMLElement | null => {
    const a = document.activeElement;
    return a instanceof HTMLElement && form.contains(a) ? a.closest<HTMLElement>(".opt, [data-field]") : null;
  };
  // A single field, or one option of a group: never a whole group at once.
  const fieldSpot = new Spot(form, ".opt, [data-field]:not([data-group])", answering, undefined, ".ct-spot");
  spots.push(fieldSpot);
  // A choice that opens or closes a follow-up moves everything below it.
  form.addEventListener("change", () => requestAnimationFrame(() => fieldSpot.home()));
  // A step (or a follow-up) enters with a transform, which for its length is
  // what its children measure against: place the light again once it ends.
  form.addEventListener("animationend", () => fieldSpot.home());

  /* ---- the road after the form ---- */
  const road = document.querySelector<HTMLElement>("[data-road]");
  const list = road?.querySelector<HTMLElement>(".ct-road-list");
  const bar = form.querySelector<HTMLElement>(".wiz-bar");
  const stations = list ? Array.from(list.querySelectorAll<HTMLElement>(".next-item")) : [];
  if (road && list && bar && stations.length > 1) {
    const fill = document.createElement("span");
    fill.className = "ct-road-fill";
    fill.setAttribute("aria-hidden", "true");
    list.append(fill);
    let span = 1;
    let read = 0; // how much of the form has been scrolled past, 0 to 1
    const dotY = (s: HTMLElement): number => s.offsetTop + 29.5; // the dot's centre
    const render = (): void => {
      const sent = form.classList.contains("done");
      const now = Number(bar.getAttribute("aria-valuenow")) || 1;
      const max = Number(bar.getAttribute("aria-valuemax")) || 4;
      // The bar follows the reader down the form, and never trails the
      // step they have reached: the review step has it full.
      const p = sent ? 1 : Math.max((now - 1) / (max - 1), read);
      list.style.setProperty("--cp", String(p));
      stations.forEach((s) => {
        const at = (dotY(s) - dotY(stations[0])) / span;
        s.classList.toggle("is-lit", at <= p + 0.001);
      });
      road.classList.toggle("is-sent", sent);
    };
    const place = (): void => {
      const top = dotY(stations[0]);
      span = Math.max(1, dotY(stations[stations.length - 1]) - top);
      list.style.setProperty("--rt", `${top}px`);
      list.style.setProperty("--rh", `${span}px`);
      render();
    };
    const arm = (on: boolean): void => {
      road.classList.toggle("is-armed", on);
      if (on) place();
    };
    // Progress down the form is read from marks spread along it, each
    // counted once it is above a line 62% down the viewport
    // (IntersectionObserver, no scroll listener). The form's height changes
    // with every step; the marks are placed by percentage, so they follow it.
    const LINE = 0.62;
    const MARKS = 24;
    const holder = form.parentElement as HTMLElement;
    const marks = Array.from({ length: MARKS }, (_, i) => {
      const m = document.createElement("span");
      m.className = "ct-mark";
      m.setAttribute("aria-hidden", "true");
      m.style.top = `${(i / (MARKS - 1)) * 100}%`;
      holder.append(m);
      return m;
    });
    const passed = marks.map(() => false);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = marks.indexOf(e.target as HTMLElement);
          if (i >= 0) passed[i] = e.boundingClientRect.top < innerHeight * LINE;
        }
        read = passed.filter(Boolean).length / MARKS;
        render();
      },
      { rootMargin: `0px 0px -${Math.round((1 - LINE) * 100)}% 0px` }
    );
    marks.forEach((m) => io.observe(m));
    new MutationObserver(render).observe(bar, { attributes: true, attributeFilter: ["aria-valuenow"] });
    new MutationObserver(render).observe(form, { attributes: true, attributeFilter: ["class"] });
    arm(motionOn());
    onMotionChange(arm);
    document.fonts?.ready.then(() => motionOn() && place());
    addEventListener("resize", () => motionOn() && place());
  }
}

/* ---- back: only where the visit came from a package or a service ---- */
const back = document.querySelector<HTMLAnchorElement>(".int-back[data-show-if]");
if (back) {
  const params = new URLSearchParams(location.search);
  const label = back.querySelector("[data-back-label]");
  const slug = params.get("service");
  if (slug && !params.has("package")) {
    try {
      const routes: { slug: string; name: string; url: string }[] = JSON.parse(
        document.getElementById("svc-routes")?.textContent ?? "[]"
      );
      const hit = routes.find((s) => s.slug === slug);
      if (hit) {
        back.href = hit.url;
        if (label) label.textContent = `Back to ${hit.name}`;
        back.hidden = false;
      }
    } catch {
      /* unreadable list: the button stays hidden */
    }
  }
  // A trade build is a page of its own under /builds/, not a package on
  // /packages/: send the button back to the one it came from.
  const pkg = params.get("package");
  if (pkg && ["detailer", "home-service-pro", "salon", "restaurant"].includes(pkg)) {
    back.href = `/builds/${pkg}/`;
    if (label) label.textContent = "Back to the build";
  }
  if (params.has(back.dataset.showIf ?? "package")) back.hidden = false;
  // Real history.back() lands on the exact page and scroll position clicked
  // from; a fresh navigation to the default never would.
  back.addEventListener("click", (e) => {
    if (!document.referrer || history.length < 2) return;
    try {
      if (new URL(document.referrer).origin === location.origin) {
        e.preventDefault();
        history.back();
      }
    } catch {
      /* malformed referrer: fall through to the href */
    }
  });
}

/* ---- what is useful to have ---- */
document.querySelectorAll<HTMLElement>("[data-spot]").forEach((wrap) => {
  spots.push(new Spot(wrap, wrap.dataset.spot || ".ct-bring-i", () => null, undefined, ".sv-spot"));
});

/* ---- how a project runs ---- */
const procRoot = document.getElementById("process");
if (procRoot) {
  const proc = new Process(procRoot);
  onMotionChange((on) => proc.setMotion(on));
}

// Offsets are measured: place every light again once the real fonts have
// set the layout, and whenever the width changes.
const refresh = (): void => spots.forEach((s) => s.home());
document.fonts?.ready.then(refresh);
let frame = 0;
addEventListener("resize", () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(refresh);
});
