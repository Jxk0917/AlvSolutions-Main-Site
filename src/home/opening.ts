/**
 * The homepage opening, as locked in Phase 3 (phase3-home.ts, playOpening):
 *
 *   1. darkness, then ALVSolutions' light comes up;
 *   2. the name opens inside it - the brand introduction: the ALV symbol
 *      stands alone, then ALVSolutions unfolds out of it (identity/motions.ts);
 *   3. it goes to its place in the navigation, and the key moves to the words;
 *   4. the promise rises into that light;
 *   5. as the words settle, the stage begins (the host's onReveal).
 *
 * Once per browser session (sessionStorage). Anyone who wants to move on -
 * a scroll, a touch that scrolls, a scrolling key - gets the finished room
 * at once; it never waits for the opening. (A plain press on a link is not
 * moving on: it is a click, and must reach the link.)
 *
 * The start state (hero words and nav mark hidden, the room dark) is set
 * before first paint by the head script, only when this will run; a
 * failsafe there shows everything if this never takes over.
 */
import { gsap } from "gsap";
import { playIntro, finishIntro } from "../identity/motions";
import type { Room, RoomState } from "../light/room";

/** What the opening plays in: the hero's room, its words and its light. */
export interface OpeningHost {
  readonly roomEl: HTMLElement;
  readonly room: Room;
  readonly copy: HTMLElement;
  writeCopy(v: number): void;
  /** The frame the composition stands in, in room pixels. */
  frame(): { y0: number; sh: number };
  /** Where the key starts (dark) and where it lands (on the words). */
  openingStates(): { start: RoomState; target: RoomState };
}

export const SEEN_KEY = "alv-home-opened";
const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Spacebar"]);

export class Opening {
  private tl: gsap.core.Timeline | null = null;
  /** Called once the opening has finished or been skipped. */
  onFinish: (() => void) | null = null;
  /** Called as the words settle, so the stage can begin under them. */
  onReveal: (() => void) | null = null;
  private flight = { f: 0, copy: 0 };
  private geo = { x0: 0, y0: 0, x1: 0, y1: 0, s1: 1 };
  private readonly skipper = (): void => this.skip();
  private startY = 0;
  // Only keys that move the page. A press on a link or button is not a
  // request to skip: the opening used to end on pointerdown, which
  // rearranged the hero between press and release and dropped the click.
  private readonly onKey = (e: KeyboardEvent): void => {
    if (SCROLL_KEYS.has(e.key)) this.skip();
  };
  private readonly onScroll = (): void => {
    if (Math.abs(scrollY - this.startY) >= 3) this.skip();
  };

  constructor(
    private readonly host: OpeningHost,
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
    const room = this.host.roomEl.getBoundingClientRect();
    const f = this.fly.getBoundingClientRect();
    const n = this.navMark.getBoundingClientRect();
    this.fly.style.transform = prev;
    const frame = this.host.frame();
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
    this.host.writeCopy(this.flight.copy);
    // Words still rising are a moving target: a press on a link that then
    // slides out from under the pointer is a click that never lands. They
    // take clicks from the moment they arrive, not before.
    this.host.copy.style.pointerEvents = this.flight.copy < 0.98 ? "none" : "";
  }

  play(): void {
    const room = this.host.room;
    const { start } = this.host.openingStates();
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
    const { target } = this.host.openingStates();
    tl.to(room.state.key, { x: target.key.x, w: target.key.w, py: target.key.py, duration: 1.25, ease: "power3.inOut" }, 2.7);
    // 4. The promise rises into that light.
    tl.to(this.flight, { copy: 1, duration: 1.0, ease: "power3.out", onUpdate: () => this.render() }, 3.05);
    // 5. As the words settle, the stage begins.
    tl.call(() => this.reveal(), [], 3.3);
    this.tl = tl;

    // The opening yields to the visitor the moment they ask to move on:
    // a wheel tick, a touch that scrolls, a scrolling key, or the page
    // actually moving (scrollbar drag, a link that scrolls). All passive:
    // nothing here can hold up the scroll it is reacting to.
    this.startY = scrollY;
    addEventListener("wheel", this.skipper, { passive: true });
    addEventListener("touchmove", this.skipper, { passive: true });
    addEventListener("keydown", this.onKey);
    addEventListener("scroll", this.onScroll, { passive: true });
  }

  /** Anyone who wants to move on gets the finished room at once. */
  skip(): void {
    if (!this.tl) return;
    this.tl.kill();
    finishIntro(this.stage);
    this.flight = { f: 1, copy: 1 };
    this.render();
    this.host.room.go(this.host.openingStates().target, { instant: true });
    this.finish();
  }

  private reveal(): void {
    const r = this.onReveal;
    this.onReveal = null;
    r?.();
  }

  private finish(): void {
    this.tl = null;
    this.reveal();
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode: the opening may simply play again next visit */
    }
    removeEventListener("wheel", this.skipper);
    removeEventListener("touchmove", this.skipper);
    removeEventListener("keydown", this.onKey);
    removeEventListener("scroll", this.onScroll);
    Opening.settle(this.nav, this.navMark, this.fly);
    const done = this.onFinish;
    this.onFinish = null;
    done?.();
  }

  /** The settled page: no opening start state left anywhere. */
  static settle(nav: HTMLElement, navMark: HTMLElement, fly: HTMLElement): void {
    document.documentElement.classList.remove("alv-opening");
    document.querySelector<HTMLElement>(".h-copy")?.style.removeProperty("pointer-events");
    nav.style.removeProperty("--nav");
    navMark.classList.remove("is-home");
    fly.classList.remove("is-home");
    fly.style.removeProperty("transform");
  }
}
