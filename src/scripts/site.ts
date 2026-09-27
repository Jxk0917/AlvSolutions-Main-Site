import "../motion/env";

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
