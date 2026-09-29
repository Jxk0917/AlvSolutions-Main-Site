/**
 * Prices: the room's own key light (.key-cone/.key-pool inside [data-cmp])
 * falls on the package under attention. A hover or focus previews one;
 * leaving returns the light to whichever radio is actually checked.
 *
 * Only --kx/--kw/--kpy are written; light.css turns them into a transform,
 * and home.css transitions that transform, so the light travels on the
 * compositor. The native radio group and its :has() cone remain the
 * resting, no-JS (and reduced-motion) state.
 */
export class Prices {
  private cmp: HTMLElement;
  private head: HTMLElement;
  private cols: HTMLElement[];
  private chosen: string;
  private shown: string;

  constructor(root: HTMLElement) {
    this.cmp = root.querySelector<HTMLElement>("[data-cmp]")!;
    this.head = root.querySelector<HTMLElement>("[data-cmp-head]")!;
    this.cols = Array.from(this.cmp.querySelectorAll<HTMLElement>(".h-cmp-col[data-col]"));
    const checked = root.querySelector<HTMLInputElement>(".h-tier-input:checked");
    this.chosen = checked?.value ?? this.cols[0]?.dataset.col ?? "";
    this.shown = this.chosen;

    this.cols.forEach((col) => {
      const input = col.querySelector<HTMLInputElement>(".h-tier-input");
      if (!input) return;
      col.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "mouse") this.reveal(col.dataset.col!);
      });
      input.addEventListener("focus", () => this.reveal(col.dataset.col!));
      input.addEventListener("change", () => {
        this.chosen = input.value;
        this.reveal(input.value);
      });
    });
    this.cmp.addEventListener("pointerleave", () => this.reveal(this.chosen));
    this.cmp.addEventListener("focusout", (e) => {
      if (!this.cmp.contains(e.relatedTarget as Node)) this.reveal(this.chosen);
    });

    this.refresh();
  }

  /** Re-measures (resize) and re-lights whatever is currently shown. */
  refresh(): void {
    this.reveal(this.shown);
  }

  private reveal(slug: string): void {
    const col = this.cols.find((c) => c.dataset.col === slug);
    if (!col) return;
    this.shown = slug;
    this.cols.forEach((c) => c.classList.toggle("is-lit", c === col));
    const W = this.cmp.offsetWidth || 1;
    const H = this.cmp.offsetHeight || 1;
    const s = this.cmp.style;
    s.setProperty("--kx", (((col.offsetLeft + col.offsetWidth / 2) / W) * 100).toFixed(2));
    s.setProperty("--kw", Math.max(24, (col.offsetWidth / W) * 170).toFixed(2));
    s.setProperty("--kpy", (((this.head.offsetTop + this.head.offsetHeight) / H) * 100).toFixed(2));
  }
}
