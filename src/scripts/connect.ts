/**
 * /connect/ enhancement. The page is complete without this file: every
 * action is a link and the email address is visible and selectable.
 *
 * With script:
 *   - the actions' lit bar and key light glide to the one under the finger,
 *     pointer or focus, and rest on "Start a project";
 *   - the email button copies the address, where the clipboard is
 *     available, and says so.
 */
import { Spot } from "../interior/spot";

const wrap = document.querySelector<HTMLElement>("[data-cn-acts]");
if (wrap) {
  const acts = Array.from(wrap.querySelectorAll<HTMLElement>(".cn-act"));
  const rows = acts.map((a) => a.parentElement as HTMLElement);
  const bar = wrap.querySelector<HTMLElement>(".cn-bar")!;
  const follow = (el: HTMLElement | null): void => {
    rows.forEach((r, i) => acts[i].classList.toggle("is-on", r === el));
    if (!el) return;
    bar.style.setProperty("--by", `${el.offsetTop}px`);
    bar.style.setProperty("--bh", `${el.offsetHeight}px`);
  };
  // The light rests on the first row; a touch moves it as it does a pointer.
  const spot = new Spot(wrap, ".cn-acts > li", () => rows[0] ?? null, follow, ".sv-spot");
  rows.forEach((r) => r.addEventListener("touchstart", () => spot.to(r), { passive: true }));
  const refresh = (): void => spot.home();
  document.fonts?.ready.then(refresh);
  addEventListener("resize", refresh);
}

document.querySelectorAll<HTMLButtonElement>("[data-copy-email]").forEach((btn) => {
  const status = btn.parentElement?.querySelector("[data-copy-status]");
  let timer = 0;
  btn.addEventListener("click", () => {
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(btn.dataset.copyEmail ?? "").then(
      () => {
        btn.classList.add("is-copied");
        if (status) status.textContent = "Copied";
        clearTimeout(timer);
        timer = window.setTimeout(() => {
          btn.classList.remove("is-copied");
          if (status) status.textContent = "";
        }, 2000);
      },
      () => { /* permission denied: the address stays visible to copy by hand */ }
    );
  });
});
