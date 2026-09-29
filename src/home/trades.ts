/**
 * The trade picker: four condensed business builds behind an accessible
 * ARIA tabs pattern once JavaScript enhances the page. Statically every
 * business stands stacked and readable (home/build.njk); this only shows
 * one at a time and lets the room's key light mark it, the same language
 * the hero and the work reel use — no cards, no client colour.
 *
 * Deep linking is preserved: #build-<slug> both opens the right tab on
 * load and is written back (via replaceState) whenever a tab is chosen.
 */
import { gsap } from "gsap";
import { motionOn } from "../motion/env";
import { sampleEmission } from "../light/emission";

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document): T => root.querySelector<T>(sel)!;
const $$ = <T extends HTMLElement>(sel: string, root: ParentNode = document): T[] => Array.from(root.querySelectorAll<T>(sel));

export class Trades {
  private stage: HTMLElement;
  private tabs: HTMLAnchorElement[];
  private panels: Map<string, HTMLElement>;
  private tween: gsap.core.Tween | null = null;
  active: string;

  constructor(root: HTMLElement) {
    this.stage = $("[data-build-stage]", root);
    this.tabs = $$<HTMLAnchorElement>("[data-trade]", root);
    this.panels = new Map($$<HTMLElement>("[data-fit]", root).map((p) => [p.dataset.fit!, p]));

    const list = $(".h-trades", root);
    list.setAttribute("role", "tablist");
    this.tabs.forEach((a, i) => {
      const slug = a.dataset.trade!;
      a.id = `trade-tab-${slug}`;
      a.setAttribute("role", "tab");
      a.setAttribute("aria-selected", "false");
      a.setAttribute("aria-controls", `build-${slug}`);
      a.tabIndex = -1;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        this.select(slug, { focus: false, push: true });
      });
      a.addEventListener("keydown", (e) => this.onKey(e, i));
    });
    this.panels.forEach((p, slug) => {
      p.setAttribute("role", "tabpanel");
      p.setAttribute("aria-labelledby", `trade-tab-${slug}`);
      p.tabIndex = 0;
      // A trade with a disclosed demo gets that demo's own light on its
      // floor, sampled from the screenshot like the reel's screens. Colour
      // is not motion, so this runs with motion off too.
      const src = p.dataset.demo;
      if (src) {
        sampleEmission(src, 10 / 16)
          .then((e) => {
            p.style.setProperty("--e", e.all);
            p.style.setProperty("--eq", e.exposure.toFixed(3));
          })
          .catch(() => {});
      }
    });

    addEventListener("hashchange", () => {
      const s = this.fromHash();
      if (s) this.select(s, { focus: false, push: false });
    });

    this.active = this.fromHash() ?? this.tabs[0]?.dataset.trade ?? "";
    this.select(this.active, { instant: true, push: false });
  }

  private fromHash(): string | null {
    const m = /^#build-(.+)$/.exec(location.hash);
    return m && this.panels.has(m[1]) ? m[1] : null;
  }

  private onKey(e: KeyboardEvent, i: number): void {
    const n = this.tabs.length;
    let j = -1;
    if (e.key === "ArrowRight") j = (i + 1) % n;
    else if (e.key === "ArrowLeft") j = (i - 1 + n) % n;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = n - 1;
    else return;
    e.preventDefault();
    this.select(this.tabs[j].dataset.trade!, { focus: true, push: true });
  }

  select(slug: string, { instant = !motionOn(), focus = false, push = false } = {}): void {
    const panel = this.panels.get(slug);
    if (!panel) return;
    this.active = slug;

    this.tabs.forEach((a) => {
      const on = a.dataset.trade === slug;
      a.setAttribute("aria-selected", String(on));
      a.tabIndex = on ? 0 : -1;
      if (on && focus) a.focus();
    });
    this.panels.forEach((p, s) => { p.hidden = s !== slug; });

    const tab = this.tabs.find((a) => a.dataset.trade === slug)!;
    const stageBox = this.stage.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    const kx = stageBox.width ? ((tabBox.left + tabBox.width / 2 - stageBox.left) / stageBox.width) * 100 : 50;
    const kw = stageBox.width ? Math.max(30, (tabBox.width / stageBox.width) * 100 * 1.5) : 30;

    this.tween?.kill();
    if (instant) {
      this.stage.style.setProperty("--kx", kx.toFixed(2));
      this.stage.style.setProperty("--kw", kw.toFixed(2));
      this.stage.style.setProperty("--ki", "0.85");
    } else {
      this.tween = gsap.to(this.stage, { "--kx": kx, "--kw": kw, "--ki": 0.85, duration: 0.7, ease: "power2.inOut", overwrite: true });
    }
    if (push) history.replaceState(null, "", `#build-${slug}`);
  }
}
