import "../motion/env";
// The site-wide text entrance: every page inherits it (see motion/deal.ts).
import "../motion/deal";

/**
 * Mobile nav menu: a native <details> disclosure, so it works with no JS at
 * all. This only adds Escape-to-close with focus returned to the toggle;
 * open/close and Tab order are the browser's own <details> semantics.
 */
document.querySelectorAll<HTMLDetailsElement>("[data-menu]").forEach((menu) => {
  const summary = menu.querySelector("summary");
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.open) {
      menu.open = false;
      summary?.focus();
    }
  });
});

/**
 * The back button (interior pages with head.back): once its place in the
 * header scrolls under the nav, it docks below the nav and follows the page
 * (.is-docked, interior.css). Its slot keeps the button's size, so the
 * header does not reflow as it leaves.
 */
const backSlot = document.querySelector<HTMLElement>("[data-back]");
const back = backSlot?.querySelector<HTMLElement>(".int-back");
if (backSlot && back && "IntersectionObserver" in window) {
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--alv-nav-h")) || 72;
  new IntersectionObserver(
    ([e]) => {
      const dock = !e.isIntersecting && e.boundingClientRect.top < navH;
      if (dock === back.classList.contains("is-docked")) return;
      if (dock) {
        backSlot.style.width = `${back.offsetWidth}px`;
        backSlot.style.height = `${back.offsetHeight}px`;
      }
      back.classList.toggle("is-docked", dock);
    },
    { rootMargin: `-${navH}px 0px 0px 0px` }
  ).observe(backSlot);
}
