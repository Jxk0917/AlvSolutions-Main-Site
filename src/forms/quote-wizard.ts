/**
 * The project intake wizard (components/quote-form.njk): three answer steps
 * and a review, submitting to Formspree. One module for every page that
 * renders the form: the homepage bundles it into home.js, and /contact/
 * bundles it into contact.js. Its behaviour is the pre-rebrand site's, kept
 * unchanged.
 *
 * Answers live in the inputs and nowhere else. Panels are hidden, never
 * detached, so stepping back and forth preserves everything for free and no
 * copy of the visitor's details is kept anywhere on their machine.
 */
import { motionOn } from "../motion/env";

type Field = HTMLElement;

export function initQuoteForm(form: HTMLFormElement): void {
  const $ = <T extends Element = HTMLElement>(sel: string): T | null => form.querySelector<T>(sel);
  const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = form): T[] =>
    Array.from(root.querySelectorAll<T>(sel));

  const panels = $$("[data-panel]");
  const backBtn = $<HTMLButtonElement>("[data-back]")!;
  const nextBtn = $<HTMLButtonElement>("[data-next]")!;
  const sendBtn = $<HTMLButtonElement>("[data-send]")!;
  const sendLabel = $("[data-send-label]");
  const submitError = $("[data-submit-error]");
  const submitErrorText = $("[data-submit-error-text]");
  const liveMsg = $("[data-live]");
  const bar = $(".wiz-bar");
  const barFill = $("[data-fill]");
  const stepN = $("[data-step-n]");
  const stepName = $("[data-step-name]");
  const LAST = panels.length - 1;
  const reduce = !motionOn();

  const ENDPOINT = form.getAttribute("data-endpoint");
  const SEND_LABEL_DEFAULT = sendLabel?.textContent ?? "Send project details";
  let submitting = false; // guards double submission from a repeat click or Enter
  let at = 0; // panel on screen

  /* ---- reading the answers ----
     A RadioNodeList reports the checked radio's value, so one getter covers
     text inputs, selects and every single-answer group. Checkboxes are the
     exception: they report nothing, and go through pickedList instead. */
  function val(name: string): string {
    const el = form.elements.namedItem(name) as HTMLInputElement | RadioNodeList | null;
    return el && el.value ? el.value.trim() : "";
  }
  function pickedList(name: string): string[] {
    return $$<HTMLInputElement>(`input[name="${name}"]:checked`).map((i) => i.value);
  }

  /* ---- validation ----
     Rules a browser will not enforce on its own. type=email accepts "a@b",
     which is not an address anyone can reply to. */
  const CHECKS: Record<string, RegExp> = {
    email: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i,
    url: /^(https?:\/\/)?[^\s/?#.]+\.[^\s]{2,}$/i,
  };

  function validateField(box: Field): boolean {
    let ok = true;
    if (!box.closest("[hidden]") && box.hasAttribute("data-req")) {
      if (box.hasAttribute("data-group")) {
        ok = $$<HTMLInputElement>("input", box).some((i) => i.checked);
      } else {
        const el = box.querySelector<HTMLInputElement>(".input");
        if (!el) return true;
        const v = el.value.trim();
        const kind = el.getAttribute("data-check") ?? "";
        ok = v !== "";
        if (ok && kind === "phone") ok = (v.match(/\d/g) || []).length >= 10;
        else if (ok && CHECKS[kind]) ok = CHECKS[kind].test(v);
        el.setAttribute("aria-invalid", String(!ok));
      }
    }
    box.classList.toggle("invalid", !ok);
    return ok;
  }

  function setAlert(panel: HTMLElement, count: number): void {
    const alert = panel.querySelector<HTMLElement>("[data-alert]");
    if (!alert) return;
    alert.hidden = count === 0;
    if (count) {
      alert.querySelector("[data-alert-text]")!.textContent =
        count === 1 ? "One answer needs your attention." : `${count} answers need your attention.`;
    }
  }

  /* Keeps a banner that is already up honest as the answers get fixed, and
     clears it on the last one. It never raises a banner by itself: pressing
     Continue is what asks the whole step how it is doing. */
  function syncAlert(box: HTMLElement): void {
    const panel = box.closest<HTMLElement>("[data-panel]");
    if (!panel) return;
    const alert = panel.querySelector<HTMLElement>("[data-alert]");
    if (!alert || alert.hidden) return;
    setAlert(panel, panel.querySelectorAll("[data-field].invalid").length);
  }

  function validateStep(i: number, moveFocus = false): boolean {
    const panel = panels[i];
    const bad = $$("[data-field]", panel).filter((box) => !validateField(box));
    setAlert(panel, bad.length);
    if (bad.length && moveFocus) bad[0].querySelector<HTMLElement>(".input, input")?.focus();
    return bad.length === 0;
  }

  /* ---- the progress bar ----
     The bar fills to the end of the step being answered, not to the start
     of it, so step one already shows a quarter done and the review sits at
     full. Nobody opens a form to a bar reading zero. */
  const label = (i: number): string => panels[i].getAttribute("data-step-label") || "";
  const position = (): string => `Step ${at + 1} of ${panels.length}, ${label(at)}`;

  function paint(): void {
    barFill?.style.setProperty("--p", String((at + 1) / panels.length));
    if (stepN) stepN.textContent = String(at + 1);
    if (stepName) stepName.textContent = label(at);
    if (bar) {
      bar.setAttribute("aria-valuenow", String(at + 1));
      bar.setAttribute("aria-valuetext", position());
    }
  }

  function announce(): void {
    if (liveMsg) liveMsg.textContent = position();
  }

  /* Replaying the entry animation means clearing the class, forcing the
     layout to settle, then setting it again. Without the reflow the browser
     collapses both writes into one frame and nothing moves. */
  function replay(el: HTMLElement): void {
    if (reduce) return;
    el.classList.remove("is-in");
    void el.offsetWidth;
    el.classList.add("is-in");
  }

  /* Puts the form back under the nav. Normally it only acts when the form
     has drifted out of a comfortable band, so stepping between two panels
     of similar height does not yank the page around; `force` overrides that
     for the one case where the form's own height changes under the reader. */
  function showForm(force: boolean): void {
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--alv-nav-h"), 10) || 72;
    const top = form.getBoundingClientRect().top;
    if (!force && top >= navH + 16 && top <= innerHeight * 0.55) return;
    scrollTo({ top: scrollY + top - navH - 16, behavior: reduce ? "auto" : "smooth" });
  }

  function focusPanel(panel: HTMLElement): void {
    panel.querySelector<HTMLElement>(".wiz-title")?.focus({ preventScroll: true });
    showForm(false);
  }

  function goTo(i: number, opts: { focus?: boolean } = {}): void {
    panels[at].hidden = true;
    form.style.setProperty("--wiz-y", i < at ? "-10px" : "10px");
    at = i;

    if (at === LAST) buildReview();
    panels[at].hidden = false;
    replay(panels[at]);

    backBtn.hidden = at === 0;
    nextBtn.hidden = at === LAST;
    sendBtn.hidden = at !== LAST;

    paint();
    announce();
    if (opts.focus !== false) focusPanel(panels[at]);
  }

  /* ---- conditional questions ----
     One question opens another: Yes opens the address field, Other opens
     "what does it do", ASAP opens the rush note. Closing one clears what was
     typed into it, so an answer that is no longer on screen never reaches
     the email. */
  function bindCond(input: HTMLInputElement | HTMLSelectElement): void {
    const target = document.getElementById(input.getAttribute("data-cond") ?? "");
    if (!target) return;
    const wanted = input.getAttribute("data-cond-value");

    function sync(): void {
      const on =
        input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked
        : wanted ? input.value === wanted
        : (input as HTMLInputElement).checked;
      if (on === !target!.hidden) return;
      target!.hidden = !on;
      if (on) {
        replay(target!);
      } else {
        target!.classList.remove("invalid");
        $$<HTMLInputElement>(".input", target!).forEach((el) => {
          el.value = "";
          el.removeAttribute("aria-invalid");
        });
      }
      syncAlert(target!);
    }

    input.addEventListener("change", sync);
    if (input instanceof HTMLInputElement && input.type === "radio") {
      $$<HTMLInputElement>(`input[name="${input.name}"]`).forEach((sib) => {
        if (sib !== input) sib.addEventListener("change", sync);
      });
    }
    sync();
  }

  /* ---- review ----
     Everything here goes through textContent, so whatever was typed into
     "Other" is read back as text and never as markup. */
  function addRow(dl: HTMLElement, name: string, value: string | string[]): void {
    const many = Array.isArray(value);
    if (many ? !value.length : !value) return;

    const row = document.createElement("div");
    row.className = "rev-row";
    const dt = document.createElement("dt");
    dt.textContent = name;
    const dd = document.createElement("dd");

    if (many) {
      const ul = document.createElement("ul");
      ul.className = "rev-tags";
      value.forEach((v) => {
        const li = document.createElement("li");
        li.textContent = v;
        ul.appendChild(li);
      });
      dd.appendChild(ul);
    } else {
      dd.textContent = value;
    }
    row.append(dt, dd);
    dl.appendChild(row);
  }

  function fill(key: string, rows: [string, string | string[]][]): void {
    const dl = $(`[data-rev="${key}"]`);
    if (!dl) return;
    dl.textContent = "";
    rows.forEach(([k, v]) => addRow(dl, k, v));
  }

  const withOther = (list: string[], other: string): string[] =>
    list.map((v) => (v === "Other" && other ? other : v));

  function buildReview(): void {
    fill("contact", [
      ["Name", val("name")],
      ["Business", val("business")],
      ["Email", val("email")],
      ["Phone", val("phone")],
      ["Service area", val("city")],
      ["Current site", val("hasSite") === "Yes" ? val("siteUrl") || "Yes" : "No site yet"],
    ]);
    fill("business", [
      ["Type", val("businessType")],
      ["What it does", val("businessOther")],
    ]);
    fill("goals", [
      ["What you need", withOther(pickedList("needs"), val("needOther"))],
      ["Customers should be able to", withOther(pickedList("goals"), val("goalOther"))],
      ["Budget", val("budget")],
      ["Timeline", val("timeline")],
      ["Started from", val("package")],
    ]);
  }

  function finish(): void {
    const slot = $("[data-firstname]");
    const first = val("name").split(/\s+/)[0];
    if (slot) slot.textContent = first ? `, ${first}` : "";
    form.classList.add("done");
    $("[data-sent-head]")?.focus({ preventScroll: true });
    /* The review panel is tall and the confirmation that replaces it is
       short, so scroll unconditionally: the layout just moved. */
    showForm(true);
  }

  /* ---- submission (Formspree) ----
     Async fetch, never a real navigation: a real POST to Formspree's own
     success page would take the visitor off this site, which is exactly
     what the custom .sent panel exists to avoid. */
  function setSending(on: boolean): void {
    sendBtn.disabled = on;
    if (sendLabel) sendLabel.textContent = on ? "Sending…" : SEND_LABEL_DEFAULT;
  }

  function showSubmitError(reason: string | null): void {
    if (!submitError) return;
    if (submitErrorText) submitErrorText.textContent = reason || "Something went wrong sending your request.";
    submitError.hidden = false;
  }

  /* Formspree's error body, when it sends one, is { errors: [{ field, message }] }.
     Anything else falls back to a plain reason so the banner never shows
     "undefined". */
  function formspreeReason(data: unknown): string | null {
    const errors = (data as { errors?: { field?: string; message: string }[] } | null)?.errors;
    if (Array.isArray(errors) && errors.length) {
      return `Some of the information could not be sent (${errors
        .map((er) => (er.field ? `${er.field}: ${er.message}` : er.message))
        .join("; ")}).`;
    }
    return null;
  }

  function fail(reason: string | null): void {
    submitting = false;
    setSending(false);
    showSubmitError(reason);
  }

  /* Conditional fields (cleared but not removed when their question hides)
     and the picked-package flag should not reach Formspree as blank noise.
     This only trims the copy of the data being sent. */
  function submitPayload(): FormData {
    const data = new FormData(form);
    ["siteUrl", "businessOther", "goalOther", "needOther"].forEach((key) => {
      if (!String(data.get(key) ?? "").trim()) data.delete(key);
    });
    if (!String(data.get("package") ?? "").trim()) data.set("package", "General inquiry");
    return data;
  }

  function submitForm(): void {
    if (submitting || !ENDPOINT) return;
    submitting = true;
    setSending(true);
    if (submitError) submitError.hidden = true;

    fetch(ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body: submitPayload() }).then(
      (res) => {
        if (res.ok) {
          submitting = false;
          setSending(false);
          finish();
          return;
        }
        res.json().then((data) => fail(formspreeReason(data)), () => fail(null));
      },
      () => fail(null) // fetch itself rejected: offline, blocked, DNS, etc.
    );
  }

  /* ---- wiring ---- */
  nextBtn.addEventListener("click", () => {
    if (validateStep(at, true)) goTo(at + 1);
  });
  backBtn.addEventListener("click", () => goTo(at - 1));

  /* Edit on the review screen only ever goes backwards, so it does not run
     the check Continue does: nobody should be held on a step they leave. */
  $$("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => goTo(Number(btn.getAttribute("data-edit"))));
  });

  /* Enter inside a step means "next step", not "send". */
  form.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || at === LAST) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "TEXTAREA" || tag === "BUTTON") return;
    e.preventDefault();
    nextBtn.click();
  });

  $$<HTMLInputElement>(".input").forEach((el) => {
    const box = el.closest<HTMLElement>("[data-field]");
    if (!box) return;
    el.addEventListener("blur", () => {
      validateField(box);
      syncAlert(box);
    });
    const live = (): void => {
      if (!box.classList.contains("invalid")) return;
      validateField(box);
      syncAlert(box);
    };
    el.addEventListener("input", live);
    el.addEventListener("change", live);
  });

  $$<HTMLInputElement>("[data-group] input").forEach((el) => {
    el.addEventListener("change", () => {
      const box = el.closest<HTMLElement>("[data-field]");
      if (!box || !box.classList.contains("invalid")) return;
      validateField(box);
      syncAlert(box);
    });
  });

  /* Typed as ten digits or as (210) 555 0134, it reaches the inbox the same
     way. Formatting on blur rather than on keystroke keeps the caret still. */
  const phone = form.querySelector<HTMLInputElement>("#f-phone");
  phone?.addEventListener("blur", () => {
    let d = (phone.value.match(/\d/g) || []).join("");
    if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
    if (d.length === 10) phone.value = `(${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6)}`;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    for (let i = 0; i < LAST; i++) {
      if (!validateStep(i)) {
        goTo(i, { focus: false });
        validateStep(i, true);
        return;
      }
    }
    submitForm();
  });

  /* The package and build pickers submit ?package=<slug>. Carrying that
     through means the request already says what they chose. A package is a
     tier, a trade build is that tier with the picks made. Keep this map in
     step with packages.json and bundles.json. */
  const params = new URLSearchParams(location.search);
  const names: Record<string, string> = {
    foundation: "Foundation package",
    standard: "Standard package",
    complete: "Complete package",
    detailer: "The Detailer build",
    "home-service-pro": "The Home Service Pro build",
    salon: "The Salon build",
    restaurant: "The Restaurant build",
  };
  const pkgInput = form.elements.namedItem("package") as HTMLInputElement;
  const tag = $(".wiz-tag");
  const showTag = (text: string): void => {
    pkgInput.value = text;
    if (!tag) return;
    tag.querySelector("[data-package-label]")!.textContent = text;
    tag.hidden = false;
  };
  const wanted = params.get("package");
  if (wanted && names[wanted]) showTag(names[wanted]);

  /* Service pages link to /contact/?service=brand-starter-kit. The request
     starts from that service: named in the tag above the form, and the
     matching "What do you need?" option already ticked. */
  const services: Record<string, { label: string; need: string }> = {
    "brand-asset-setup": { label: "Brand Asset Setup", need: "Existing logo / brand asset preparation" },
    "brand-starter-kit": { label: "Brand Starter Kit", need: "Logo / branding" },
    "custom-identity": { label: "Custom Identity", need: "Logo / branding" },
    "social-web-banner-set": { label: "Social/Web Banner Set", need: "Social / web graphics" },
  };
  const svc = services[params.get("service") ?? ""];
  if (svc) {
    showTag(svc.label);
    $$<HTMLInputElement>('input[name="needs"]').forEach((box) => {
      if (box.value === svc.need) box.checked = true;
    });
  }

  /* The "what should the website do" question only applies when the
     project includes a website. Hiding it clears any answers so a
     branding-only request never carries website goals into the email. */
  const goalsBox = form.querySelector<HTMLElement>("#c-goals");
  const needBoxes = $$<HTMLInputElement>('input[name="needs"]');
  function syncGoals(): void {
    if (!goalsBox) return;
    const on = needBoxes.some((b) => b.checked && (b.hasAttribute("data-web") || b.value === "Other"));
    if (on === !goalsBox.hidden) return;
    goalsBox.hidden = !on;
    if (on) {
      replay(goalsBox);
      return;
    }
    $$<HTMLInputElement>('input[type="checkbox"]:checked', goalsBox).forEach((b) => {
      b.checked = false;
      b.dispatchEvent(new Event("change"));
    });
    $$(".invalid", goalsBox).forEach((el) => el.classList.remove("invalid"));
    syncAlert(goalsBox);
  }
  needBoxes.forEach((b) => b.addEventListener("change", syncGoals));

  /* A new website starts at the cheapest package, so once the request
     includes one (ticked, or arriving from a package or trade build) the
     budget choices begin there. The smaller ranges stay for services on
     their own: a logo, a banner set, a page or booking added to a site the
     visitor already has. A choice that stops being offered is cleared, so a
     request never carries a website budget below the price of a website. */
  const arrivedForSite = Boolean(wanted && names[wanted]);
  const budgetOpts = $$<HTMLElement>("[data-budget]");
  const budgetHints = $$<HTMLElement>("[data-budget-hint]");
  function syncBudget(): void {
    if (!budgetOpts.length) return;
    /* A page or booking asked for by someone with no site yet is a new
       website in all but name, so it gets the same floor. */
    const noSite = form.querySelector<HTMLInputElement>('input[name="hasSite"][value="No"]')?.checked === true;
    const site =
      arrivedForSite ||
      needBoxes.some((b) => b.checked && (b.value === "New website" || (noSite && b.hasAttribute("data-web"))));
    const kind = site ? "site" : "standalone";
    budgetOpts.forEach((opt) => {
      const show = opt.getAttribute("data-budget") === kind;
      opt.hidden = !show;
      const input = opt.querySelector<HTMLInputElement>("input");
      if (!show && input?.checked) {
        input.checked = false;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    budgetHints.forEach((h) => (h.hidden = h.getAttribute("data-budget-hint") !== kind));
  }
  needBoxes.forEach((b) => b.addEventListener("change", syncBudget));
  $$<HTMLInputElement>('input[name="hasSite"]').forEach((r) => r.addEventListener("change", syncBudget));

  $$<HTMLInputElement>("[data-cond]").forEach(bindCond);
  syncGoals();
  syncBudget();
  paint();
}
