(function () {
  'use strict';

  /* ---- mobile menu ---------------------------------------------------- */
  var burger = document.getElementById('burger');
  var menu   = document.getElementById('mob-menu');

  function setMenu(open) {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); }
  });

  /* ---- nav border on scroll -------------------------------------------
     A sentinel + IntersectionObserver, so there is no scroll listener
     running on every frame.                                              */
  var nav = document.getElementById('nav');
  var sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:60px;pointer-events:none;';
  document.body.prepend(sentinel);
  new IntersectionObserver(function (entries) {
    nav.classList.toggle('scrolled', !entries[0].isIntersecting);
  }, { threshold: 0 }).observe(sentinel);

  /* ---- "back to x" links -----------------------------------------------
     Each one's href is a sensible default (the index page it belongs to).
     If this visit actually arrived from somewhere on this site, real
     history.back() beats that guess: it lands on the exact page and scroll
     position clicked from, which a fresh navigation to the default never
     would. Anything else — a direct link, a new tab, a search result —
     falls through to the plain href. */
  document.querySelectorAll('.js-back').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var ref = document.referrer;
      if (!ref || history.length < 2) return;
      try {
        if (new URL(ref).origin === location.origin) { e.preventDefault(); history.back(); }
      } catch (err) { /* malformed referrer: fall through to the href */ }
    });
  });

  /* A back button with `data-show-if` sits on a page reached from more than
     one place, where its label is only right some of the time — /contact/
     says "Back to Packages" for someone who clicked a package, and would be
     a wrong guess for someone who clicked "Start a project" from the nav.
     It starts hidden and only appears when that query key is actually
     present, so the wrong guess never shows at all. */
  var params = new URLSearchParams(location.search);
  document.querySelectorAll('.js-back[data-show-if]').forEach(function (a) {
    if (params.has(a.dataset.showIf)) a.hidden = false;
  });

  /* /contact/?service=<slug> gets a Back link to that service instead. The
     slug-to-route list is rendered into the button by the template, so the
     URLs come from the service data and nothing is hardcoded here. A package
     link keeps the Packages button as it was. */
  document.querySelectorAll('.js-back[data-services]').forEach(function (a) {
    var slug = params.get('service');
    if (!slug || params.has('package')) return;
    var list;
    try { list = JSON.parse(a.dataset.services); } catch (err) { return; }
    var hit = list.filter(function (s) { return s.slug === slug; })[0];
    if (!hit) return;
    a.href = hit.url;
    var name = a.querySelector('[data-back-label]');
    if (name) name.textContent = hit.name;
    a.hidden = false;
  });

  /* ---- pricing tier picker ---------------------------------------------
     A standard tablist: click or arrow-key between tiers, with the last tab
     being Compare. The markup already ships panel 0 visible and the rest
     `hidden`, so there is no flash of every panel before this runs.        */
  var ptierReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.ptier').forEach(function (group) {
    var tabs   = Array.prototype.slice.call(group.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(group.querySelectorAll('[role="tabpanel"]'));

    function select(i, focus) {
      tabs.forEach(function (t, n) {
        t.setAttribute('aria-selected', String(n === i));
        t.tabIndex = n === i ? 0 : -1;
      });

      var next = panels[i];
      panels.forEach(function (p, n) { if (n !== i) p.hidden = true; });

      /* The incoming panel fades and lifts in rather than snapping into
         place, so picking Complex reads as a state change, not a reload.
         Forcing a reflow between adding and removing `ptier-pre` is what
         makes the browser register the "before" frame instead of
         collapsing both into one and skipping the transition entirely. */
      if (ptierReduceMotion) {
        next.hidden = false;
      } else {
        next.classList.add('ptier-pre');
        next.hidden = false;
        void next.offsetWidth;
        next.classList.remove('ptier-pre');
      }

      if (focus) tabs[i].focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(i); });
      tab.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (step) { e.preventDefault(); select((i + step + tabs.length) % tabs.length, true); }
        else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        else if (e.key === 'End')  { e.preventDefault(); select(tabs.length - 1, true); }
      });
    });
  });

  /* ---- two-sided card mockups ------------------------------------------
     The flip itself is CSS; this only toggles the class and keeps the button
     label and pressed state honest about which face is showing.           */
  document.querySelectorAll('.cardshot-2').forEach(function (fig) {
    var btn = fig.querySelector('.cardshot-btn');
    if (!btn) return;
    var label = btn.querySelector('span');
    btn.addEventListener('click', function () {
      var flipped = fig.classList.toggle('flipped');
      btn.setAttribute('aria-pressed', String(flipped));
      label.textContent = flipped ? btn.dataset.b : btn.dataset.a;
    });
  });

  /* ---- scroll reveal --------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }


  /* ---- project intake wizard -------------------------------------------
     Only the home page and /contact/ render the form. Everything below is
     guarded: unguarded, the null deref throws on the other 16 pages. It
     would not break the menu or the reveals (they run above it), which is
     exactly what makes it the kind of error nobody notices for a month.

     Answers live in the inputs and nowhere else. Panels are hidden, never
     detached, so stepping back and forth preserves everything for free and
     no copy of the visitor's details is kept anywhere on their machine. */
  var form = document.getElementById('quote-form');
  if (!form) return;

  function toArray(list) { return Array.prototype.slice.call(list); }

  var panels  = toArray(form.querySelectorAll('[data-panel]'));
  var backBtn = form.querySelector('[data-back]');
  var nextBtn = form.querySelector('[data-next]');
  var sendBtn = form.querySelector('[data-send]');
  var sendLabel = form.querySelector('[data-send-label]');
  var submitError = form.querySelector('[data-submit-error]');
  var submitErrorText = form.querySelector('[data-submit-error-text]');
  var liveMsg = form.querySelector('[data-live]');
  var bar     = form.querySelector('.wiz-bar');
  var barFill = form.querySelector('[data-fill]');
  var stepN   = form.querySelector('[data-step-n]');
  var stepName = form.querySelector('[data-step-name]');
  var LAST    = panels.length - 1;
  var reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ENDPOINT = form.getAttribute('data-endpoint');
  var SEND_LABEL_DEFAULT = sendLabel ? sendLabel.textContent : 'Send project details';
  var submitting = false;  // guards double submission from a repeat click or Enter

  var at = 0;  // panel on screen

  /* ---- reading the answers ---- */

  /* A RadioNodeList reports the checked radio's value, so one getter covers
     text inputs, selects and every single-answer group. Checkboxes are the
     exception: they report nothing, and go through pickedList instead. */
  function val(name) {
    var el = form.elements[name];
    return el && el.value ? el.value.trim() : '';
  }
  function pickedList(name) {
    return toArray(form.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (i) { return i.value; });
  }

  /* ---- validation ----
     Rules a browser will not enforce on its own. type=email accepts "a@b",
     which is not an address anyone can reply to. */
  var CHECKS = {
    email: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i,
    url:   /^(https?:\/\/)?[^\s/?#.]+\.[^\s]{2,}$/i
  };

  function validateField(box) {
    var ok = true;
    if (!box.closest('[hidden]') && box.hasAttribute('data-req')) {
      if (box.hasAttribute('data-group')) {
        ok = toArray(box.querySelectorAll('input')).some(function (i) { return i.checked; });
      } else {
        var el = box.querySelector('.input');
        if (!el) return true;
        var v = el.value.trim();
        var kind = el.getAttribute('data-check');
        ok = v !== '';
        if (ok && kind === 'phone') ok = (v.match(/\d/g) || []).length >= 10;
        else if (ok && CHECKS[kind]) ok = CHECKS[kind].test(v);
        el.setAttribute('aria-invalid', String(!ok));
      }
    }
    box.classList.toggle('invalid', !ok);
    return ok;
  }

  function setAlert(panel, count) {
    var alert = panel.querySelector('[data-alert]');
    if (!alert) return;
    alert.hidden = count === 0;
    if (count) {
      alert.querySelector('[data-alert-text]').textContent = count === 1
        ? 'One answer needs your attention.'
        : count + ' answers need your attention.';
    }
  }

  /* Keeps a banner that is already up honest as the answers get fixed, and
     clears it on the last one. It never raises a banner by itself: pressing
     Continue is what asks the whole step how it is doing. */
  function syncAlert(box) {
    var panel = box.closest('[data-panel]');
    if (!panel) return;
    var alert = panel.querySelector('[data-alert]');
    if (!alert || alert.hidden) return;
    setAlert(panel, panel.querySelectorAll('[data-field].invalid').length);
  }

  function validateStep(i, moveFocus) {
    var panel = panels[i];
    var bad = toArray(panel.querySelectorAll('[data-field]'))
      .filter(function (box) { return !validateField(box); });

    setAlert(panel, bad.length);
    if (bad.length && moveFocus) {
      var el = bad[0].querySelector('.input, input');
      if (el) el.focus();
    }
    return bad.length === 0;
  }

  /* ---- the progress bar ----
     The bar fills to the end of the step being answered, not to the start of
     it, so step one already shows a quarter done and the review sits at full.
     Nobody opens a form to a bar reading zero. */
  function label(i) { return panels[i].getAttribute('data-step-label') || ''; }
  function position() { return 'Step ' + (at + 1) + ' of ' + panels.length + ', ' + label(at); }

  function paint() {
    if (barFill) barFill.style.setProperty('--p', (at + 1) / panels.length);
    if (stepN) stepN.textContent = String(at + 1);
    if (stepName) stepName.textContent = label(at);
    if (bar) {
      bar.setAttribute('aria-valuenow', String(at + 1));
      bar.setAttribute('aria-valuetext', position());
    }
  }

  function announce() {
    if (liveMsg) liveMsg.textContent = position();
  }

  /* Replaying the entry animation means clearing the class, forcing the
     layout to settle, then setting it again. Without the reflow the browser
     collapses both writes into one frame and nothing moves. */
  function replay(el) {
    if (reduce) return;
    el.classList.remove('is-in');
    void el.offsetWidth;
    el.classList.add('is-in');
  }

  /* Puts the form back under the nav. Normally it only acts when the form has
     drifted out of a comfortable band, so stepping between two panels of
     similar height does not yank the page around; `force` overrides that for
     the one case where the form's own height changes underneath the reader. */
  function showForm(force) {
    var navH = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--nav-h'), 10) || 68;
    var top = form.getBoundingClientRect().top;
    if (!force && top >= navH + 16 && top <= window.innerHeight * 0.55) return;
    window.scrollTo({
      top: window.pageYOffset + top - navH - 16,
      behavior: reduce ? 'auto' : 'smooth'
    });
  }

  function focusPanel(panel) {
    var head = panel.querySelector('.wiz-title');
    if (head) head.focus({ preventScroll: true });
    showForm(false);
  }

  function goTo(i, opts) {
    opts = opts || {};
    panels[at].hidden = true;
    form.style.setProperty('--wiz-y', i < at ? '-10px' : '10px');
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
  function bindCond(input) {
    var target = document.getElementById(input.getAttribute('data-cond'));
    if (!target) return;
    var wanted = input.getAttribute('data-cond-value');

    function sync() {
      var on = input.type === 'checkbox' ? input.checked
             : wanted ? input.value === wanted
             : input.checked;
      if (on === !target.hidden) return;
      target.hidden = !on;
      if (on) {
        replay(target);
      } else {
        target.classList.remove('invalid');
        toArray(target.querySelectorAll('.input')).forEach(function (el) {
          el.value = '';
          el.removeAttribute('aria-invalid');
        });
      }
      syncAlert(target);
    }

    input.addEventListener('change', sync);
    if (input.type === 'radio') {
      toArray(form.querySelectorAll('input[name="' + input.name + '"]'))
        .forEach(function (sib) { if (sib !== input) sib.addEventListener('change', sync); });
    }
    sync();
  }

  /* ---- review ---- */
  function addRow(dl, label, value) {
    var many = Array.isArray(value);
    if (many ? !value.length : !value) return;

    var row = document.createElement('div');
    row.className = 'rev-row';
    var dt = document.createElement('dt');
    dt.textContent = label;
    var dd = document.createElement('dd');

    if (many) {
      var ul = document.createElement('ul');
      ul.className = 'rev-tags';
      value.forEach(function (v) {
        var li = document.createElement('li');
        li.textContent = v;
        ul.appendChild(li);
      });
      dd.appendChild(ul);
    } else {
      dd.textContent = value;
    }

    row.appendChild(dt);
    row.appendChild(dd);
    dl.appendChild(row);
  }

  function fill(key, rows) {
    var dl = form.querySelector('[data-rev="' + key + '"]');
    if (!dl) return;
    dl.textContent = '';
    rows.forEach(function (r) { addRow(dl, r[0], r[1]); });
  }

  /* Everything here goes through textContent, so whatever was typed into
     "Other" is read back as text and never as markup. */
  function goalList() {
    var other = val('goalOther');
    return pickedList('goals').map(function (g) {
      return g === 'Other' && other ? other : g;
    });
  }

  function needList() {
    var other = val('needOther');
    return pickedList('needs').map(function (n) {
      return n === 'Other' && other ? other : n;
    });
  }

  function buildReview() {
    fill('contact', [
      ['Name', val('name')],
      ['Business', val('business')],
      ['Email', val('email')],
      ['Phone', val('phone')],
      ['Service area', val('city')],
      ['Current site', val('hasSite') === 'Yes' ? (val('siteUrl') || 'Yes') : 'No site yet']
    ]);
    fill('business', [
      ['Type', val('businessType')],
      ['What it does', val('businessOther')]
    ]);
    fill('goals', [
      ['What you need', needList()],
      ['Customers should be able to', goalList()],
      ['Budget', val('budget')],
      ['Timeline', val('timeline')],
      ['Started from', val('package')]
    ]);
  }

  function finish() {
    var slot = form.querySelector('[data-firstname]');
    var first = val('name').split(/\s+/)[0];
    if (slot) slot.textContent = first ? ', ' + first : '';
    form.classList.add('done');
    var head = form.querySelector('[data-sent-head]');
    if (head) head.focus({ preventScroll: true });

    /* The review panel is tall and the confirmation that replaces it is short,
       so .done removes most of the form's height from under the reader and
       leaves them parked on whatever section follows. Scroll unconditionally:
       the layout just moved, so where they were is no longer where they were. */
    showForm(true);
  }

  /* ---- submission (Formspree) ----
     Async fetch, never a real navigation: a mailto redirect or a real POST to
     Formspree's own success page would both take the visitor off this site,
     which is exactly what the custom .sent panel above exists to avoid. */
  function setSending(on) {
    sendBtn.disabled = on;
    if (sendLabel) sendLabel.textContent = on ? 'Sending…' : SEND_LABEL_DEFAULT;
  }

  function hideSubmitError() {
    if (submitError) submitError.hidden = true;
  }

  function showSubmitError(reason) {
    if (!submitError) return;
    if (submitErrorText) submitErrorText.textContent = reason || 'Something went wrong sending your request.';
    submitError.hidden = false;
  }

  /* Formspree's error body, when it sends one, is `{ errors: [{ field, message }] }`.
     Anything else (a network failure, a non-JSON response) falls back to a
     plain reason so the banner never shows "undefined". */
  function formspreeReason(data) {
    if (data && Array.isArray(data.errors) && data.errors.length) {
      return 'Some of the information could not be sent (' + data.errors.map(function (er) {
        return er.field ? (er.field + ': ' + er.message) : er.message;
      }).join('; ') + ').';
    }
    return null;
  }

  function fail(reason) {
    submitting = false;
    setSending(false);
    showSubmitError(reason);
  }

  /* Conditional fields (cleared but not removed by bindCond when their
     question hides) and the picked-package flag should not reach Formspree
     as blank noise. The visible form and its inputs are untouched — this
     only trims the copy of the data being sent. */
  function submitPayload() {
    var data = new FormData(form);
    ['siteUrl', 'businessOther', 'goalOther', 'needOther'].forEach(function (key) {
      if (!(data.get(key) || '').trim()) data.delete(key);
    });
    if (!(data.get('package') || '').trim()) data.set('package', 'General inquiry');
    return data;
  }

  function submitForm() {
    if (submitting || !ENDPOINT) return;
    submitting = true;
    setSending(true);
    hideSubmitError();

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: submitPayload()
    }).then(function (res) {
      if (res.ok) {
        submitting = false;
        setSending(false);
        finish();
        return;
      }
      res.json().then(function (data) { fail(formspreeReason(data)); }, function () { fail(null); });
    }, function () {
      fail(null);  // fetch itself rejected: offline, blocked, DNS, etc.
    });
  }

  /* ---- wiring ---- */
  nextBtn.addEventListener('click', function () {
    if (validateStep(at, true)) goTo(at + 1);
  });
  backBtn.addEventListener('click', function () { goTo(at - 1); });

  /* Edit on the review screen only ever goes backwards, so it does not run the
     check Continue does: nobody should be held on a step they are leaving. */
  form.querySelectorAll('[data-edit]').forEach(function (btn) {
    btn.addEventListener('click', function () { goTo(Number(btn.getAttribute('data-edit'))); });
  });

  /* Enter inside a step means "next step", not "send". Without this the
     browser fires the only submit button on the form and someone on step one
     is bounced through a validation pass they never asked for. */
  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || at === LAST) return;
    var tag = e.target.tagName;
    if (tag === 'TEXTAREA' || tag === 'BUTTON') return;
    e.preventDefault();
    nextBtn.click();
  });

  form.querySelectorAll('.input').forEach(function (el) {
    var box = el.closest('[data-field]');
    if (!box) return;
    el.addEventListener('blur', function () { validateField(box); syncAlert(box); });
    function live() {
      if (!box.classList.contains('invalid')) return;
      validateField(box);
      syncAlert(box);
    }
    el.addEventListener('input', live);
    el.addEventListener('change', live);
  });

  form.querySelectorAll('[data-group] input').forEach(function (el) {
    el.addEventListener('change', function () {
      var box = el.closest('[data-field]');
      if (!box || !box.classList.contains('invalid')) return;
      validateField(box);
      syncAlert(box);
    });
  });

  /* Typed as ten digits or as (210) 555 0134, it reaches the inbox the same
     way. Formatting on blur rather than on keystroke keeps the caret still. */
  var phone = document.getElementById('f-phone');
  if (phone) {
    phone.addEventListener('blur', function () {
      var d = (phone.value.match(/\d/g) || []).join('');
      if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
      if (d.length === 10) phone.value = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + ' ' + d.slice(6);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    for (var i = 0; i < LAST; i++) {
      if (!validateStep(i)) {
        goTo(i, { focus: false });
        validateStep(i, true);
        return;
      }
    }
    submitForm();
  });

  /* The package cards link to /contact/?package=standard, and the trade builds
     to /contact/?package=detailer. Carrying that through means the request
     already says what they clicked, so the first reply is a quote rather than a
     question they have already answered.

     The two groups get different labels because they are different things: a
     package is a tier, a trade build is that tier with the picks made. Keep
     this map in step with packages.json and bundles.json. */
  var wanted = new URLSearchParams(window.location.search).get('package');
  var names = {
    foundation: 'Foundation package',
    standard: 'Standard package',
    complete: 'Complete package',
    detailer: 'The Detailer build',
    'home-service-pro': 'The Home Service Pro build',
    salon: 'The Salon build',
    restaurant: 'The Restaurant build'
  };
  if (wanted && names[wanted]) {
    form.elements.package.value = names[wanted];
    var tag = form.querySelector('.wiz-tag');
    if (tag) {
      tag.querySelector('[data-package-label]').textContent = names[wanted];
      tag.hidden = false;
    }
  }

  /* Service pages link to /contact/?service=brand-starter-kit. The request
     starts from that service: it is named in the tag above the form, and the
     matching "What do you need?" option is already ticked. */
  var services = {
    'brand-asset-setup':     { label: 'Brand Asset Setup',     need: 'Existing logo / brand asset preparation' },
    'brand-starter-kit':     { label: 'Brand Starter Kit',     need: 'Logo / branding' },
    'custom-identity':       { label: 'Custom Identity',       need: 'Logo / branding' },
    'social-web-banner-set': { label: 'Social/Web Banner Set', need: 'Social / web graphics' }
  };
  var svcWanted = new URLSearchParams(window.location.search).get('service');
  var svc = svcWanted && services[svcWanted];
  if (svc) {
    form.elements.package.value = svc.label;
    var svcTag = form.querySelector('.wiz-tag');
    if (svcTag) {
      svcTag.querySelector('[data-package-label]').textContent = svc.label;
      svcTag.hidden = false;
    }
    toArray(form.querySelectorAll('input[name="needs"]')).forEach(function (box) {
      if (box.value === svc.need) box.checked = true;
    });
  }

  /* The "what should the website do" question only applies when the project
     includes a website. Hiding it clears any answers so a branding-only
     request never carries website goals into the email. */
  var goalsBox = document.getElementById('c-goals');
  var needBoxes = toArray(form.querySelectorAll('input[name="needs"]'));
  function syncGoals() {
    if (!goalsBox) return;
    var on = needBoxes.some(function (b) {
      return b.checked && (b.hasAttribute('data-web') || b.value === 'Other');
    });
    if (on === !goalsBox.hidden) return;
    goalsBox.hidden = !on;
    if (on) { replay(goalsBox); return; }
    toArray(goalsBox.querySelectorAll('input[type="checkbox"]:checked')).forEach(function (b) {
      b.checked = false;
      b.dispatchEvent(new Event('change'));
    });
    toArray(goalsBox.querySelectorAll('.invalid')).forEach(function (el) { el.classList.remove('invalid'); });
    syncAlert(goalsBox);
  }
  needBoxes.forEach(function (b) { b.addEventListener('change', syncGoals); });

  form.querySelectorAll('[data-cond]').forEach(bindCond);
  syncGoals();
  paint();
})();
