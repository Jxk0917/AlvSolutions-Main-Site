/**
 * The homepage opening, as locked in Phase 3 (phase3-home.ts, playOpening):
 *
 *   1. darkness, then ALVSolutions' light comes up;
 *   2. the name opens inside it - the brand introduction: the ALV symbol
 *      stands alone, then ALVSolutions unfolds out of it (identity/motions.ts);
 *   3. it goes to its place in the navigation, and the key moves to the words;
 *   4. the promise rises into that light;
 *   5. the work is there too, waiting in the dark.
 *
 * Once per browser session (sessionStorage). Anyone who wants to move on -
 * scroll, touch, a key, a click - gets the finished room at once.
 *
 * The start state (hero words and nav mark hidden, the room dark) is set
 * before first paint by the head script, only when this will run; a
 * failsafe there shows everything if this never takes over.
 */
import { gsap } from "gsap";
import { playIntro, finishIntro } from "../identity/motions";
import type { Reel } from "./reel";

export const SEEN_KEY = "alv-home-opened";

export class Opening {
  private tl: gsap.core.Timeline | null = null;
  private flight = { f: 0, copy: 0 };
  private geo = { x0: 0, y0: 0, x1: 0, y1: 0, s1: 1 };
  private readonly skipper = (): void => this.skip();

  constructor(
    private readonly reel: Reel,
    private readonly fly: HTMLElement,
    private readonly stage: HTMLElement,
    private readonly nav: HTMLElement,
    private readonly navMark: HTMLElement
  ) {}

  get running(): boolean {
    return this.tl !== null;
  }

  private measure(): void {
    const prev = this.fly.style.transform;
    this.fly.style.transform = "none";
    const room = this.reel.roomEl.getBoundingClientRect();
    const f = this.fly.getBoundingClientRect();
    const n = this.navMark.getBoundingClientRect();
    this.fly.style.transform = prev;
    const frame = this.reel.frame();
    this.geo = {
      x0: (room.width - f.width) / 2,
      y0: frame.y0 + frame.sh * 0.42 - f.height / 2,
      x1: n.left - room.left,
      y1: n.top - room.top,
      s1: n.width / (f.width || 1),
    };
  }

  private render(): void {
    const { f } = this.flight;
    const g = this.geo;
    const s = 1 + (g.s1 - 1) * f;
    this.fly.style.transform = `translate3d(${(g.x0 + (g.x1 - g.x0) * f).toFixed(1)}px, ${(g.y0 + (g.y1 - g.y0) * f).toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
    const home = f > 0.995;
    this.fly.classList.toggle("is-home", home);
    this.navMark.classList.toggle("is-home", home);
    this.nav.style.setProperty("--nav", Math.max(0, (f - 0.5) / 0.5).toFixed(3));
    this.reel.writeCopy(this.flight.copy);
  }

  play(): void {
    const room = this.reel.room;
    const { start, target } = this.reel.openingStates();
    this.reel.chapter = 0;
    this.reel.onBeforeChapter = this.skipper;
    room.go(start, { instant: true });
    this.flight = { f: 0, copy: 0 };
    this.measure();
    this.render();

    const tl = gsap.timeline({ onUpdate: () => room.render(), onComplete: () => this.finish() });
    // 1. Darkness, then ALVSolutions' light comes up.
    tl.to(room.state.key, { i: 1, duration: 1.4, ease: "power2.inOut" }, 0.1);
    // 2. The name opens inside it: the approved Phase 1 introduction.
    tl.call(() => playIntro(this.stage), [], 0.8);
    // 3. It goes to its place in the navigation, and the key moves to the words.
    tl.to(this.flight, { f: 1, duration: 1.15, ease: "power3.inOut", onUpdate: () => this.render() }, 2.6);
    tl.to(room.state.key, { x: target.key.x, w: target.key.w, py: target.key.py, duration: 1.25, ease: "power3.inOut" }, 2.7);
    // 4. The promise rises into that light.
    tl.to(this.flight, { copy: 1, duration: 1.0, ease: "power3.out", onUpdate: () => this.render() }, 3.05);
    // 5. The work is there too, waiting in the dark.
    ["hacD", "lucD"].forEach((id, i) => {
      if (target.objs[id] && room.state.objs[id]) tl.to(room.state.objs[id], { ...target.objs[id], duration: 1.4, ease: "power3.out" }, 3.3 + i * 0.15);
    });
    this.tl = tl;

    addEventListener("wheel", this.skipper, { passive: true });
    addEventListener("touchstart", this.skipper, { passive: true });
    addEventListener("keydown", this.skipper);
    addEventListener("pointerdown", this.skipper);
  }

  /** Anyone who wants to move on gets the finished room at once. */
  skip(): void {
    if (!this.tl) return;
    this.tl.kill();
    finishIntro(this.stage);
    this.flight = { f: 1, copy: this.reel.chapter <= 0 ? 1 : 0 };
    this.render();
    const n = Math.max(0, this.reel.chapter);
    this.reel.room.go(this.reel.layout === "held" ? this.reel.stateFor(n) : this.reel.openingStates().target, { instant: true });
    this.finish();
  }

  private finish(): void {
    this.tl = null;
    this.reel.onBeforeChapter = null;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode: the opening may simply play again next visit */
    }
    removeEventListener("wheel", this.skipper);
    removeEventListener("touchstart", this.skipper);
    removeEventListener("keydown", this.skipper);
    removeEventListener("pointerdown", this.skipper);
    Opening.settle(this.nav, this.navMark, this.fly);
  }

  /** The settled page: no opening start state left anywhere. */
  static settle(nav: HTMLElement, navMark: HTMLElement, fly: HTMLElement): void {
    document.documentElement.classList.remove("alv-opening");
    nav.style.removeProperty("--nav");
    navMark.classList.remove("is-home");
    fly.classList.remove("is-home");
    fly.style.removeProperty("transform");
  }
}
