/**
 * A package picker ([data-pick]): the three packages and the four builds.
 * Two lights answer two different things:
 *   - the room's key light (.key-cone/.key-pool) glides to the option under
 *     attention: a hover or focus previews one, leaving returns it to
 *     whichever radio is actually checked;
 *   - the lit frame (.h-pick-frame) stands around the chosen option only,
 *     and glides to the next one when the choice changes. It never follows
 *     a preview, so which option is chosen is never in doubt.
 *
 * Only custom properties are written; light.css and offer.css turn them
 * into transforms and transition those. The native radio group and its
 * :has() resting state stay the no-JS state.
 */
export class Picker {
  private root: HTMLElement;
  private opts: HTMLElement[];
  private chosen: string;
  private shown: string;

  constructor(root: HTMLElement) {
    this.root = root;
    this.opts = Array.from(root.querySelectorAll<HTMLElement>(".h-opt[data-opt]"));
    const checked = root.querySelector<HTMLInputElement>(".h-opt-input:checked");
    this.chosen = checked?.value ?? this.opts[0]?.dataset.opt ?? "";
    this.shown = this.chosen;

    this.opts.forEach((opt) => {
      const input = opt.querySelector<HTMLInputElement>(".h-opt-input");
      if (!input) return;
      opt.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "mouse") this.reveal(opt.dataset.opt!);
      });
      input.addEventListener("focus", () => this.reveal(opt.dataset.opt!));
      input.addEventListener("change", () => this.choose(input.value));
    });
    root.addEventListener("pointerleave", () => this.reveal(this.chosen));
    root.addEventListener("focusout", (e) => {
      if (!root.contains(e.relatedTarget as Node)) this.reveal(this.chosen);
    });

    // A deep link to one option (#build-detailer) selects it.
    addEventListener("hashchange", () => this.fromHash());
    this.fromHash();

    root.classList.add("is-js");
    this.refresh();
    // Placed first, then allowed to glide: nothing slides in on load.
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("is-placed")));
  }

  /** Re-measures (resize) and re-places both lights. */
  refresh(): void {
    this.reveal(this.shown);
    this.frame(this.chosen);
  }

  private fromHash(): void {
    const id = location.hash.slice(1);
    const opt = id ? this.opts.find((o) => o.id === id) : undefined;
    const input = opt?.querySelector<HTMLInputElement>(".h-opt-input");
    if (!opt || !input) return;
    input.checked = true;
    this.choose(input.value);
  }

  private choose(slug: string): void {
    this.chosen = slug;
    this.reveal(slug);
    this.frame(slug);
  }

  private find(slug: string): HTMLElement | undefined {
    return this.opts.find((o) => o.dataset.opt === slug);
  }

  /** The key light: on the option under attention. */
  private reveal(slug: string): void {
    const opt = this.find(slug);
    if (!opt) return;
    this.shown = slug;
    this.opts.forEach((o) => o.classList.toggle("is-lit", o === opt));
    const W = this.root.offsetWidth || 1;
    const H = this.root.offsetHeight || 1;
    const s = this.root.style;
    // An option with its own hue (the builds) tints the key while it is lit.
    if (opt.dataset.hue) s.setProperty("--kh", opt.dataset.hue);
    s.setProperty("--kx", (((opt.offsetLeft + opt.offsetWidth / 2) / W) * 100).toFixed(2));
    s.setProperty("--kw", Math.max(24, (opt.offsetWidth / W) * 170).toFixed(2));
    s.setProperty("--kpy", (((opt.offsetTop + opt.offsetHeight) / H) * 100).toFixed(2));
    // The underglow: a short bar on the floor line, centred under the option.
    const cs = getComputedStyle(opt);
    const bw = Math.min(56, opt.offsetWidth);
    const floor = opt.offsetTop + opt.offsetHeight + (parseFloat(cs.marginBottom) || 0);
    s.setProperty("--kbx", `${opt.offsetLeft + (opt.offsetWidth - bw) / 2}px`);
    s.setProperty("--kby", `${floor}px`);
    s.setProperty("--kbw", `${bw}px`);
  }

  /** The lit frame: around the chosen option, tinted by its hue. */
  private frame(slug: string): void {
    const opt = this.find(slug);
    if (!opt) return;
    const s = this.root.style;
    if (opt.dataset.hue) s.setProperty("--bh", opt.dataset.hue);
    s.setProperty("--bx", `${opt.offsetLeft}px`);
    s.setProperty("--by", `${opt.offsetTop}px`);
    s.setProperty("--bw", `${opt.offsetWidth}px`);
    s.setProperty("--bht", `${opt.offsetHeight}px`);
  }
}
