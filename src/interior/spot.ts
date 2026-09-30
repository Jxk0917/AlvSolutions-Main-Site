/**
 * A spotlight that glides to the item under attention inside one container,
 * the way the homepage picker's key light does. Shared by /packages/ and
 * /services/.
 *
 * Only custom properties are written (--sx --sy --sw --sh, and --shue from
 * an item's own --hue); the page's CSS turns them into transforms and
 * transitions those. The container gains .is-js once placed, .is-placed a
 * frame later (so nothing slides in on load), and .is-lit while lit.
 */
export class Spot {
  private box: HTMLElement;
  private spot: HTMLElement;
  private rest: () => HTMLElement | null;
  private onMove?: (el: HTMLElement | null) => void;

  constructor(
    box: HTMLElement,
    itemSel: string,
    rest: () => HTMLElement | null,
    onMove?: (el: HTMLElement | null) => void,
    lightSel = ".pk-spot"
  ) {
    this.box = box;
    this.onMove = onMove;
    this.spot = box.querySelector<HTMLElement>(lightSel)!;
    this.rest = rest;
    box.querySelectorAll<HTMLElement>(itemSel).forEach((el) => {
      el.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "mouse") this.to(el);
      });
      el.addEventListener("focusin", () => this.to(el));
    });
    box.addEventListener("pointerleave", () => this.home());
    box.addEventListener("focusout", (e) => {
      if (!box.contains(e.relatedTarget as Node)) this.home();
    });
    this.home();
    box.classList.add("is-js");
    // Placed first, then allowed to glide: nothing slides in on load.
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add("is-placed")));
  }

  /** Back to the resting item, or off when there is none. */
  home(): void {
    const el = this.rest();
    if (el) this.to(el);
    else this.box.classList.remove("is-lit");
  }

  to(el: HTMLElement): void {
    // The first time the light comes on, it lands; it does not travel in.
    if (!this.box.classList.contains("is-lit")) {
      this.box.classList.add("is-snap");
      requestAnimationFrame(() => requestAnimationFrame(() => this.box.classList.remove("is-snap")));
    }
    this.onMove?.(el);
    const s = this.spot.style;
    s.setProperty("--sx", `${el.offsetLeft}px`);
    s.setProperty("--sy", `${el.offsetTop}px`);
    s.setProperty("--sw", `${el.offsetWidth}px`);
    s.setProperty("--sh", `${el.offsetHeight}px`);
    const hue = el.style.getPropertyValue("--hue");
    if (hue) s.setProperty("--shue", hue);
    this.box.classList.add("is-lit");
  }
}
