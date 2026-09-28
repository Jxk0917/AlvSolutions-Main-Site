/**
 * Screen Light: the room engine.
 *
 *   One key light, always from above. It goes where attention goes, and it
 *   hands the room over to the work.
 *
 * Ported from the locked exploration (src/screen-light/light.ts). Two
 * production changes, both for accessibility and large displays, neither
 * changing the choreography:
 *   - a screen that has left the room is faded, never `visibility: hidden`,
 *     so its screenshot and alt text stay in the accessibility tree;
 *   - `bounceScale` keeps a screen's light the same size relative to the
 *     composition when the composition is capped inside a wider room.
 */
import { gsap } from "gsap";
import type { Emission } from "./emission";

export type ObjState = { x: number; y: number; s: number; p: number; o: number };
export type KeyState = { x: number; w: number; i: number; py: number };
export type RoomState = { key: KeyState; objs: Record<string, ObjState> };

type Obj = {
  el: HTMLElement;
  bounce: HTMLElement | null;
  emit: Emission | null;
  w: number;
  h: number;
};

const gauss = (dx: number, w: number): number => Math.exp(-((dx / Math.max(1, w * 0.55)) ** 2));

export class Room {
  readonly root: HTMLElement;
  readonly state: RoomState;
  bounceScale = 1;
  private objs = new Map<string, Obj>();
  private lit: { el: HTMLElement; cx: number; left: number; width: number }[] = [];
  private W = 1;
  private H = 1;
  private tl: gsap.core.Timeline | null = null;

  constructor(root: HTMLElement, initial: RoomState) {
    this.root = root;
    this.state = structuredClone(initial);
    root.querySelectorAll<HTMLElement>("[data-obj]").forEach((el) => {
      const id = el.dataset.obj!;
      this.objs.set(id, { el, bounce: root.querySelector(`.bounce[data-for="${id}"]`), emit: null, w: 1, h: 1 });
    });
    this.measure();
  }

  get ids(): string[] {
    return Array.from(this.objs.keys());
  }

  element(id: string): HTMLElement | null {
    return this.objs.get(id)?.el ?? null;
  }

  emission(id: string): Emission | null {
    return this.objs.get(id)?.emit ?? null;
  }

  /** Gives an object its light, sampled from its own pixels. */
  setEmission(id: string, e: Emission): void {
    const o = this.objs.get(id);
    if (!o) return;
    o.emit = e;
    for (const el of [o.el, o.bounce]) {
      if (!el) continue;
      el.style.setProperty("--e-all", e.all);
      el.style.setProperty("--e-bottom", e.bottom);
      el.style.setProperty("--e-left", e.left);
      el.style.setProperty("--e-right", e.right);
    }
    this.render();
  }

  /** Geometry is cached; call on resize. */
  measure(): void {
    const r = this.root.getBoundingClientRect();
    this.W = r.width || 1;
    this.H = r.height || 1;
    this.objs.forEach((o) => {
      o.w = o.el.offsetWidth;
      o.h = o.el.offsetHeight;
    });
    this.lit = Array.from(this.root.querySelectorAll<HTMLElement>("[data-lit]")).map((el) => {
      const b = el.getBoundingClientRect();
      return { el, cx: ((b.left + b.width / 2 - r.left) / this.W) * 100, left: b.left - r.left, width: b.width || 1 };
    });
    this.render();
  }

  /** Stops driving the screens: clears what render() wrote on them. */
  release(): void {
    this.tl?.kill();
    this.tl = null;
    for (const id in this.state.objs) delete this.state.objs[id];
    this.objs.forEach((o) => {
      for (const p of ["transform", "z-index", "opacity", "--p", "--q", "--c", "--sa", "--sc", "--sd"]) o.el.style.removeProperty(p);
      o.bounce?.style.removeProperty("--q");
    });
  }

  /** Writes the whole lighting state into the page. One pass, every frame. */
  render(): void {
    const { key } = this.state;
    const R = this.root.style;
    R.setProperty("--kx", key.x.toFixed(2));
    R.setProperty("--kw", key.w.toFixed(2));
    R.setProperty("--ki", key.i.toFixed(3));
    R.setProperty("--kpy", key.py.toFixed(2));

    // Type under the key is lit; type it has left falls into shade.
    for (const t of this.lit) {
      const lit = key.i * gauss(Math.abs(t.cx - key.x), key.w);
      t.el.style.setProperty("--lit", lit.toFixed(3));
      t.el.style.setProperty("--lx", ((((key.x / 100) * this.W - t.left) / t.width) * 100).toFixed(1));
    }

    const entries = Array.from(this.objs.entries());
    for (const [id, o] of entries) {
      const s = this.state.objs[id];
      if (!s) continue;
      const px = (s.x / 100) * this.W - o.w / 2;
      const py = (s.y / 100) * this.H - o.h;
      o.el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${s.s.toFixed(4)})`;
      o.el.style.zIndex = String(10 + Math.round(s.s * 100));
      o.el.style.opacity = s.o.toFixed(3);
      const q = s.p * (o.emit?.exposure ?? 0) * s.o;
      o.el.style.setProperty("--p", s.p.toFixed(3));
      o.el.style.setProperty("--q", q.toFixed(3));
      // The key catches the top edge of whatever stands under it.
      o.el.style.setProperty("--c", (key.i * gauss(Math.abs(s.x - key.x), key.w) * s.o).toFixed(3));

      // Dark glass reflects the strongest lit screen near it.
      let best = 0, col = "", dir = "to right";
      for (const [oid, other] of entries) {
        if (oid === id || !other.emit) continue;
        const os = this.state.objs[oid];
        if (!os) continue;
        const strength = os.p * other.emit.exposure * os.o * Math.max(0, 1 - Math.abs(os.x - s.x) / 45);
        if (strength > best) { best = strength; col = other.emit.all; dir = os.x < s.x ? "to right" : "to left"; }
      }
      o.el.style.setProperty("--sa", (best * (1 - s.p * 0.8)).toFixed(3));
      if (col) o.el.style.setProperty("--sc", col);
      o.el.style.setProperty("--sd", dir);

      if (o.bounce) {
        o.bounce.style.setProperty("--x", s.x.toFixed(2));
        o.bounce.style.setProperty("--y", s.y.toFixed(2));
        o.bounce.style.setProperty("--q", q.toFixed(3));
        o.bounce.style.setProperty("--s", (s.s * this.bounceScale).toFixed(3));
      }
    }
  }

  /**
   * Moves the room to a new state, always with the same choreography, in
   * either direction:
   *   1. screens losing focus power down;
   *   2. the key rises and carries attention across the room;
   *   3. objects travel;
   *   4. arriving screens power on, and the key yields to them.
   */
  go(target: RoomState, { instant = false, speed = 1 } = {}): gsap.core.Timeline | null {
    this.tl?.kill();
    if (instant) {
      Object.assign(this.state.key, target.key);
      for (const id in target.objs) this.state.objs[id] = { ...this.state.objs[id], ...target.objs[id] };
      this.render();
      return null;
    }
    const k = 1 / speed;
    const tl = gsap.timeline({ onUpdate: () => this.render() });
    const ids = Object.keys(target.objs);
    for (const id of ids) if (!this.state.objs[id]) this.state.objs[id] = { ...target.objs[id], o: 0, p: 0 };
    const rising = ids.filter((id) => target.objs[id].p > (this.state.objs[id]?.p ?? 0) + 0.05);
    const falling = ids.filter((id) => target.objs[id].p < (this.state.objs[id]?.p ?? 0) - 0.05);
    const moving = ids.filter((id) => {
      const a = this.state.objs[id], b = target.objs[id];
      return !a || Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.s - b.s) * 100 + Math.abs(a.o - b.o) * 100 > 0.5;
    });
    const travels = Math.abs(this.state.key.x - target.key.x) > 1 || moving.length > 0;

    // 1. Power down first, so the room is ALVSolutions' again before anything moves.
    falling.forEach((id) => tl.to(this.state.objs[id], { p: target.objs[id].p, duration: 0.45 * k, ease: "power2.out" }, 0));

    // 2. The key rises to carry attention, and travels.
    const tMove = travels ? 0.2 * k : 0;
    if (travels) {
      tl.to(this.state.key, { i: Math.max(target.key.i, 1), w: Math.max(target.key.w, 34), duration: 0.5 * k, ease: "power2.out" }, 0);
      tl.to(this.state.key, { x: target.key.x, py: target.key.py, duration: 1.0 * k, ease: "power3.inOut" }, tMove);
    }

    // 3. Objects travel: out of the dark into the key, or back into the dark.
    moving.forEach((id) => {
      const { x, y, s, o } = target.objs[id];
      tl.to(this.state.objs[id], { x, y, s, duration: 1.1 * k, ease: "power3.inOut" }, tMove + 0.05 * k);
      tl.to(this.state.objs[id], { o, duration: 0.6 * k, ease: "power1.inOut" }, o > (this.state.objs[id].o ?? 0) ? tMove : tMove + 0.5 * k);
    });

    // 4. Arrival: screens power on and the key yields to them.
    const tOn = travels ? tMove + 1.0 * k : 0;
    rising.forEach((id) => tl.to(this.state.objs[id], { p: target.objs[id].p, duration: 0.95 * k, ease: "power2.inOut" }, tOn));
    tl.to(this.state.key, { i: target.key.i, w: target.key.w, duration: 0.95 * k, ease: "power2.inOut" }, tOn);

    this.tl = tl;
    return tl;
  }
}
