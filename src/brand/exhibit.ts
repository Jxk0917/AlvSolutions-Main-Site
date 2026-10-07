/**
 * Selected Work: three projects on one orbit (brand/exhibit.njk).
 *
 * The section is complete without this file: the centerpieces stand side by
 * side and every project's identity is open below. With it:
 *
 *   - the projects share one stage, on an implied ellipse seen from a little
 *     above. The one at the front stands full size in the key light; the
 *     other two sit a third of a turn away on either side, smaller, higher
 *     (further back) and in shadow;
 *   - Previous / Next, the project names, the arrow keys (while focus is on
 *     the stage controls), a horizontal swipe, or a click on a background
 *     project turn the orbit. One number, the orbit's rotation, is eased;
 *     every project's angle comes from it, and its place, size, depth, light
 *     and layer follow from that angle, so each one travels the arc rather
 *     than cutting across it. Turning again mid-way carries on from where
 *     the orbit is; nothing jumps;
 *   - "View full identity" opens a drawer with the project in front. Turning
 *     the orbit while it is open swaps its contents for the new project
 *     (the drawer eases to the new height), so it can never hold the wrong
 *     project; "Hide full identity" closes it and returns focus to the toggle.
 *
 * Geometry is read from the stage's CSS (--orbit-rx, --orbit-lift,
 * --orbit-back, --orbit-dim), so each breakpoint tunes the orbit in
 * brandwork.css. Only transform, opacity, filter and z-index are written.
 * With motion off the orbit turns at once and the drawer opens at once.
 * Background projects are hidden from assistive tech; a polite live region
 * names the project that comes forward.
 */
import { motionOn } from "../motion/env";

const TURN = 980; // ms, one third of a turn
const DRAWER = 520; // ms, the drawer opening, closing or changing height
const SLOT = (Math.PI * 2) / 3;

const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
const mod = (n: number, m: number): number => ((n % m) + m) % m;

type Geo = { rx: number; lift: number; back: number; dim: number };

export function initExhibit(root: HTMLElement): void {
  const stage = root.querySelector<HTMLElement>("[data-bx-stage]");
  const sats = Array.from(root.querySelectorAll<HTMLElement>("[data-sat]"));
  const infos = Array.from(root.querySelectorAll<HTMLElement>("[data-info]"));
  const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-dt]"));
  const ctl = root.querySelector<HTMLElement>("[data-bx-ctl]");
  const prev = root.querySelector<HTMLButtonElement>("[data-bx-prev]");
  const next = root.querySelector<HTMLButtonElement>("[data-bx-next]");
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-bx-to]"));
  const toggle = root.querySelector<HTMLButtonElement>("[data-bx-toggle]");
  const toggleLabel = root.querySelector<HTMLElement>("[data-bx-toggle-label]");
  const less = root.querySelector<HTMLButtonElement>("[data-bx-less]");
  const drawer = root.querySelector<HTMLElement>("[data-bx-more]");
  const live = root.querySelector<HTMLElement>("[data-bx-live]");
  if (!stage || sats.length !== 3 || !ctl || !prev || !next || !toggle || !drawer) return;

  const n = sats.length;
  const names = infos.map((el) => el.querySelector(".bx-info-h")?.textContent?.trim() ?? "");

  /* ------------------------------------------------------------ the orbit */

  let pos = 0; // the orbit's rotation, in slots; the front project is round(pos) mod 3
  let target = 0;
  let from = 0;
  let t0 = 0;
  let dur = TURN;
  let ease = easeInOut;
  let frame = 0;
  let geo: Geo = { rx: 300, lift: 40, back: 0.56, dim: 0.5 };
  const front = (): number => mod(Math.round(target), n);

  const measure = (): void => {
    const cs = getComputedStyle(stage);
    const num = (p: string, d: number): number => {
      const v = parseFloat(cs.getPropertyValue(p));
      return Number.isFinite(v) ? v : d;
    };
    const w = stage.clientWidth;
    const pieceH = sats[0].offsetHeight || w * 0.4;
    geo = {
      rx: num("--orbit-rx", 0.33) * w,
      lift: num("--orbit-lift", 0.12) * pieceH,
      back: num("--orbit-back", 0.56),
      dim: num("--orbit-dim", 0.5),
    };
  };

  /** Every project where the orbit's rotation puts it. */
  const draw = (): void => {
    sats.forEach((s, k) => {
      const a = (k - pos) * SLOT;
      const c = Math.cos(a);
      // 1 at the front, 0 a third of a turn away; below 0 directly behind.
      const t = (c + 0.5) / 1.5;
      const x = Math.sin(a) * geo.rx;
      const y = -((1 - c) / 2) * geo.lift * (4 / 3);
      // Size falls away quickly off the front, so a project at the widest
      // point of the ring (a quarter turn) is already small enough to stay
      // inside the stage.
      const sc = geo.back + (1 - geo.back) * (t > 0 ? Math.pow(t, 1.35) : t * 0.5);
      const lit = 1 - (1 - geo.dim) * (1 - t);
      s.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${sc.toFixed(4)})`;
      s.style.opacity = Math.max(0, Math.min(1, 0.5 + 0.5 * t)).toFixed(3);
      s.style.filter = t > 0.995 ? "none" : `brightness(${lit.toFixed(3)}) saturate(${(0.4 + 0.6 * Math.max(0, t)).toFixed(3)}) blur(${(0.9 * (1 - Math.max(0, t))).toFixed(2)}px)`;
      s.style.zIndex = String(Math.round((c + 1) * 50));
    });
  };

  const tick = (now: number): void => {
    const p = Math.min(1, (now - t0) / dur);
    pos = from + (target - from) * ease(p);
    draw();
    if (p < 1) frame = requestAnimationFrame(tick);
    else {
      frame = 0;
      pos = target;
      stage.classList.remove("is-turning");
    }
  };

  /** Turn the orbit by `step` slots (positive: the right-hand project comes forward). */
  const turn = (step: number): void => {
    if (!step) return;
    target += step;
    sync();
    if (!motionOn()) {
      cancelAnimationFrame(frame);
      frame = 0;
      pos = target;
      draw();
      return;
    }
    // Mid-turn, carry on from where the orbit is without stopping first.
    ease = frame ? easeOut : easeInOut;
    from = pos;
    dur = TURN * Math.min(1.6, Math.max(0.7, Math.abs(target - from)));
    t0 = performance.now();
    stage.classList.add("is-turning");
    if (!frame) frame = requestAnimationFrame(tick);
  };

  /** The shortest way round to project `k`. */
  const goTo = (k: number): void => {
    const d = mod(k - front(), n);
    turn(d === 0 ? 0 : d === 1 ? 1 : -1);
  };

  /* ----------------------------------------------- what is in front, and why */

  let open = false;
  let drawerAnim: Animation | null = null;

  const showPanel = (k: number): void => {
    panels.forEach((p, i) => (p.hidden = i !== k));
  };

  /** Everything that names the front project follows it at once. */
  const sync = (): void => {
    const k = front();
    sats.forEach((s, i) => {
      const on = i === k;
      s.classList.toggle("is-front", on);
      if (on) s.removeAttribute("aria-hidden");
      else s.setAttribute("aria-hidden", "true");
    });
    infos.forEach((el, i) => el.classList.toggle("is-on", i === k));
    tabs.forEach((b, i) => {
      if (i === k) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
    ctl.style.setProperty("--i", String(k));
    stage.dataset.on = sats[k].dataset.tone ?? "";
    if (live) live.textContent = `${names[k]}, ${k + 1} of ${n}`;
    if (open) swapPanel(k);
  };

  const height = (): number => drawer.getBoundingClientRect().height;
  /** The drawer's own height for what it holds now, with nothing easing it. */
  const natural = (): number => {
    drawerAnim?.cancel();
    drawerAnim = null;
    return height();
  };

  const animateHeight = (fromH: number, toH: number, done?: () => void): void => {
    drawerAnim?.cancel();
    if (!motionOn() || Math.abs(fromH - toH) < 1) {
      drawerAnim = null;
      done?.();
      return;
    }
    drawer.style.overflow = "hidden";
    drawerAnim = drawer.animate([{ height: `${fromH}px` }, { height: `${toH}px` }], {
      duration: DRAWER,
      easing: "cubic-bezier(0.45, 0, 0.2, 1)",
    });
    drawerAnim.onfinish = () => {
      drawer.style.overflow = "";
      drawerAnim = null;
      done?.();
    };
    drawerAnim.oncancel = () => {
      drawer.style.overflow = "";
    };
  };

  const fadeIn = (el: HTMLElement): void => {
    if (!motionOn()) return;
    el.animate([{ opacity: 0, translate: "0 10px" }, { opacity: 1, translate: "0 0" }], {
      duration: 460,
      delay: 80,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "backwards",
    });
  };

  const swapPanel = (k: number): void => {
    if (!panels[k] || !panels[k].hidden) return;
    const h0 = height();
    showPanel(k);
    const h1 = natural();
    fadeIn(panels[k]);
    animateHeight(h0, h1);
  };

  const setOpen = (on: boolean, focusToggle = false): void => {
    if (on === open) return;
    open = on;
    toggle.setAttribute("aria-expanded", String(on));
    if (toggleLabel) toggleLabel.textContent = on ? "Hide full identity" : "View full identity";
    if (on) {
      const h0 = drawer.hidden ? 0 : height();
      showPanel(front());
      drawer.hidden = false;
      const h = natural();
      fadeIn(panels[front()]);
      animateHeight(h0, h);
    } else {
      const h = height();
      animateHeight(h, 0, () => {
        if (!open) drawer.hidden = true;
      });
      if (focusToggle) {
        toggle.focus({ preventScroll: true });
        // The drawer may have been long: bring the toggle back into view.
        const r = toggle.getBoundingClientRect();
        if (r.top < 80 || r.bottom > innerHeight) {
          toggle.scrollIntoView({ block: "center", behavior: motionOn() ? "smooth" : "auto" });
        }
      }
    }
  };

  /* -------------------------------------------------------------- controls */

  prev.addEventListener("click", () => turn(-1));
  next.addEventListener("click", () => turn(1));
  tabs.forEach((b, i) => b.addEventListener("click", () => goTo(i)));
  toggle.addEventListener("click", () => setOpen(!open));
  less?.addEventListener("click", () => setOpen(false, true));

  ctl.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    turn(e.key === "ArrowRight" ? 1 : -1);
  });

  // A background project is a shortcut to itself (the buttons remain the
  // keyboard's way there).
  sats.forEach((s, i) =>
    s.addEventListener("click", () => {
      if (i !== front()) goTo(i);
    })
  );

  // A deliberate horizontal swipe on a touch screen; vertical scrolling is
  // never taken (touch-action: pan-y on the stage).
  let sx = 0;
  let sy = 0;
  let touching = false;
  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    touching = true;
    sx = e.clientX;
    sy = e.clientY;
  });
  stage.addEventListener("pointerup", (e) => {
    if (!touching) return;
    touching = false;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) turn(dx < 0 ? 1 : -1);
  });
  stage.addEventListener("pointercancel", () => (touching = false));

  // Pictures on the far side of the orbit, and in the drawer, are ready
  // before they are needed, once the stage is near.
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img[loading='lazy']"));
  new IntersectionObserver(
    (entries, obs) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      imgs.forEach((img) => (img.loading = "eager"));
      obs.disconnect();
    },
    { rootMargin: "600px 0px" }
  ).observe(stage);

  // The orbit's size follows the stage's.
  let rz = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => {
      measure();
      draw();
    });
  }).observe(stage);

  root.classList.add("is-js");
  ctl.hidden = false;
  toggle.hidden = false;
  if (less) less.hidden = false;
  drawer.hidden = true;
  measure();
  sync();
  draw();
}
