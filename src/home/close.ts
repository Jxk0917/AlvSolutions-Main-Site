/**
 * Close: the room returns to ALVSolutions. Reusing the same Room engine
 * that lights the hero and the work — .h-close is itself a .room, with no
 * screens of its own, so this only ever moves its key. At rest (or with
 * motion off) the light is already up, matching home.css's resting state;
 * with motion, it starts down and rises once the ending is in view.
 *
 * Ported from the locked exploration's closing light (phase3-home.ts).
 */
import { gsap } from "gsap";
import { Room } from "../light/room";
import { motionOn } from "../motion/env";

/**
 * Matches .h-close's resting --kx/--kw/--kpy in home.css: over the words,
 * as the hero's key is, or spread across the column on a phone.
 */
const rest = (): { x: number; w: number; py: number } =>
  innerWidth < 761 ? { x: 50, w: 120, py: 97 } : { x: 30, w: 56, py: 97 };

export function initClose(root: HTMLElement): void {
  if (!motionOn()) return;
  const room = new Room(root, { key: { ...rest(), i: 0 }, objs: {} });
  const io = new IntersectionObserver(
    (entries, obs) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      gsap.to(room.state.key, { i: 1, duration: 1.8, ease: "power2.inOut", onUpdate: () => room.render() });
    }),
    { threshold: 0.35 }
  );
  io.observe(root);
}
