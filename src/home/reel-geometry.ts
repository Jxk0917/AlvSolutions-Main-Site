/**
 * Where the work stands in the room, for each chapter, on each kind of screen.
 *
 * The choreography itself is the locked exploration's (phase3-home.ts,
 * workStates / narrowStates). What production adds is which of those
 * geometries a viewport gets:
 *
 *   NARROW       under 761px wide (or too short to hold a room): no held
 *                reel. The static stacked chapters stay, lit modestly.
 *   PORTRAIT     761px and wider but taller than it is wide (w/h < 0.85):
 *                the locked stacked geometry - words at the top, the work
 *                sized to the band beneath - instead of the wide room
 *                squeezed into portrait.
 *   WIDE         the locked cinematic geometry.
 *   WIDE-CAPPED  the same geometry held inside a centred 1600 x 1000 frame,
 *                so a very large display gets the approved composition
 *                instead of a stretched one with dead bands.
 *
 * The head script (home/prepaint.njk) makes the same decision before first
 * paint; keep the two in step.
 */
import type { ObjState, RoomState } from "../light/room";

export type Geo = "narrow" | "portrait" | "wide";
export type Layout = "held" | "flat";

export const MIN_HELD_W = 761;
export const MIN_HELD_H = 560;
export const PORTRAIT_RATIO = 0.85;
export const CAP = { w: 1600, h: 1000 };

export function geoFor(w: number, h: number): Geo {
  if (w < MIN_HELD_W || h < MIN_HELD_H) return "narrow";
  return w / h < PORTRAIT_RATIO ? "portrait" : "wide";
}

export function layoutFor(w: number, h: number, motion: boolean): Layout {
  return motion && geoFor(w, h) !== "narrow" ? "held" : "flat";
}

const obj = (x: number, y: number, s: number, p: number, o = 1): ObjState => ({ x, y, s, p, o });

/**
 * WIDE, in the coordinates of the composition frame (percent of its width
 * and height). Values exactly as locked.
 */
export const WIDE_STATES: RoomState[] = [
  // The opening's settled state: ALVSolutions' words in the key, the work waiting in the dark.
  { key: { x: 27, w: 46, i: 1, py: 86 },
    objs: { hacD: obj(66, 61, 0.5, 0.32), lucD: obj(84, 59, 0.44, 0.36), hacP: obj(74, 58, 0.36, 0, 0), lucP: obj(90, 58, 0.34, 0, 0) } },
  // Hacienda.
  { key: { x: 66, w: 30, i: 0.3, py: 86 },
    objs: { hacD: obj(66, 77, 1, 1), hacP: obj(80, 60, 0.45, 0, 0), lucD: obj(90, 50, 0.3, 0.16), lucP: obj(95, 50, 0.3, 0, 0) } },
  // Hacienda on a phone: the phone steps forward, the desktop steps back.
  { key: { x: 62, w: 24, i: 0.3, py: 90 },
    objs: { hacP: obj(62, 88, 1.05, 1), hacD: obj(82, 66, 0.6, 0.28), lucD: obj(90, 50, 0.3, 0.16), lucP: obj(95, 50, 0.3, 0, 0) } },
  // Lucid: desktop and phone together.
  { key: { x: 64, w: 30, i: 0.3, py: 86 },
    objs: { lucD: obj(64, 76, 1, 1), lucP: obj(89, 81, 1.02, 0.6), hacD: obj(90, 46, 0.28, 0.16), hacP: obj(90, 46, 0.28, 0, 0) } },
  // Side by side: two light sources, one warm and one cool.
  { key: { x: 53, w: 40, i: 0.3, py: 88 },
    objs: { hacD: obj(31, 80, 0.72, 1), hacP: obj(47, 84, 0.73, 0.55), lucD: obj(73, 80, 0.72, 1), lucP: obj(89, 84, 0.73, 0.55) } },
];

/** The capped composition frame inside a room of W x H pixels. */
export function capFrame(W: number, H: number): { x0: number; y0: number; sw: number; sh: number } {
  const sw = Math.min(W, CAP.w);
  const sh = Math.min(H, CAP.h);
  return { x0: (W - sw) / 2, y0: (H - sh) / 2, sw, sh };
}

/**
 * Maps a state from frame coordinates into room coordinates. The identity
 * whenever the room is no larger than the cap. Screen sizes need no mapping:
 * their widths are set against the capped frame in CSS.
 */
export function toRoom(s: RoomState, W: number, H: number): RoomState {
  const f = capFrame(W, H);
  const X = (x: number): number => ((f.x0 + (x / 100) * f.sw) / W) * 100;
  const Y = (y: number): number => ((f.y0 + (y / 100) * f.sh) / H) * 100;
  const objs: Record<string, ObjState> = {};
  for (const id in s.objs) {
    const o = s.objs[id];
    objs[id] = { ...o, x: X(o.x), y: Y(o.y) };
  }
  return { key: { ...s.key, x: X(s.key.x), w: (s.key.w * f.sw) / W, py: Y(s.key.py) }, objs };
}

/** How much a screen's own light has to shrink to stay the same size in the frame. */
export function bounceScale(W: number): number {
  return Math.min(W, CAP.w) / W;
}

/** The pre-opening state: the settled room, dark, with the work drawn back into it. */
export function preOpen(state0: RoomState): RoomState {
  const s = structuredClone(state0);
  s.key = { x: 50, w: 60, i: 0, py: 72 };
  for (const id in s.objs) {
    s.objs[id].o = 0;
    s.objs[id].s *= 0.72;
    s.objs[id].y -= 6;
  }
  return s;
}

/* ------------------------------------------------------------ stacked */

export type StackParts = {
  room: HTMLElement;
  copy: HTMLElement; // the hero words
  panels: HTMLElement[]; // the story blocks of chapters 1-3
  pair: HTMLElement; // the story block of chapter 4
  dev: (id: string) => HTMLElement | null;
};

/** Distance from the top of `root` to the bottom of `el`, ignoring transforms. */
function bottomIn(el: HTMLElement, root: HTMLElement): number {
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return y + el.offsetHeight;
}

/**
 * PORTRAIT: the locked narrow geometry, ported unchanged. Words at the top,
 * work in the band beneath. Screens are sized to the band they actually
 * have, so a short window never pushes the work up into the words.
 */
export function stackedStates(parts: StackParts): RoomState[] {
  const H = parts.room.offsetHeight || 1;
  const pct = (px: number): number => (px / H) * 100;
  const h = (id: string): number => parts.dev(id)?.offsetHeight || 1;
  const fit = (id: string, top: number, bottom: number, max: number): number => Math.max(0.25, Math.min(max, (bottom - top) / h(id)));
  const heroBottom = bottomIn(parts.copy, parts.room);
  const workBottom = Math.max(...parts.panels.map((p) => bottomIn(p, parts.room)));
  const pairBottom = bottomIn(parts.pair, parts.room);
  const floor = H - 64;

  // Work sits in the middle of the band it has, not flush against the floor,
  // so the story and the work read as one composition.
  const stand = (id: string, s: number, top: number, bottom: number): number => Math.min(bottom, (top + bottom) / 2 + (h(id) * s) / 2);

  const t0 = heroBottom + 28, b0 = H - 28;
  const s0 = fit("hacD", t0, b0, 0.8);
  const base0 = stand("hacD", s0, t0, b0);
  const t1 = workBottom + 22;
  const sD = fit("hacD", t1, floor, 1);
  const sP = fit("hacP", t1, floor, 1.3);
  const sL = fit("lucD", t1, floor - 12, 1) * 0.92;
  const t4 = pairBottom + 24;
  const sPair = Math.min(fit("hacP", t4, floor, 1.15), fit("lucP", t4, floor, 1.15));
  const hidden = (x: number, y: number, s: number): ObjState => obj(x, y, s, 0, 0);
  const deep = pct(t1 + (floor - t1) * 0.4);
  const keyAt = (py: number, i = 0.3) => ({ x: 50, w: 72, i, py: Math.min(97, py) });
  const bD = stand("hacD", sD, t1, floor);
  const bP = stand("hacP", sP, t1, floor);
  const bL = stand("lucD", sL, t1, floor);
  const b4 = Math.max(stand("hacP", sPair, t4, floor), stand("lucP", sPair, t4, floor));

  return [
    // The opening: Hacienda waiting in front, Lucid behind it, deeper in the dark.
    { key: { x: 40, w: 96, i: 1, py: pct(base0 + 18) },
      objs: { hacD: obj(42, pct(base0), s0, 0.32), lucD: obj(68, pct(base0 - h("hacD") * s0 * 0.22), s0 * 0.7, 0.34), hacP: hidden(40, pct(base0), s0 * 0.5), lucP: hidden(84, pct(base0), s0 * 0.5) } },
    { key: keyAt(pct(bD + 14)),
      objs: { hacD: obj(50, pct(bD), sD, 1), hacP: hidden(72, deep, sD * 0.5), lucD: hidden(72, deep, 0.3), lucP: hidden(86, deep, 0.3) } },
    { key: keyAt(pct(bP + 14)),
      objs: { hacP: obj(50, pct(bP), sP, 1), hacD: obj(76, pct(bP - (bP - t1) * 0.3), sD * 0.42, 0.28), lucD: hidden(72, deep, 0.3), lucP: hidden(86, deep, 0.3) } },
    { key: keyAt(pct(bL + 14)),
      objs: { lucD: obj(46, pct(bL), sL, 1), lucP: obj(85, pct(Math.min(floor, bL + 12)), fit("lucP", t1, floor, 1) * 0.52, 0.6), hacD: hidden(76, deep, 0.3), hacP: hidden(28, deep, 0.3) } },
    { key: { x: 50, w: 90, i: 0.3, py: Math.min(97, pct(b4 + 14)) },
      objs: { hacP: obj(28, pct(b4), sPair, 1), lucP: obj(72, pct(b4), sPair, 1), hacD: hidden(28, deep, 0.3), lucD: hidden(72, deep, 0.3) } },
  ];
}

/* ------------------------------------------------------------- resize */

/**
 * Calls back on meaningful viewport changes only. On touch devices a
 * height-only change under 120px is the browser's own toolbar showing or
 * hiding, not a new layout, and is ignored (the held room is sized in svh,
 * so it does not move either). Width changes and orientation changes always
 * count.
 */
export function watchResize(cb: (w: number, h: number) => void): void {
  let lastW = innerWidth;
  let lastH = innerHeight;
  let raf = 0;
  const coarse = matchMedia("(pointer: coarse)").matches;
  addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const w = innerWidth, h = innerHeight;
      if (w === lastW && h === lastH) return;
      if (coarse && w === lastW && Math.abs(h - lastH) < 120) return;
      lastW = w;
      lastH = h;
      cb(w, h);
    });
  });
}
