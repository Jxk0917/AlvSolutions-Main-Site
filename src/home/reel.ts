/**
 * The work reel: one room, held while you scroll, handed from ALVSolutions'
 * words to each piece of work in turn (the locked Phase 3 choreography).
 *
 * The four chapter <article>s in the page ARE the content; this only moves
 * light and screens around them. Nothing is created here, and nothing is
 * removed from the accessibility tree: an inactive chapter is faded, and
 * focusing anything in it (or following a link to it) brings the room to it.
 *
 * Two layouts:
 *   held  the sticky room with its scroll track (PORTRAIT / WIDE geometry);
 *   flat  the static stacked chapters. With motion, their screens power on
 *         and sign as they arrive; without it, they simply rest.
 */
import { gsap } from "gsap";
import { Room, type RoomState } from "../light/room";
import { emissionFor } from "../light/emission";
import { playSign, signNow } from "../identity/motions";
import { motionOn } from "../motion/env";
import { WIDE_STATES, toRoom, bounceScale, stackedStates, preOpen, capFrame, type Geo, type Layout } from "./reel-geometry";

/** The hero's resting key, as home.css sets it for the static page. */
const HERO_KEY = { x: 27, w: 46, i: 1, py: 86 };
/** On a phone the words span the column: the locked narrow key, wide enough to light all of it. */
const NARROW_KEY = { x: 40, w: 96, i: 1, py: 86 };
const flatKey = (): typeof HERO_KEY => ({ ...(innerWidth < 761 ? NARROW_KEY : HERO_KEY) });
/** A flat screen before it arrives: waiting in the dark, as in the room. */
const WAITING = 0.32;

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document): T => root.querySelector<T>(sel)!;
const $$ = <T extends HTMLElement>(sel: string, root: ParentNode = document): T[] => Array.from(root.querySelectorAll<T>(sel));

export class Reel {
  readonly work: HTMLElement;
  readonly roomEl: HTMLElement;
  readonly room: Room;
  readonly copy: HTMLElement;
  readonly panels: HTMLElement[];
  layout: Layout = "flat";
  geo: Geo = "narrow";
  chapter = -1;
  copyLevel = 1;
  /** Called before the room changes chapter (the opening uses it to finish). */
  onBeforeChapter: (() => void) | null = null;

  private steps: HTMLAnchorElement[];
  private track: HTMLElement[];
  private live: HTMLElement;
  private observers: IntersectionObserver[] = [];
  private copyTween: gsap.core.Tween | null = null;
  private flatPower = new Map<HTMLElement, { p: number; tween: gsap.core.Tween | null }>();

  constructor(work: HTMLElement) {
    this.work = work;
    this.roomEl = $(".h-room", work);
    this.copy = $(".h-copy", work);
    this.panels = $$("[data-panel]", work);
    this.steps = $$<HTMLAnchorElement>(".h-steps [data-go]", work);
    this.track = $$(".h-track [data-step]", work);
    this.live = $("[data-work-live]", work);
    this.room = new Room(this.roomEl, { key: flatKey(), objs: {} });
    this.bindNavigation();
  }

  /* ------------------------------------------------------------ states */

  // stackedStates() walks offsetTop/offsetHeight across every panel — a
  // forced layout read. The geometry it produces only changes with the
  // viewport, not with which chapter is current, so it is cached here and
  // only recomputed by setLayout()/measure() (resize). Without this, every
  // scroll-driven chapter change in portrait re-forced a full layout read
  // mid-scroll, which is what made scrolling feel like it caught on mini
  // barriers.
  private cachedStates: RoomState[] | null = null;

  private states(): RoomState[] {
    if (this.cachedStates) return this.cachedStates;
    if (this.geo === "portrait") {
      this.cachedStates = stackedStates({
        room: this.roomEl,
        copy: this.copy,
        panels: this.panels.slice(0, 3).map((p) => $(".h-panel-copy", p)),
        pair: $(".h-panel-copy", this.panels[3]),
        dev: (id) => this.room.element(id),
      });
    } else {
      const W = this.roomEl.offsetWidth, H = this.roomEl.offsetHeight;
      this.cachedStates = WIDE_STATES.map((s) => toRoom(s, W, H));
    }
    return this.cachedStates;
  }

  stateFor(n: number): RoomState {
    return this.states()[Math.max(0, Math.min(4, n))];
  }

  /** Where the opening starts and where it lands, for the current layout. */
  openingStates(): { start: RoomState; target: RoomState } {
    if (this.layout !== "held") {
      return { start: { key: { x: 50, w: 60, i: 0, py: 72 }, objs: {} }, target: { key: flatKey(), objs: {} } };
    }
    const target = this.stateFor(0);
    if (this.geo === "portrait") return { start: preOpen(target), target };
    const W = this.roomEl.offsetWidth, H = this.roomEl.offsetHeight;
    return { start: toRoom(preOpen(WIDE_STATES[0]), W, H), target };
  }

  /** The frame the composition stands in, in room pixels. */
  frame(): { y0: number; sh: number } {
    const H = this.roomEl.offsetHeight;
    if (this.layout === "held" && this.geo === "wide") return capFrame(this.roomEl.offsetWidth, H);
    return { y0: 0, sh: Math.min(H, innerHeight) };
  }

  /* ------------------------------------------------------------ layout */

  setLayout(layout: Layout, geo: Geo): void {
    const html = document.documentElement;
    this.geo = geo;
    this.cachedStates = null;
    if (layout === "held") {
      const entering = this.layout !== "held";
      html.classList.add("alv-reel");
      html.dataset.geo = geo;
      this.layout = "held";
      if (entering) this.clearFlat();
      this.room.bounceScale = geo === "wide" ? bounceScale(this.roomEl.offsetWidth) : 1;
      this.room.measure();
      const n = Math.max(0, this.chapter);
      this.room.go(this.stateFor(n), { instant: true });
      this.chapter = -1;
      this.goChapter(n, true);
      this.observeHeld();
    } else {
      if (this.layout === "held") this.clearHeld();
      html.classList.remove("alv-reel");
      html.dataset.geo = geo;
      this.layout = "flat";
      this.room.bounceScale = 1;
      this.room.measure();
      this.room.go({ key: flatKey(), objs: {} }, { instant: true });
      this.observeFlat();
    }
  }

  private clearHeld(): void {
    this.disconnect();
    this.room.release();
    this.copyTween?.kill();
    this.copy.style.removeProperty("--copy");
    this.copyLevel = 1;
    this.copy.classList.remove("is-away");
    this.panels.forEach((p) => p.classList.remove("is-on"));
    this.roomEl.classList.remove("is-working");
    this.live.textContent = "";
  }

  private clearFlat(): void {
    this.disconnect();
    this.flatPower.forEach((v, el) => {
      v.tween?.kill();
      el.style.removeProperty("--p");
      el.style.removeProperty("--q");
    });
    this.flatPower.clear();
  }

  private disconnect(): void {
    this.observers.forEach((o) => o.disconnect());
    this.observers = [];
  }

  /* ---------------------------------------------------------- chapters */

  writeCopy(v: number): void {
    this.copyLevel = v;
    this.copy.style.setProperty("--copy", v.toFixed(3));
  }

  private setCopy(v: number, duration: number, delay: number): void {
    this.copyTween?.kill();
    if (!duration) {
      this.writeCopy(v);
      return;
    }
    const s = { v: this.copyLevel };
    this.copyTween = gsap.to(s, { v, duration, delay, ease: "power3.inOut", onUpdate: () => this.writeCopy(s.v) });
  }

  /** The held room moves to chapter n: 0 is ALVSolutions' words, 1-4 the work. */
  goChapter(n: number, instant = !motionOn()): void {
    if (n === this.chapter) return;
    this.onBeforeChapter?.();
    this.chapter = n;
    this.room.go(this.stateFor(n), { instant });

    // The hero's words hand the column over to the work, and take it back.
    this.setCopy(n === 0 ? 1 : 0, instant ? 0 : n === 0 ? 0.9 : 0.45, instant ? 0 : n === 0 ? 0.5 : 0);
    this.copy.classList.toggle("is-away", n !== 0);

    this.panels.forEach((p) => {
      const on = Number(p.dataset.panel) === n;
      const was = p.classList.contains("is-on");
      p.classList.toggle("is-on", on);
      if (on && !was) this.sign(p, instant ? 0 : 1.7);
    });
    this.roomEl.classList.toggle("is-working", n >= 1);
    this.setCurrent(n);
    this.live.textContent = n >= 1 ? ($(".h-panel-h", this.panels[n - 1])?.textContent ?? "") : "";
  }

  private setCurrent(n: number): void {
    this.steps.forEach((a) => {
      if (Number(a.dataset.go) === n) a.setAttribute("aria-current", "step");
      else a.removeAttribute("aria-current");
    });
  }

  private sign(panel: HTMLElement, delay: number): void {
    const el = panel.querySelector<HTMLElement>(".alv-sign");
    if (!el) return;
    if (!motionOn() || !delay) {
      if (!motionOn()) signNow(el);
      else playSign(el);
      return;
    }
    el.classList.remove("is-signed");
    gsap.delayedCall(delay, () => playSign(el));
  }

  /** Every signature signed at once (motion switched off). */
  signAll(): void {
    this.panels.forEach((p) => {
      const el = p.querySelector<HTMLElement>(".alv-sign");
      if (el) signNow(el);
    });
  }

  /* --------------------------------------------------------- observers */

  private observeHeld(): void {
    this.disconnect();
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && this.goChapter(Number((e.target as HTMLElement).dataset.step))),
      { rootMargin: "-50% 0px -50% 0px" }
    );
    this.track.forEach((s) => io.observe(s));
    this.observers.push(io);
  }

  private observeFlat(): void {
    this.disconnect();
    // Which chapter is being read: the one cue kept without motion too.
    const reading = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) this.setCurrent(Number((e.target as HTMLElement).dataset.panel)); }),
      { rootMargin: "-40% 0px -50% 0px" }
    );
    this.panels.forEach((p) => reading.observe(p));
    this.observers.push(reading);
    if (!motionOn()) return;

    // A screen powers on as it arrives; a chapter signs as it is reached.
    const arrive = new IntersectionObserver(
      (entries, io) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target as HTMLElement;
        if (el.matches("[data-obj]")) this.powerOn(el);
        else this.sign(el, 0.3);
      }),
      { threshold: 0.35 }
    );
    this.room.ids.forEach((id) => {
      const el = this.room.element(id)!;
      this.flatPower.set(el, { p: WAITING, tween: null });
      this.writeFlat(el);
      arrive.observe(el);
    });
    this.panels.forEach((p) => { if (p.querySelector(".alv-sign:not(.is-signed)")) arrive.observe(p); });
    this.observers.push(arrive);
  }

  private writeFlat(el: HTMLElement): void {
    const v = this.flatPower.get(el);
    if (!v) return;
    const id = el.dataset.obj!;
    el.style.setProperty("--p", v.p.toFixed(3));
    el.style.setProperty("--q", (v.p * (this.room.emission(id)?.exposure ?? 0)).toFixed(3));
  }

  private powerOn(el: HTMLElement): void {
    const v = this.flatPower.get(el);
    if (!v) return;
    v.tween = gsap.to(v, { p: 1, duration: 0.95, ease: "power2.inOut", onUpdate: () => this.writeFlat(el) });
  }

  /* ------------------------------------------------------------- light */

  /** Gives every screen its own light. Resolves when all are sampled. */
  async lightScreens(): Promise<void> {
    await Promise.all(
      this.room.ids.map(async (id) => {
        const el = this.room.element(id)!;
        const e = await emissionFor(el);
        if (!e) return;
        this.room.setEmission(id, e);
        this.writeFlat(el);
      })
    );
  }

  /** A returning visitor at the top: the room is arranged; only the light comes up. */
  raiseLight(): void {
    const s = this.stateFor(0);
    this.room.go({ ...s, key: { ...s.key, i: 0 } }, { instant: true });
    gsap.to(this.room.state.key, { i: s.key.i, duration: 0.9, ease: "power2.inOut", onUpdate: () => this.room.render() });
  }

  /* -------------------------------------------------------- navigation */

  /** Which held step a link target belongs to, or null if it is not the reel's. */
  stepFor(hash: string): number | null {
    if (!hash || hash === "#") return null;
    if (hash === "#top") return 0;
    if (hash === "#work") return 1;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    const panel = el?.closest<HTMLElement>("[data-panel]");
    return panel && this.work.contains(panel) ? Number(panel.dataset.panel) : null;
  }

  scrollToStep(n: number, smooth = motionOn()): void {
    const span = this.track[n];
    if (!span) return;
    const top = span.getBoundingClientRect().top + scrollY;
    window.scrollTo({ top, behavior: smooth ? "smooth" : "instant" });
  }

  /** Opens a reel link from the address bar (e.g. /#work from another page). */
  followHash(): void {
    if (this.layout !== "held") return;
    const n = this.stepFor(location.hash);
    if (n !== null) this.scrollToStep(n, false);
  }

  private bindNavigation(): void {
    // Inside a held room every chapter shares one sticky box, so a native
    // jump would land on the room's top. Links to the reel go to its step.
    document.addEventListener("click", (e) => {
      if (this.layout !== "held" || e.defaultPrevented) return;
      const a = (e.target as Element | null)?.closest?.("a[href*='#']") as HTMLAnchorElement | null;
      if (!a || a.origin !== location.origin || a.pathname !== location.pathname) return;
      const n = this.stepFor(a.hash);
      if (n === null) return;
      e.preventDefault();
      this.scrollToStep(n);
      history.pushState(null, "", a.hash);
    });
    addEventListener("hashchange", () => this.followHash());

    // Keyboard and assistive technology: focus inside a chapter brings the
    // room to that chapter, so what has focus is always what is shown.
    this.work.addEventListener("focusin", (e) => {
      if (this.layout !== "held") return;
      const t = e.target as HTMLElement;
      const panel = t.closest<HTMLElement>("[data-panel]");
      const n = panel ? Number(panel.dataset.panel) : t.closest(".h-copy") ? 0 : null;
      if (n !== null && n !== this.chapter) this.scrollToStep(n);
    });
  }
}
