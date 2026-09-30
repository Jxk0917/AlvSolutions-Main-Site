/**
 * A rail of points (.ab-rail, about.css): its lit bar and key light glide to
 * the point under the pointer, and return to the first when it leaves. The
 * first time the rail is reached, the light walks down its points once, so
 * they are introduced in order. Any pointer or focus on the rail ends the
 * walk. Shared by /about/ and /builds/.
 *
 * Returns the rail's Spot, so the page can re-place it on resize.
 */
import { Spot } from "./spot";
import { motionOn, onMotionChange } from "../motion/env";

export function pointRail(rail: HTMLElement): Spot {
  const rows = Array.from(rail.querySelectorAll<HTMLElement>(".ab-row"));
  const bar = rail.querySelector<HTMLElement>(".ab-bar")!;

  // The bar and the row's own brightness follow the light.
  const follow = (el: HTMLElement | null): void => {
    rows.forEach((r) => r.classList.toggle("is-on", r === el));
    if (!el) return;
    bar.style.setProperty("--by", `${el.offsetTop}px`);
    bar.style.setProperty("--bh", `${el.offsetHeight}px`);
  };
  const spot = new Spot(rail, ".ab-row", () => rows[0] ?? null, follow, ".sv-spot");

  let timers: number[] = [];
  const stop = (): void => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const walk = (): void => {
    stop();
    rows.forEach((row, i) => timers.push(window.setTimeout(() => spot.to(row), i * 900)));
    timers.push(window.setTimeout(() => spot.home(), rows.length * 900));
  };
  if (motionOn() && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        if (motionOn()) walk();
      },
      { rootMargin: "0px 0px -30% 0px" }
    );
    io.observe(rail);
    rail.addEventListener("pointerenter", stop);
    rail.addEventListener("focusin", stop);
  }
  onMotionChange((on) => {
    if (!on) {
      stop();
      spot.home();
    }
  });
  return spot;
}
