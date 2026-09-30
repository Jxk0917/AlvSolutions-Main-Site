/**
 * The deal: ALVSolutions' one text-entrance language, site-wide.
 *
 * Text and text-based information arrive like a quick deal of cards: each
 * piece drops a few pixels into place, top to bottom, with a very small
 * stagger, so a whole screen of it reads as one fast transition rather than
 * a row of separate animations. Nothing waits on it and nothing holds the
 * scroll: a piece is dealt as it reaches the viewport, and everything that
 * arrives together is dealt together.
 *
 * What is dealt, found automatically on every page (so a new page inherits
 * it without doing anything):
 *   - units: a component's meaningful rows or items, dealt whole - table
 *     rows, list items, cards, package and price options, facts, fields.
 *     Nothing inside a unit is dealt separately;
 *   - text: headings, paragraphs, labels, captions, links and buttons, and
 *     any other element that holds text directly.
 * What is not: pictures, screens, devices, video and Screen Light's own
 * light. Pictures and stand-alone objects get a plain, short fade instead;
 * the rest (the homepage reel, the scroll-lit process, the showcase stages,
 * the site nav) keep the motion they already own.
 *
 * Markup can steer it, for anything the rules do not cover:
 *   data-deal        deal this element whole, as one unit
 *   data-deal="fade" fade it in, like a picture
 *   data-deal="off"  leave this element and everything inside it alone
 *
 * Only `translate` and `opacity` are animated (Web Animations, never the
 * element's own styles), so no hover transform, transition or measurement
 * elsewhere on the site is disturbed: the spotlights measure with
 * offsetTop/offsetLeft, which `translate` never moves.
 *
 * With motion off (the OS setting or the site's own switch) nothing is
 * hidden and nothing moves.
 */
import { motionOn, onMotionChange } from "./env";

/* ---------------------------------------------------------------- tuning */

const TEXT_TRAVEL = 8; // px, how far a line of text drops
const UNIT_TRAVEL = 12; // px, a row or card: a little more, it is heavier
const DURATION = 420; // ms, each piece
const STEP = 32; // ms between pieces...
const SPREAD = 300; // ms: ...compressed so a whole deal never staggers longer
const FADE = 520; // ms, a picture or object
const EASE = "cubic-bezier(0.22, 0.8, 0.24, 1)"; // fast out, settles, no overshoot
// Opacity is done early (at 40%), so the drop is what you see, not a fade.
const OPAQUE_AT = 0.4;

/* ------------------------------------------------------------- the rules */

/** Never entered, never looked inside: motion owned elsewhere, or not content. */
const SKIP = [
  "[data-deal='off']", "script", "style", "template", "noscript",
  ".alv-skip", ".alv-nav", ".alv-sr-only",
  // Screen Light's own light
  ".key-cone", ".key-pool", ".room-light", ".bounce",
  // motion these already own: the homepage reel, the scroll-lit process,
  // the /work/ showcase stages and their room
  ".h-work", ".h-line", ".wk-stage", ".wk-room",
].join(",");

/** A component's meaningful rows and items, each dealt whole. */
const UNIT = [
  "[data-deal='']", "[data-deal='unit']",
  "tr", "li",
  // cards and options
  ".int-card", ".int-tier", ".int-faq-item", ".int-commit", ".int-fact", ".int-slot", ".int-ticket",
  ".sv-card", ".sv-tier", ".h-card", ".h-opt",
  // packages and prices
  ".pk-build", ".pk-plan", ".pk-extra", ".pk-file", ".pk-part", ".pk-rail-opt",
  ".pl-row", ".pl-tier",
  ".sd-plan", ".sd-rung", ".sd-fact", ".sd-beat", ".sd-pick", ".sd-extra", ".sd-fit-slot", ".sd-lv-sum",
  ".plist-row",
  // form fields: a label and its control arrive together
  ".field", ".fset", ".opt", ".rev-group",
].join(",");

/** Text that is dealt on its own when it is not inside a unit. */
const TEXT = "h1,h2,h3,h4,h5,h6,p,dt,dd,label,legend,figcaption,blockquote,summary,a,button,.alv-tag";

/** Pictures and objects: a plain fade, never dealt. */
const VISUAL = [
  "[data-deal='fade']", "img", "picture", "video", "canvas", "iframe", "svg",
  ".int-head-obj", ".sd-stage", ".sd-bc",
].join(",");

type Kind = "text" | "unit" | "fade";

function holdsText(el: Element): boolean {
  for (const n of el.childNodes) {
    if (n.nodeType === Node.TEXT_NODE && n.textContent!.trim()) return true;
  }
  return false;
}

/** Everything under `root` that enters, outermost first. */
function collect(root: Element, out: Map<Element, Kind>): void {
  for (const el of root.children) {
    if (el.matches(SKIP) || out.has(el)) continue;
    if (el.matches(UNIT)) out.set(el, "unit");
    else if (el.matches(VISUAL)) out.set(el, "fade");
    else if (el.matches(TEXT) || holdsText(el)) out.set(el, "text");
    else collect(el, out);
  }
}

/* -------------------------------------------------------------- the deal */

const html = document.documentElement;
const kinds = new Map<Element, Kind>();
const running = new Set<Animation>();
let pending: Element[] = [];
let queued = false;
let io: IntersectionObserver | null = null;

function play(el: Element, delay: number, rest: number): void {
  const kind = kinds.get(el)!;
  const frames: Keyframe[] =
    kind === "fade"
      ? [{ opacity: 0 }, { opacity: rest }]
      : [
          { opacity: 0, translate: `0 -${kind === "unit" ? UNIT_TRAVEL : TEXT_TRAVEL}px` },
          { opacity: rest, offset: OPAQUE_AT },
          { opacity: rest, translate: "0 0" },
        ];
  const a = el.animate(frames, {
    duration: kind === "fade" ? FADE : DURATION,
    delay,
    easing: kind === "fade" ? "ease-out" : EASE,
    // Hold the first frame through the delay; afterwards the element is
    // entirely its own again.
    fill: "backwards",
  });
  running.add(a);
  a.onfinish = a.oncancel = () => running.delete(a);
}

/**
 * Deals everything that arrived in one observer report, as one deal. A
 * microtask, not a frame: a frame request can be held back (a background
 * tab, a busy compositor) and the page must never wait on it.
 */
function flush(): void {
  queued = false;
  const batch = pending;
  pending = [];
  // Top to bottom; pieces side by side go left to right.
  const at = batch.map((el) => ({ el, r: el.getBoundingClientRect() }));
  at.sort((p, q) => Math.round(p.r.top / 6) - Math.round(q.r.top / 6) || p.r.left - q.r.left);
  const step = at.length > 1 ? Math.min(STEP, SPREAD / (at.length - 1)) : 0;
  // Uncover the whole deal, then read each piece's own resting opacity
  // (some rest dimmed), then deal: all in one task, so nothing paints between.
  at.forEach(({ el }) => el.classList.remove("alv-wait"));
  const rests = at.map(({ el }) => {
    const v = parseFloat(getComputedStyle(el).opacity);
    return Number.isNaN(v) ? 1 : v;
  });
  at.forEach(({ el }, i) => play(el, Math.round(i * step), rests[i]));
}

function arrive(el: Element): void {
  pending.push(el);
  if (!queued) {
    queued = true;
    queueMicrotask(flush);
  }
}

/** Motion switched off mid-visit: everything is simply in place. */
function stop(): void {
  io?.disconnect();
  io = null;
  pending = [];
  running.forEach((a) => a.finish());
  kinds.forEach((_, el) => el.classList.remove("alv-wait"));
  html.classList.remove("alv-deal");
}

function start(): void {
  if (!motionOn() || !("IntersectionObserver" in window) || !("animate" in Element.prototype)) {
    stop();
    return;
  }
  html.classList.add("alv-deal");
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io!.unobserve(e.target);
        arrive(e.target);
      }
    },
    // A sliver in from the bottom edge, so a piece is seen arriving.
    { rootMargin: "0px 0px -4% 0px" }
  );
  deal(document.body);
  // Safety net: whatever is on screen once the page has settled is dealt,
  // even if the browser never rendered the frame that would have reported
  // it (a window that is not being painted). Never leave text hidden.
  setTimeout(() => {
    if (!io) return;
    kinds.forEach((_, el) => {
      if (!el.classList.contains("alv-wait")) return;
      const r = el.getBoundingClientRect();
      if (r.height && r.bottom > 0 && r.top < innerHeight) {
        io!.unobserve(el);
        arrive(el);
      }
    });
  }, 2500);
}

/**
 * Finds everything under `root` that enters and deals each piece as it
 * reaches the viewport. Run once for the page; a script that puts new
 * content on the page later (a new step, a loaded panel) can call it for
 * that content. Pieces already known are left alone.
 */
export function deal(root: Element): void {
  if (!io) return;
  const found = new Map<Element, Kind>();
  collect(root, found);
  found.forEach((kind, el) => {
    if (kinds.has(el)) return;
    kinds.set(el, kind);
    el.classList.add("alv-wait");
    io!.observe(el);
  });
}

start();
onMotionChange((on) => (on ? undefined : stop()));
