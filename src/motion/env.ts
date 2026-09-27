/**
 * Motion environment: one shared source of truth for whether motion runs,
 * driven by the OS prefers-reduced-motion setting and an optional in-page
 * override. Everything else asks motionOn() or subscribes via
 * onMotionChange rather than reading matchMedia/localStorage directly.
 *
 * Ported from the locked exploration's src/motion/env.ts. The pointer/rAF
 * scheduling helpers that also lived there are homepage-choreography
 * machinery and are left for the pass that builds the homepage.
 */

const STORE_KEY = "alv-motion";

const osQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const listeners = new Set<(on: boolean) => void>();

/** null = follow the OS; true/false = the person has chosen. */
function readChoice(): boolean | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw === "on") return true;
    if (raw === "off") return false;
  } catch {
    /* private mode, blocked storage: fall through to the OS preference */
  }
  return null;
}

let choice = readChoice();

export function motionOn(): boolean {
  return choice ?? !osQuery.matches;
}

export function setMotion(on: boolean): void {
  choice = on;
  try {
    localStorage.setItem(STORE_KEY, on ? "on" : "off");
  } catch {
    /* the session still works, the preference just will not persist */
  }
  document.documentElement.classList.toggle("no-motion", !on);
  listeners.forEach((fn) => fn(on));
}

export function onMotionChange(fn: (on: boolean) => void): void {
  listeners.add(fn);
}

osQuery.addEventListener("change", () => {
  if (choice === null) {
    document.documentElement.classList.toggle("no-motion", !motionOn());
    listeners.forEach((fn) => fn(motionOn()));
  }
});

document.documentElement.classList.toggle("no-motion", !motionOn());
