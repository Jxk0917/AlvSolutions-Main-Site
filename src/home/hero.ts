/**
 * The hero stage (home/hero-work.njk): Hacienda Grill carried across
 * everything ALVSolutions makes, in four scenes beside the hero's words.
 *
 *   Websites  the four demo screens flow in on a trail of light and power on.
 *   Social    the Hacienda phone steps forward and its screen turns into the
 *             Instagram profile; the Facebook page rises behind it, the
 *             story phone glides in beside it, the post turns over in front.
 *   Brand     the profile's logo lifts off the screen and grows into the
 *             brand board.
 *   Print     the logo becomes the business card, which turns over, and the
 *             flyer and menu blow in beside it.
 *
 * Each move runs quiet -> build -> hit -> settle, then the scene holds
 * still and "Built by ALVSolutions" signs it. Going forward one scene at a
 * time, each grows out of the last through one shared object (the phone,
 * the logo); any other jump clears the stage and builds the new scene.
 *
 * Sharpness: every piece is laid out at the size it rests at, and a settled
 * scene hands its pieces back to the stylesheet (no transform left on
 * them), so nothing is ever shown as an enlarged or 3D-composited copy of
 * itself once it stands still.
 *
 * The tabs choose a scene. Autoplay is secondary: it waits under the
 * pointer, under keyboard focus, in a hidden tab and off screen, and stops
 * for good once someone chooses a scene or opens a piece. After one pass it
 * comes back to Websites and rests. Nothing here holds or moves the page.
 *
 * Every piece is a button: settled, it leans toward the pointer, and a
 * press opens it in full view, grown out of the piece and back into it on
 * close. With motion off every change is immediate and nothing plays by
 * itself; the scenes and the full view still work.
 */
import { gsap } from "gsap";
import { Room, type RoomState } from "../light/room";
import { motionOn } from "../motion/env";
import { playSign, signNow } from "../identity/motions";
import type { OpeningHost } from "./opening";

type SceneId = "web" | "social" | "brand" | "print";

const ORDER: SceneId[] = ["web", "social", "brand", "print"];
const NAMES: Record<SceneId, string> = { web: "Websites", social: "Social presence", brand: "Brand identity", print: "Business graphics" };
/** How long autoplay holds each settled scene, in seconds. */
const HOLD: Record<SceneId, number> = { web: 7.5, social: 6.5, brand: 6, print: 6.5 };

/** The avatar on the Instagram profile screen, as fractions of the screen's width. */
const AVATAR = { x: 0.151, y: 0.364, d: 0.22 };

/** The key light on the words (as the static page sets it), wide and narrow. */
const KEY_WIDE = { x: 27, w: 46, i: 1, py: 86 };
const KEY_NARROW = { x: 40, w: 96, i: 1, py: 46 };
const keyNow = (): RoomState["key"] => ({ ...(innerWidth < 761 ? KEY_NARROW : KEY_WIDE) });

export class Hero implements OpeningHost {
  readonly roomEl: HTMLElement;
  readonly room: Room;
  readonly copy: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly canvas: HTMLElement;
  private readonly tabsEl: HTMLElement;
  private readonly tabs: HTMLButtonElement[];
  private readonly ind: HTMLElement;
  private readonly live: HTMLElement | null;
  private readonly sign: HTMLElement | null;
  private readonly items = new Map<string, HTMLElement>();
  private readonly bar: HTMLElement;

  private cur: SceneId = "web";
  private settled: SceneId | null = null;
  private busy = false;
  private started = false;
  private tl: gsap.core.Timeline | null = null;

  private auto: boolean;
  private holdTw: gsap.core.Tween | null = null;
  private readonly holds = new Set<string>();

  private readonly focus: Focus;

  constructor(root: HTMLElement) {
    this.roomEl = root.querySelector<HTMLElement>(".hx-room")!;
    this.copy = root.querySelector<HTMLElement>("[data-copy]")!;
    this.stage = root.querySelector<HTMLElement>("[data-stage]")!;
    this.canvas = root.querySelector<HTMLElement>("[data-canvas]")!;
    this.bar = root.querySelector<HTMLElement>("[data-bar]")!;
    this.live = root.querySelector<HTMLElement>("[data-live]");
    this.sign = root.querySelector<HTMLElement>("[data-sig] .alv-sign");
    this.tabsEl = root.querySelector<HTMLElement>("[data-tabs]")!;
    this.ind = root.querySelector<HTMLElement>("[data-ind]")!;
    this.tabs = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-go]"));
    root.querySelectorAll<HTMLElement>("[data-k]").forEach((el) => this.items.set(el.dataset.k!, el));
    this.room = new Room(this.roomEl, { key: keyNow(), objs: {} });
    this.auto = motionOn();
    this.focus = new Focus(this);

    root.classList.add("hx-ready");
    // Until the stage begins, every piece waits unseen (the opening may play first).
    gsap.set([...this.allItems(), this.bar], { autoAlpha: 0 });
    this.sign?.classList.remove("is-signed");
    this.stage.classList.toggle("is-auto", this.auto);
    this.tabsEl.classList.add("is-new");
    this.placeInd();
    document.fonts?.ready.then(() => this.placeInd());

    this.bindTabs();
    this.bindPause();
    this.bindTilt();
    this.items.forEach((el) => {
      if (el instanceof HTMLButtonElement) el.addEventListener("click", () => this.open(el));
    });
  }

  /* ------------------------------------------------- the opening's host */

  writeCopy(v: number): void {
    this.copy.style.setProperty("--copy", v.toFixed(3));
  }

  frame(): { y0: number; sh: number } {
    return { y0: 0, sh: Math.min(this.roomEl.offsetHeight, innerHeight) };
  }

  openingStates(): { start: RoomState; target: RoomState } {
    return { start: { key: { x: 50, w: 60, i: 0, py: 72 }, objs: {} }, target: { key: keyNow(), objs: {} } };
  }

  /* ------------------------------------------------------- lifecycle */

  /** The stage begins: Websites, flowing in. Safe to call more than once. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.show("web", true);
  }

  /** The viewport changed: compositions are measured, so stand the scene again. */
  refresh(): void {
    this.room.go({ key: keyNow(), objs: {} }, { instant: true });
    this.room.measure();
    this.placeInd();
    if (!this.started) return;
    this.focus.close(true);
    this.show(this.cur, false, true);
  }

  /** Motion was switched on or off. */
  setMotion(on: boolean): void {
    if (!on) this.stopAuto();
    if (this.started) this.show(this.cur, false, true);
  }

  /* --------------------------------------------------- choosing a scene */

  private bindTabs(): void {
    this.tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => {
        this.stopAuto();
        const to = tab.dataset.go as SceneId;
        if (to !== this.cur || this.busy) this.go(to);
        if (this.live) this.live.textContent = NAMES[to];
      });
      // Arrow keys move along the tabs, as in any set of choices.
      tab.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        this.tabs[(i + d + this.tabs.length) % this.tabs.length].focus();
      });
    });
  }

  /** The lit indicator slides under the chosen tab. */
  private placeInd(): void {
    const tab = this.tabs.find((t) => t.dataset.go === this.cur);
    if (!tab) return;
    this.ind.style.width = `${tab.offsetWidth}px`;
    this.ind.style.transform = `translateX(${tab.offsetLeft}px)`;
  }

  private go(to: SceneId): void {
    if (!this.started) {
      this.started = true;
      this.cur = to;
      this.show(to, true);
      return;
    }
    const from = this.cur;
    // A scene grows out of the last only when that one is standing still.
    const bridge = !this.busy && this.settled === from ? `${from}>${to}` : "";
    this.begin(to);
    const tl = this.timeline();
    if (bridge === "web>social") this.webToSocial(tl);
    else if (bridge === "social>brand") this.socialToBrand(tl);
    else if (bridge === "brand>print") this.brandToPrint(tl);
    else this.enter(tl, to, this.clear(tl));
    this.run(tl);
  }

  /** Stands a scene up without a bridge: fresh (first), or at once (instant). */
  private show(to: SceneId, first: boolean, instant = false): void {
    this.begin(to);
    const tl = this.timeline();
    this.enter(tl, to, first ? 0 : this.clear(tl));
    this.run(tl, instant);
  }

  private begin(to: SceneId): void {
    this.tl?.kill();
    this.holdTw?.kill();
    this.cur = to;
    this.busy = true;
    this.settled = null;
    this.canvas.classList.remove("is-settled");
    this.canvas.dataset.scene = to;
    this.tabs.forEach((t) => {
      if (t.dataset.go === to) t.setAttribute("aria-current", "true");
      else t.removeAttribute("aria-current");
    });
    this.ind.style.setProperty("--t", "0");
    this.placeInd();
    if (this.sign) {
      gsap.killTweensOf(this.sign.querySelector(".alv-sign-line"));
      this.sign.classList.remove("is-signed");
    }
  }

  private timeline(): gsap.core.Timeline {
    return gsap.timeline({ onComplete: () => this.settle() });
  }

  private run(tl: gsap.core.Timeline, instant = false): void {
    this.tl = tl;
    if (instant || !motionOn()) tl.progress(1);
  }

  private settle(): void {
    this.busy = false;
    this.settled = this.cur;
    this.rest();
    this.canvas.classList.add("is-settled");
    if (this.sign) (motionOn() ? playSign : signNow)(this.sign);
    this.startHold();
  }

  /**
   * Hands every piece standing in the scene back to the stylesheet. A piece
   * at its resting place needs no transform; leaving one there (or a 3D one)
   * keeps the browser drawing it as a scaled layer, which is what blurs it.
   */
  private rest(): void {
    for (const el of this.allItems()) {
      if (getComputedStyle(el).visibility === "hidden") continue;
      const g = (p: string): number => Number(gsap.getProperty(el, p)) || 0;
      const still =
        Math.abs(g("x")) < 0.5 && Math.abs(g("y")) < 0.5 && Math.abs(g("xPercent")) < 0.1 && Math.abs(g("yPercent")) < 0.1 &&
        Math.abs((Number(gsap.getProperty(el, "scale")) || 1) - 1) < 0.002 &&
        Math.abs(g("rotationX")) < 0.1 && Math.abs(g("rotationY")) < 0.1 &&
        Math.abs(g("rotation") - this.tilt(el)) < 0.1;
      if (!still) continue;
      gsap.set(el, { clearProps: "transform" });
      for (const p of ["rotate", "translate", "scale"]) el.style.removeProperty(p);
    }
  }

  /* -------------------------------------------------------- autoplay */

  private startHold(): void {
    this.holdTw?.kill();
    if (!this.auto) return;
    const p = { t: 0 };
    this.holdTw = gsap.to(p, {
      t: 1,
      duration: HOLD[this.cur],
      ease: "none",
      onUpdate: () => this.ind.style.setProperty("--t", p.t.toFixed(3)),
      onComplete: () => this.advance(),
    });
    if (this.holds.size) this.holdTw.pause();
  }

  private advance(): void {
    if (this.cur === "print") {
      // One pass, then back to the flagship, and rest there.
      this.stopAuto();
      this.go("web");
      return;
    }
    this.go(ORDER[ORDER.indexOf(this.cur) + 1]);
  }

  private stopAuto(): void {
    this.auto = false;
    this.holdTw?.kill();
    this.holdTw = null;
    this.stage.classList.remove("is-auto");
    this.tabsEl.classList.remove("is-new");
  }

  /** Something asks autoplay to wait (hover, focus, a hidden tab, off screen, an open piece). */
  hold(reason: string, on: boolean): void {
    if (on) this.holds.add(reason);
    else this.holds.delete(reason);
    if (!this.holdTw) return;
    if (this.holds.size) this.holdTw.pause();
    else this.holdTw.resume();
  }

  private bindPause(): void {
    this.canvas.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") this.hold("pointer", true); });
    this.canvas.addEventListener("pointerleave", () => this.hold("pointer", false));
    this.stage.addEventListener("focusin", () => this.hold("focus", true));
    this.stage.addEventListener("focusout", (e) => {
      if (!this.stage.contains(e.relatedTarget as Node | null)) this.hold("focus", false);
    });
    document.addEventListener("visibilitychange", () => this.hold("hidden", document.hidden));
    new IntersectionObserver((entries) => this.hold("away", !entries.some((e) => e.isIntersecting)), { threshold: 0.25 }).observe(this.canvas);
  }

  /* ----------------------------------------------------------- tilt */

  /** A settled piece leans a little toward the pointer. */
  private bindTilt(): void {
    let lifted: HTMLElement | null = null;
    const reset = (): void => {
      lifted?.style.removeProperty("--rx");
      lifted?.style.removeProperty("--ry");
      lifted = null;
    };
    this.canvas.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || !this.canvas.classList.contains("is-settled") || !motionOn()) return reset();
      const lift = (e.target as Element).closest(".hx-o")?.querySelector<HTMLElement>(":scope > .hx-lift") ?? null;
      if (lift !== lifted) reset();
      if (!lift) return;
      lifted = lift;
      const r = lift.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      lift.style.setProperty("--ry", `${(px * 7).toFixed(2)}deg`);
      lift.style.setProperty("--rx", `${(-py * 5).toFixed(2)}deg`);
    });
    this.canvas.addEventListener("pointerleave", reset);
  }

  /* ------------------------------------------------------- geometry */

  private el(k: string): HTMLElement {
    return this.items.get(k)!;
  }

  private allItems(): HTMLElement[] {
    return [...this.items.values()];
  }

  /** A piece's resting tilt (--r on its markup). GSAP owns rotation, so every move ends on it. */
  private tilt(el: HTMLElement): number {
    return Number(el.style.getPropertyValue("--r")) || 0;
  }

  private centre(el: HTMLElement): { x: number; y: number } {
    return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
  }

  /** The offset (px) that draws a piece's centre toward a canvas point, by k. */
  private toward(el: HTMLElement, pt: { x: number; y: number }, k = 1): { x: number; y: number } {
    const c = this.centre(el);
    return { x: (pt.x - c.x) * k, y: (pt.y - c.y) * k };
  }

  /** The transform that lays piece `el` exactly over piece `over` (both unmoved), from its top-left. */
  private over(el: HTMLElement, over: HTMLElement): gsap.TweenVars {
    return {
      x: over.offsetLeft - el.offsetLeft,
      y: over.offsetTop - el.offsetTop,
      scale: over.offsetWidth / (el.offsetWidth || 1),
      xPercent: 0, yPercent: 0, rotation: 0,
      transformOrigin: "0% 0%",
    };
  }

  /* --------------------------------------------------- shared moves */

  /** Everything still showing leaves. Returns when the next scene may begin. */
  private clear(tl: gsap.core.Timeline): number {
    const showing = this.allItems().filter((el) => getComputedStyle(el).visibility !== "hidden" && Number(gsap.getProperty(el, "opacity")) > 0.01);
    this.barOut(tl, 0);
    if (!showing.length) return 0;
    tl.to(showing, { autoAlpha: 0, y: "-=10", duration: 0.38, ease: "power2.in", stagger: 0.02 }, 0);
    return 0.42;
  }

  private barOut(tl: gsap.core.Timeline, t: number): void {
    tl.to(this.bar, { autoAlpha: 0, duration: 0.3 }, t);
  }

  /** The lit floor bar draws in under a settled scene. */
  private barIn(tl: gsap.core.Timeline, t: number): void {
    tl.fromTo(this.bar, { autoAlpha: 1, scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.inOut" }, t);
  }

  /** A short rim of light around a piece as it lands. */
  private hit(tl: gsap.core.Timeline, el: HTMLElement, t: number): void {
    tl.fromTo(el, { "--hit": 0 }, { "--hit": 1, duration: 0.18, ease: "power2.out" }, t);
    tl.to(el, { "--hit": 0, duration: 0.9, ease: "power2.inOut" }, t + 0.18);
  }

  /** A screen glides in from the right on a trail of light, then powers on. */
  private glide(tl: gsap.core.Timeline, el: HTMLElement, t: number): void {
    const trail = el.querySelector<HTMLElement>(".hx-trail");
    tl.fromTo(el,
      { autoAlpha: 0, x: 0, y: 0, xPercent: 55, yPercent: 6, rotation: 0, rotationY: -24, scale: 0.86, transformPerspective: 1400, transformOrigin: "50% 50%", "--p": 0 },
      { autoAlpha: 1, xPercent: 0, yPercent: 0, rotationY: 0, scale: 1, duration: 1.2, ease: "expo.out" },
      t);
    if (trail) {
      tl.fromTo(trail, { autoAlpha: 0, scaleX: 0.3 }, { autoAlpha: 1, scaleX: 1, duration: 0.3, ease: "power2.out" }, t);
      tl.to(trail, { autoAlpha: 0, scaleX: 0.15, duration: 0.8, ease: "power2.inOut" }, t + 0.3);
    }
    tl.to(el, { "--p": 1, duration: 0.85, ease: "power2.inOut" }, t + 0.7);
  }

  private enter(tl: gsap.core.Timeline, to: SceneId, t: number): void {
    if (to === "web") this.enterWeb(tl, t);
    else if (to === "social") this.enterSocial(tl, t);
    else if (to === "brand") this.enterBrand(tl, t);
    else this.enterPrint(tl, t);
  }

  /* -------------------------------------------------------- Websites */

  private enterWeb(tl: gsap.core.Timeline, t: number): void {
    ["hacD", "hacP", "lucD", "lucP"].forEach((k, i) => this.glide(tl, this.el(k), t + i * 0.14));
    this.barIn(tl, t + 1.0);
    tl.fromTo(this.el("webCap"), { autoAlpha: 0, x: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" }, t + 1.35);
    tl.set({}, {}, t + 2.2);
  }

  /* ---------------------------------------------------------- Social */

  /**
   * The rest of the social scene arrives around the profile phone: the
   * Facebook page rises out of the dark behind it, the story phone glides
   * in beside it, and the post turns over into the light in front of it.
   */
  private gather(tl: gsap.core.Timeline, t: number): void {
    const win = this.el("sWin"), story = this.el("sStory"), post = this.el("sPost");
    tl.fromTo(win,
      { autoAlpha: 0, x: 0, y: 0, xPercent: 0, yPercent: 14, rotation: 0, rotationX: 22, scale: 0.9, transformPerspective: 1600, transformOrigin: "50% 100%", "--p": 0 },
      { autoAlpha: 1, yPercent: 0, rotationX: 0, scale: 1, duration: 1.05, ease: "expo.out" },
      t);
    tl.to(win, { "--p": 1, duration: 0.8, ease: "power2.inOut" }, t + 0.45);
    this.glide(tl, story, t + 0.2);
    tl.fromTo(post,
      { autoAlpha: 0, ...this.toward(post, this.centre(this.el("sPhone")), 0.55), rotation: this.tilt(post) + 14, rotationY: -100, scale: 0.8, transformPerspective: 1200, transformOrigin: "50% 50%" },
      { autoAlpha: 1, x: 0, y: 0, rotation: this.tilt(post), rotationY: 0, scale: 1, duration: 0.95, ease: "back.out(1.4)" },
      t + 0.4);
    this.hit(tl, post, t + 0.95);
  }

  /** The profile's screen turns over under a line of light. */
  private swap(tl: gsap.core.Timeline, t: number, d = 0.6): void {
    const phone = this.el("sPhone");
    const ig = phone.querySelector<HTMLElement>(".hx-ig");
    const scan = phone.querySelector<HTMLElement>(".hx-scan");
    if (!ig || !scan) return;
    tl.set(ig, { autoAlpha: 1, clipPath: "inset(0% 0% 100% 0%)" }, t);
    tl.fromTo(scan, { autoAlpha: 1, yPercent: 0 }, { yPercent: 100, duration: d, ease: "power2.inOut" }, t);
    tl.to(ig, { clipPath: "inset(0% 0% 0% 0%)", duration: d, ease: "power2.inOut" }, t);
    tl.to(scan, { autoAlpha: 0, duration: 0.2 }, t + d);
  }

  private enterSocial(tl: gsap.core.Timeline, t: number): void {
    const phone = this.el("sPhone");
    const ig = phone.querySelector<HTMLElement>(".hx-ig");
    if (ig) tl.set(ig, { autoAlpha: 1, clipPath: "inset(0% 0% 0% 0%)" }, t);
    // A push out of the depth, a touch past its mark, then it settles.
    tl.fromTo(phone,
      { autoAlpha: 0, x: 0, y: 40, xPercent: 0, yPercent: 0, rotation: 0, scale: 0.82, transformOrigin: "50% 100%", "--p": 1 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.95, ease: "back.out(1.6)" },
      t);
    this.hit(tl, phone, t + 0.55);
    this.gather(tl, t + 0.35);
    this.barIn(tl, t + 1.2);
    tl.set({}, {}, t + 2.2);
  }

  private webToSocial(tl: gsap.core.Timeline): void {
    const from = this.el("hacP"), phone = this.el("sPhone");
    const ig = phone.querySelector<HTMLElement>(".hx-ig");
    this.barOut(tl, 0);
    tl.to(this.el("webCap"), { autoAlpha: 0, y: 8, duration: 0.35, ease: "power2.in" }, 0);
    // The rest of the room powers down and falls back into the dark.
    ["hacD", "lucD", "lucP"].forEach((k, i) => {
      const el = this.el(k);
      tl.to(el, { "--p": 0, duration: 0.35, ease: "power2.out" }, i * 0.04);
      tl.to(el, { autoAlpha: 0, scale: 0.9, xPercent: k === "hacD" ? -8 : 8, duration: 0.6, ease: "power2.in" }, 0.1 + i * 0.05);
    });
    // The Hacienda phone becomes the profile phone: it stands where the
    // website's phone stood, then steps forward into the light, a touch
    // past its place...
    if (ig) tl.set(ig, { autoAlpha: 0, clipPath: "inset(0% 0% 100% 0%)" }, 0);
    tl.set(phone, { autoAlpha: 1, "--p": 1, ...this.over(phone, from) }, 0.05);
    tl.set(from, { autoAlpha: 0 }, 0.05);
    tl.to(phone, { x: 0, y: 0, scale: 1.06, duration: 1.05, ease: "power3.inOut" }, 0.1);
    this.hit(tl, phone, 0.95);
    // ...its screen turns into the Instagram profile...
    this.swap(tl, 1.05);
    // ...and it eases back as the rest of the platform gathers round it.
    tl.to(phone, { scale: 1, duration: 0.7, ease: "power2.inOut" }, 1.6);
    this.gather(tl, 1.75);
    this.barIn(tl, 2.6);
    tl.set({}, {}, 3.3);
  }

  /* ----------------------------------------------------------- Brand */

  /** The board's modules slide into their places, the band draws, the board lights. */
  private assemble(tl: gsap.core.Timeline, t: number): void {
    const from: Record<string, gsap.TweenVars> = {
      bMono: { yPercent: -45, xPercent: 0 },
      bBanner: { xPercent: 45, yPercent: 0 },
      bType: { yPercent: 35, xPercent: 0 },
    };
    ["bMono", "bBanner", "bType"].forEach((k, i) => {
      tl.fromTo(this.el(k),
        { autoAlpha: 0, x: 0, y: 0, scale: 0.9, rotation: 0, transformOrigin: "50% 50%", ...from[k] },
        { autoAlpha: 1, xPercent: 0, yPercent: 0, scale: 1, duration: 0.75, ease: "back.out(1.7)" },
        t + i * 0.09);
    });
    tl.fromTo(this.el("bBand"), { autoAlpha: 1, x: 0, y: 0, scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.8, ease: "power3.inOut" }, t + 0.35);
    this.hit(tl, this.el("bBoard"), t + 0.45);
  }

  private enterBrand(tl: gsap.core.Timeline, t: number): void {
    const board = this.el("bBoard"), logo = this.el("bLogo");
    tl.set(this.el("bAvatar"), { autoAlpha: 0 }, t);
    tl.fromTo(board, { autoAlpha: 0, x: 0, y: 0, scale: 0.94, transformOrigin: "50% 50%" }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: "power3.out" }, t);
    tl.fromTo(logo, { autoAlpha: 0, x: 0, y: 0, scale: 0.8, rotation: 0, transformOrigin: "50% 50%" }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: "back.out(2)" }, t + 0.15);
    this.hit(tl, logo, t + 0.5);
    this.assemble(tl, t + 0.4);
    this.barIn(tl, t + 0.9);
    tl.set({}, {}, t + 1.8);
  }

  private socialToBrand(tl: gsap.core.Timeline): void {
    const phone = this.el("sPhone"), avatar = this.el("bAvatar");
    const board = this.el("bBoard"), logo = this.el("bLogo");
    const pc = this.centre(phone);
    this.barOut(tl, 0);
    // The rest of the platform folds back behind the phone.
    ["sPost", "sStory", "sWin"].forEach((k, i) => {
      const el = this.el(k);
      tl.to(el, { autoAlpha: 0, ...this.toward(el, pc, 0.6), scale: 0.6, rotation: 0, "--p": 0, duration: 0.5, ease: "power2.in" }, i * 0.05);
    });
    // The profile's logo lifts off the screen, exactly where it was...
    tl.call(() => {
      const C = this.canvas.getBoundingClientRect();
      const g = phone.querySelector<HTMLElement>(".hx-glass")!.getBoundingClientRect();
      const d = AVATAR.d * g.width;
      gsap.set(avatar, {
        autoAlpha: 1, transformOrigin: "0% 0%",
        x: g.left - C.left + AVATAR.x * g.width - d / 2 - avatar.offsetLeft,
        y: g.top - C.top + AVATAR.y * g.width - d / 2 - avatar.offsetTop,
        scale: d / (avatar.offsetWidth || 1),
      });
    }, [], 0.4);
    // ...the phone falls away behind it, and the logo grows into the brand.
    tl.to(phone, { autoAlpha: 0, "--p": 0, duration: 0.55, ease: "power2.inOut" }, 0.5);
    tl.to(avatar, { x: 0, y: 0, scale: 1, duration: 1.1, ease: "power3.inOut" }, 0.5);
    this.hit(tl, avatar, 1.25);
    tl.fromTo(board, { autoAlpha: 0, x: 0, y: 0, scale: 0.94, transformOrigin: "50% 50%" }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: "power3.out" }, 1.15);
    tl.fromTo(logo, { autoAlpha: 0, x: 0, y: 0, scale: 1, rotation: 0, transformOrigin: "50% 50%" }, { autoAlpha: 1, duration: 0.5, ease: "power1.out" }, 1.45);
    tl.to(avatar, { autoAlpha: 0, duration: 0.45, ease: "power1.in" }, 1.6);
    this.assemble(tl, 1.6);
    this.barIn(tl, 2.2);
    tl.set({}, {}, 3);
  }

  /* ----------------------------------------------------------- Print */

  /** The sheets blow in from the left: a gust, a flutter, then they lie still. */
  private blowIn(tl: gsap.core.Timeline, t: number): void {
    ["pMenu", "pFlyer"].forEach((k, i) => {
      const el = this.el(k);
      const at = t + i * 0.22;
      const r = this.tilt(el);
      tl.set(el, { autoAlpha: 0, x: 0, y: 0, xPercent: -125, yPercent: -45, rotation: r - 38, rotationX: 35, rotationY: -25, scale: 1, transformPerspective: 900, transformOrigin: "50% 30%" }, at);
      tl.to(el, {
        keyframes: [
          { autoAlpha: 1, xPercent: -38, yPercent: 12, rotation: r + 13, rotationX: -12, rotationY: 14, duration: 0.55, ease: "sine.out" },
          { xPercent: 6, yPercent: -4, rotation: r - 5, rotationX: 7, rotationY: -5, duration: 0.45, ease: "sine.inOut" },
          { xPercent: 0, yPercent: 0, rotation: r, rotationX: 0, rotationY: 0, duration: 0.55, ease: "power2.out" },
        ],
      }, at);
    });
  }

  /** The card turns over, front to back, with light sliding across it. */
  private flip(tl: gsap.core.Timeline, t: number): void {
    const card = this.el("pCard");
    const inner = card.querySelector<HTMLElement>("[data-flip]");
    const sheen = card.querySelector<HTMLElement>(".hx-flip-sheen");
    if (!inner) return;
    tl.to(inner, { rotationY: 180, duration: 1, ease: "power3.inOut" }, t);
    if (sheen) tl.fromTo(sheen, { autoAlpha: 0, xPercent: -100 }, { autoAlpha: 1, xPercent: 100, duration: 1, ease: "power2.inOut" }, t);
    if (sheen) tl.to(sheen, { autoAlpha: 0, duration: 0.3 }, t + 0.8);
    this.hit(tl, card, t + 0.85);
  }

  /** The front of a second card slides out from under the first. */
  private second(tl: gsap.core.Timeline, t: number): void {
    const front = this.el("pFront"), card = this.el("pCard");
    tl.fromTo(front,
      { autoAlpha: 0, ...this.toward(front, this.centre(card)), rotation: this.tilt(card), scale: 0.96, transformOrigin: "50% 50%" },
      { autoAlpha: 1, x: 0, y: 0, rotation: this.tilt(front), scale: 1, duration: 0.85, ease: "power3.out" },
      t);
  }

  private slab(tl: gsap.core.Timeline, t: number): void {
    tl.fromTo(this.el("pSlab"), { autoAlpha: 0, x: 0, y: 0, scaleX: 0.8, transformOrigin: "50% 50%" }, { autoAlpha: 1, scaleX: 1, duration: 0.9, ease: "power3.out" }, t);
  }

  private enterPrint(tl: gsap.core.Timeline, t: number): void {
    const card = this.el("pCard");
    const inner = card.querySelector<HTMLElement>("[data-flip]");
    if (inner) tl.set(inner, { rotationY: 0 }, t);
    this.slab(tl, t);
    tl.fromTo(card,
      { autoAlpha: 0, x: 0, y: 30, scale: 0.75, rotation: this.tilt(card) + 9, transformOrigin: "50% 50%" },
      { autoAlpha: 1, y: 0, scale: 1, rotation: this.tilt(card), duration: 0.85, ease: "back.out(1.5)" },
      t + 0.1);
    this.blowIn(tl, t + 0.3);
    this.flip(tl, t + 0.95);
    this.second(tl, t + 1.7);
    this.barIn(tl, t + 1.6);
    tl.set({}, {}, t + 2.6);
  }

  private brandToPrint(tl: gsap.core.Timeline): void {
    const logo = this.el("bLogo"), card = this.el("pCard");
    const inner = card.querySelector<HTMLElement>("[data-flip]");
    const lc = this.centre(logo), cc = this.centre(card);
    this.barOut(tl, 0);
    if (inner) tl.set(inner, { rotationY: 0 }, 0);
    tl.to(["bMono", "bBanner", "bType", "bBand"].map((k) => this.el(k)), { autoAlpha: 0, scale: 0.94, duration: 0.4, ease: "power2.in", stagger: 0.04 }, 0);
    tl.to(this.el("bBoard"), { autoAlpha: 0, scale: 0.97, duration: 0.55, ease: "power2.in" }, 0.25);
    // The logo travels into the business card, which takes its place.
    tl.to(logo, { x: cc.x - lc.x, y: cc.y - lc.y, scale: (card.offsetHeight / (logo.offsetHeight || 1)) * 0.9, autoAlpha: 0, duration: 0.85, ease: "power3.inOut" }, 0.2);
    tl.fromTo(card,
      { autoAlpha: 0, x: lc.x - cc.x, y: lc.y - cc.y, scale: 0.5, rotation: 0, transformOrigin: "50% 50%" },
      { autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: this.tilt(card), duration: 1.0, ease: "power3.inOut" },
      0.3);
    this.slab(tl, 0.7);
    this.blowIn(tl, 0.95);
    this.flip(tl, 1.45);
    this.second(tl, 2.2);
    this.barIn(tl, 2.3);
    tl.set({}, {}, 3.1);
  }

  /* ------------------------------------------------------ full view */

  private open(btn: HTMLButtonElement): void {
    // Only a piece that is standing in the settled scene opens.
    if (this.busy || Number(gsap.getProperty(btn, "opacity")) < 0.5) return;
    this.stopAuto();
    this.focus.open(btn);
  }
}

/**
 * A piece, opened: a demo site as its whole page (scrollable in a frame of
 * its own), a graphic whole and in full detail. It grows out of the piece
 * that was pressed and goes back into it on close. A modal dialog: Escape
 * and the backdrop close it, focus stays inside it and goes back to the
 * piece afterwards.
 */
class Focus {
  private readonly el: HTMLElement;
  private readonly frame: HTMLElement;
  private readonly view: HTMLElement;
  private readonly img: HTMLImageElement;
  private readonly bar: HTMLElement;
  private readonly back: HTMLElement;
  private readonly name: HTMLElement;
  private readonly note: HTMLElement;
  private readonly demo: HTMLAnchorElement;
  private readonly closeBtn: HTMLButtonElement;
  private src: HTMLButtonElement | null = null;
  private tl: gsap.core.Timeline | null = null;

  constructor(private readonly hero: Hero) {
    this.el = document.querySelector<HTMLElement>("[data-focus]")!;
    this.frame = this.el.querySelector<HTMLElement>("[data-frame]")!;
    this.view = this.el.querySelector<HTMLElement>("[data-view]")!;
    this.img = this.el.querySelector<HTMLImageElement>("[data-full]")!;
    this.bar = this.el.querySelector<HTMLElement>("[data-focus-bar]")!;
    this.back = this.el.querySelector<HTMLElement>("[data-close-backdrop]")!;
    this.name = this.el.querySelector<HTMLElement>("[data-focus-name]")!;
    this.note = this.el.querySelector<HTMLElement>("[data-focus-note]")!;
    this.demo = this.el.querySelector<HTMLAnchorElement>("[data-focus-demo]")!;
    this.closeBtn = this.el.querySelector<HTMLButtonElement>("[data-close]")!;
    // It belongs to the page, above the site's fixed navigation.
    document.body.appendChild(this.el);

    this.closeBtn.addEventListener("click", () => this.close());
    this.back.addEventListener("click", () => this.close());
    document.addEventListener("keydown", (e) => {
      if (!this.src) return;
      if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      } else if (e.key === "Tab") this.trap(e);
    });
  }

  private trap(e: KeyboardEvent): void {
    const f = [this.view, this.demo, this.closeBtn].filter((x) => !x.hidden);
    const i = f.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
    e.preventDefault();
    f[next].focus();
  }

  /** What on the stage the full view grows out of. */
  private source(btn: HTMLElement): DOMRect {
    const el = btn.querySelector<HTMLElement>(".hx-glass") ?? btn.querySelector<HTMLElement>(".hx-lift") ?? btn;
    return el.getBoundingClientRect();
  }

  /** A graphic's frame: as large as the window allows, never past twice its own pixels or its own cap (px wide). */
  private sizeImage(w: number, h: number, cap = Infinity): void {
    const maxW = Math.min(innerWidth * 0.92, 1180);
    const maxH = innerHeight - (innerWidth < 761 ? 210 : 180);
    const s = Math.min(maxW / w, maxH / h, 2, cap / w);
    this.frame.style.width = `${Math.round(w * s) + 12}px`;
    this.view.style.aspectRatio = `${w} / ${h}`;
    this.bar.style.width = `${Math.max(Math.round(w * s) + 12, Math.min(420, innerWidth * 0.92))}px`;
  }

  open(btn: HTMLButtonElement): void {
    if (this.src) return;
    this.src = btn;
    const d = btn.dataset;
    const kind = d.kind ?? "desk";
    const w = Number(d.fullW) || 1, h = Number(d.fullH) || 1;
    this.el.dataset.kind = kind;
    this.el.dataset.tone = d.tone ?? "";
    this.name.textContent = d.title ?? "";
    this.note.textContent = d.note ?? "";
    this.demo.hidden = !d.demo;
    if (d.demo) this.demo.href = d.demo;
    this.frame.style.removeProperty("width");
    this.view.style.removeProperty("aspect-ratio");
    this.bar.style.removeProperty("width");
    if (kind === "image") this.sizeImage(w, h, Number(d.fullMax) || Infinity);
    this.img.src = d.full ?? "";
    this.img.width = w;
    this.img.height = h;
    this.img.alt = d.fullAlt ?? "";
    this.el.hidden = false;
    this.view.scrollTop = 0;
    this.hero.hold("open", true);

    // Hold the page where it is while the full view is up.
    const gap = innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.add("hx-locked");
    document.body.style.paddingRight = gap ? `${gap}px` : "";

    const from = this.source(btn), to = this.frame.getBoundingClientRect();
    this.tl?.kill();
    const tl = gsap.timeline();
    tl.set(btn, { "--out": 1 });
    tl.fromTo(this.frame, this.fromRect(from, to), { x: 0, y: 0, scaleX: 1, scaleY: 1, autoAlpha: 1, duration: 0.75, ease: "power3.inOut" }, 0);
    tl.fromTo(this.back, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "power1.out" }, 0);
    // Opacity only (not visibility), so focus can move into the bar at once.
    tl.fromTo(this.bar, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.45);
    tl.call(() => this.closeBtn.focus({ preventScroll: true }), [], 0.05);
    this.tl = tl;
    if (!motionOn()) tl.progress(1);
  }

  /**
   * Where the frame starts (or ends) so it sits exactly over the piece. A
   * piece whose shape differs from the frame's (a framed post, a card
   * mid-tilt) grows evenly from its centre instead, so nothing stretches.
   */
  private fromRect(from: DOMRect, to: { left: number; top: number; width: number; height: number }): gsap.TweenVars {
    const sx = from.width / to.width, sy = from.height / to.height;
    if (Math.abs(sx / sy - 1) < 0.06) {
      return { x: from.left - to.left, y: from.top - to.top, scaleX: sx, scaleY: sy, autoAlpha: 1, transformOrigin: "0% 0%" };
    }
    const s = Math.min(sx, sy);
    return {
      x: from.left + from.width / 2 - (to.left + (to.width * s) / 2),
      y: from.top + from.height / 2 - (to.top + (to.height * s) / 2),
      scaleX: s, scaleY: s, autoAlpha: 0, transformOrigin: "0% 0%",
    };
  }

  /** Closes the full view, back into its piece (or at once). */
  close(instant = false): void {
    const btn = this.src;
    if (!btn) return;
    this.src = null;
    const done = (): void => {
      this.el.hidden = true;
      gsap.set([this.frame, this.bar, this.back], { clearProps: "transform,opacity,visibility" });
      gsap.set(btn, { "--out": 0 });
      document.documentElement.classList.remove("hx-locked");
      document.body.style.paddingRight = "";
      this.hero.hold("open", false);
      if (!instant) btn.focus({ preventScroll: true });
    };
    this.tl?.kill();
    if (instant || !motionOn()) {
      done();
      return;
    }
    const at = this.frame.getBoundingClientRect();
    const cur = { x: Number(gsap.getProperty(this.frame, "x")), y: Number(gsap.getProperty(this.frame, "y")) };
    const base = { left: at.left - cur.x, top: at.top - cur.y, width: this.frame.offsetWidth, height: this.frame.offsetHeight };
    const tl = gsap.timeline({ onComplete: done });
    tl.to(this.bar, { opacity: 0, y: 10, duration: 0.25, ease: "power2.in" }, 0);
    tl.to(this.view, { scrollTop: 0, duration: 0.35, ease: "power2.inOut" }, 0);
    tl.to(this.frame, { ...this.fromRect(this.source(btn), base), duration: 0.65, ease: "power3.inOut" }, 0.1);
    tl.to(this.back, { autoAlpha: 0, duration: 0.5, ease: "power1.in" }, 0.25);
    this.tl = tl;
  }
}
