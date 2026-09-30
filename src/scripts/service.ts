/**
 * Service page enhancement (/services/<slug>/). The page is complete
 * without this file: the level chart is a native radio group whose lit
 * column, package row and card follow :checked through CSS :has(), every
 * card is its own link, and each <details> opens on its own.
 *
 * With script:
 *   - the level chart's lit column also follows the pointer across the
 *     columns, and returns to the chosen level when it leaves;
 *   - the business card turns over to its back, and tilts a little toward
 *     the pointer while the key light catches its face;
 *   - "What it is" lights its opening statement word by word, and fills
 *     each beat's rail, the first time each is reached;
 *   - "What you get" lights its ticks in order the first time it is reached;
 *   - "How it gets made" lights each clause as it is scrolled past (the
 *     homepage's own Process);
 *   - every [data-spot] group's spotlight glides to the item under
 *     attention, and rests on its [data-rest] item, if it has one.
 * Only classes and custom properties are written.
 */
import { Spot } from "../interior/spot";
import { Process } from "../home/process";
import { motionOn, onMotionChange } from "../motion/env";

/* ---- the level chart ---- */
const lv = document.querySelector<HTMLElement>("[data-lv]");
const chart = lv?.querySelector<HTMLElement>(".sd-chart");
if (lv && chart) {
  const inputs = Array.from(lv.querySelectorAll<HTMLInputElement>(".sd-pick-in"));
  const checked = (): number => Math.max(0, inputs.findIndex((i) => i.checked));
  const set = (i: number): void => {
    chart.style.setProperty("--i", String(i));
    chart.dataset.on = String(i);
  };
  chart.querySelectorAll<HTMLElement>("[data-col]").forEach((cell) => {
    cell.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") set(Number(cell.dataset.col));
    });
  });
  chart.addEventListener("pointerleave", () => set(checked()));
  lv.addEventListener("change", () => set(checked()));
  set(checked());
  chart.classList.add("is-js");
}

/* ---- the business card: turn it over, and let it catch the light ---- */
document.querySelectorAll<HTMLElement>(".sd-bc").forEach((fig) => {
  const btn = fig.querySelector<HTMLButtonElement>(".sd-bc-flip");
  const front = fig.querySelector<HTMLElement>(".sd-bc-side--front");
  const back = fig.querySelector<HTMLElement>(".sd-bc-side--back");
  if (!btn || !front || !back) return;
  btn.addEventListener("click", () => {
    const toBack = !fig.classList.contains("is-back");
    fig.classList.toggle("is-back", toBack);
    btn.setAttribute("aria-pressed", String(toBack));
    btn.querySelector("span")!.textContent = toBack ? "Show the front" : "Show the back";
    front.setAttribute("aria-hidden", String(toBack));
    back.setAttribute("aria-hidden", String(!toBack));
  });
});

const stage = document.querySelector<HTMLElement>("[data-stage]");
if (stage) {
  let frame = 0;
  const rest = (): void => {
    stage.style.setProperty("--rx", "0deg");
    stage.style.setProperty("--ry", "0deg");
    stage.style.setProperty("--gx", "50%");
    stage.style.setProperty("--gy", "0%");
  };
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !motionOn()) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      // Restrained: a few degrees at most, and the key's glint follows.
      stage.style.setProperty("--ry", `${(x * 9).toFixed(2)}deg`);
      stage.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
      stage.style.setProperty("--gx", `${(50 + x * 70).toFixed(1)}%`);
      stage.style.setProperty("--gy", `${(y * 60).toFixed(1)}%`);
    });
  });
  stage.addEventListener("pointerleave", rest);
  rest();
}

/* ---- what you get: the ticks come on in order, once ---- */
const get = document.querySelector<HTMLElement>("[data-get]");
if (get && motionOn() && "IntersectionObserver" in window) {
  get.classList.add("is-armed");
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      get.classList.add("is-on");
      io.disconnect();
    },
    { rootMargin: "0px 0px -22% 0px" }
  );
  io.observe(get);
  onMotionChange((on) => {
    if (!on) get.classList.add("is-on");
  });
}

/* ---- what it is: the case lights word by word, each beat's rail fills ---- */
const lead = document.querySelector<HTMLElement>("[data-lead]");
const beats = Array.from(document.querySelectorAll<HTMLElement>("[data-beat]"));
if ((lead || beats.length) && motionOn() && "IntersectionObserver" in window) {
  if (lead) {
    const words = (lead.textContent || "").trim().split(/\s+/);
    lead.textContent = "";
    words.forEach((word, i) => {
      const w = document.createElement("span");
      w.className = "sd-w";
      w.style.setProperty("--i", String(i));
      w.textContent = word;
      lead.append(w, i < words.length - 1 ? " " : "");
    });
  }
  const arm = [lead, ...beats].filter((el): el is HTMLElement => !!el);
  arm.forEach((el) => el.classList.add("is-armed"));
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-on");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -18% 0px" }
  );
  arm.forEach((el) => io.observe(el));
  onMotionChange((on) => {
    if (!on) arm.forEach((el) => el.classList.add("is-on"));
  });
}

/* ---- how it gets made ---- */
const procRoot = document.getElementById("process");
if (procRoot) {
  const proc = new Process(procRoot);
  onMotionChange((on) => proc.setMotion(on));
}

/* ---- spotlights ---- */
const spots = Array.from(
  document.querySelectorAll<HTMLElement>("[data-spot]"),
  (wrap) => new Spot(wrap, wrap.dataset.spot || ".sv-card", () => wrap.querySelector<HTMLElement>("[data-rest]"), undefined, ".sv-spot")
);
const refresh = (): void => spots.forEach((s) => s.home());
document.fonts?.ready.then(refresh);
let resizeFrame = 0;
addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(refresh);
});
