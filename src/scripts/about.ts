/**
 * /about/ enhancement. The page is complete without this file: the points
 * are plain rows and the process rests fully lit.
 *
 * With script:
 *   - the rail of points (interior/point-rail.ts): its lit bar and key
 *     light glide to the point under the pointer, and walk down the points
 *     once the first time the rail is reached;
 *   - "How a project runs" lights each clause as it is scrolled past.
 * Only classes and custom properties are written.
 */
import { pointRail } from "../interior/point-rail";
import { Process } from "../home/process";
import { onMotionChange } from "../motion/env";

const rail = document.querySelector<HTMLElement>("[data-ab-rail]");
if (rail) {
  const spot = pointRail(rail);
  // Offsets are measured: place the light again once the real fonts have set
  // the layout, and whenever the width changes.
  const refresh = (): void => spot.home();
  document.fonts?.ready.then(refresh);
  let frame = 0;
  addEventListener("resize", () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(refresh);
  });
}

/* ---- how a project runs ---- */
const procRoot = document.getElementById("process");
if (procRoot) {
  const proc = new Process(procRoot);
  onMotionChange((on) => proc.setMotion(on));
}
