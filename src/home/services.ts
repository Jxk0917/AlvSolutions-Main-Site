/**
 * Services: the stations' lights come up once, as the row reaches the
 * viewport. The row starts dark (.is-dark); on arrival it takes .is-on,
 * whose CSS animations raise the floor, then each station's cone, pool and
 * bar in turn. Without this file, or with motion off, the lights are on.
 */
import { motionOn, onMotionChange } from "../motion/env";

export function initServices(row: HTMLElement): void {
  if (!motionOn() || !("IntersectionObserver" in window)) return;

  const light = (): void => {
    io.disconnect();
    row.classList.remove("is-dark");
    row.classList.add("is-on");
  };
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) light();
  }, { threshold: 0.2 });

  row.classList.add("is-dark");
  io.observe(row);
  onMotionChange((on) => { if (!on) light(); });
}
