/**
 * Two one-off arrivals below the pricing table, each played once as it
 * comes into view and never on a scroll listener:
 *   - Founders Special: the open spot markers power on in turn, the way the
 *     reel's screens do (CSS transitions on opacity, staggered by --i).
 *   - Trust: the builder's signature signs the sheet (the reel's own
 *     playSign motion).
 * Without motion both simply rest in their end state.
 */
import { motionOn } from "../motion/env";
import { playSign, signNow } from "../identity/motions";

function once(el: HTMLElement, threshold: number, fn: () => void): void {
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      fn();
    },
    { threshold }
  );
  io.observe(el);
}

export function initFounders(root: HTMLElement): void {
  const spots = root.querySelector<HTMLElement>("[data-spots]");
  if (!spots || !motionOn()) return;
  spots.classList.add("is-armed");
  once(spots, 0.6, () => spots.classList.add("is-on"));
}

export function initSheet(root: HTMLElement): void {
  const sign = root.querySelector<HTMLElement>("[data-sheet] .alv-sign");
  if (!sign) return;
  if (!motionOn()) {
    signNow(sign);
    return;
  }
  once(sign, 1, () => playSign(sign));
}
