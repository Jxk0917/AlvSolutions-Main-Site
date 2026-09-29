/**
 * How a project runs: one project, one line. Each clause lights as the
 * visitor scrolls past it, the rail fills behind it, and reaching "We go
 * live." switches the room's key on over the line.
 *
 * Nothing is pinned and nothing waits: progress is read from three 1px
 * marks spread down the section ([data-mark]) crossing a line two thirds
 * down the viewport, via IntersectionObserver (no scroll listener). The
 * states it sets only move opacity and transform.
 *
 * Without motion (or without JS) the section rests fully lit: the arming
 * classes are the only thing that ever dims it.
 */
import { motionOn } from "../motion/env";

const LINE = 0.68;

export class Process {
  private root: HTMLElement;
  private line: HTMLElement;
  private stations: HTMLElement[];
  private marks: HTMLElement[];
  private lit: boolean[];
  private io: IntersectionObserver | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.line = root.querySelector<HTMLElement>(".h-line")!;
    this.stations = Array.from(root.querySelectorAll<HTMLElement>("[data-stn]"));
    this.marks = Array.from(root.querySelectorAll<HTMLElement>("[data-mark]"));
    this.lit = this.stations.map(() => false);
    this.setMotion(motionOn());
  }

  setMotion(on: boolean): void {
    this.io?.disconnect();
    this.io = null;
    this.root.classList.toggle("is-armed", on);
    this.line.classList.toggle("is-armed", on);
    if (!on) return;
    // A mark counts as reached once its top is above the line, whether it is
    // still inside the observed band or already scrolled off the top.
    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = this.marks.indexOf(e.target as HTMLElement);
          if (i >= 0) this.lit[i] = e.boundingClientRect.top < innerHeight * LINE;
        }
        this.render();
      },
      { rootMargin: `0px 0px -${Math.round((1 - LINE) * 100)}% 0px` }
    );
    this.marks.forEach((m) => this.io!.observe(m));
  }

  private render(): void {
    const last = this.stations.length - 1;
    this.stations.forEach((s, i) => {
      s.classList.toggle("is-lit", this.lit[i]);
      s.classList.toggle("is-past", i < last && this.lit[i + 1]);
    });
    this.root.classList.toggle("is-live", this.lit[last]);
  }
}
