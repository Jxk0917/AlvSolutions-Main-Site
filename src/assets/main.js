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

  /* ---- pricing tier picker ---------------------------------------------
     A standard tablist: click or arrow-key between tiers, with the last tab
     being Compare. The markup already ships panel 0 visible and the rest
     `hidden`, so there is no flash of every panel before this runs.        */
  document.querySelectorAll('.ptier').forEach(function (group) {
    var tabs   = Array.prototype.slice.call(group.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(group.querySelectorAll('[role="tabpanel"]'));

    function select(i, focus) {
      tabs.forEach(function (t, n) {
        t.setAttribute('aria-selected', String(n === i));
        t.tabIndex = n === i ? 0 : -1;
      });
      panels.forEach(function (p, n) { p.hidden = n !== i; });
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

  /* ---- quote form ------------------------------------------------------
     Only the home page and /contact/ render the form. Everything below is
     guarded: unguarded, the null deref throws on the other 16 pages. It
     would not break the menu or the reveals (they run above it), which is
     exactly what makes it the kind of error nobody notices for a month.  */
  var form = document.getElementById('quote-form');
  if (!form) return;

  /* The package cards link to /contact/?package=growth. Carrying that through
     means the message already says which tier they clicked, so the first reply
     is a quote rather than a question they have already answered. */
  var wanted = new URLSearchParams(window.location.search).get('package');
  var names = { starter: 'Starter', growth: 'Growth', pro: 'Pro' };
  if (wanted && names[wanted]) {
    var project = document.getElementById('f-project');
    if (project && !project.value) {
      project.value = 'I am interested in the ' + names[wanted] + ' package.\n\n';
      project.setAttribute('data-prefilled', 'true');
    }
  }

  function validate(input) {
    var field = input.closest('[data-field]');
    var ok = input.checkValidity() && input.value.trim() !== '';
    field.classList.toggle('invalid', !ok);
    input.setAttribute('aria-invalid', String(!ok));
    return ok;
  }

  form.querySelectorAll('.input').forEach(function (input) {
    input.addEventListener('blur', function () { validate(input); });
    input.addEventListener('input', function () {
      if (input.closest('[data-field]').classList.contains('invalid')) validate(input);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var inputs = Array.prototype.slice.call(form.querySelectorAll('.input'));
    var firstBad = null;
    inputs.forEach(function (input) { if (!validate(input) && !firstBad) firstBad = input; });
    if (firstBad) { firstBad.focus(); return; }

    var d = new FormData(form);
    var body =
      'Business: ' + d.get('business') + '\n' +
      'Name: '     + d.get('name')     + '\n' +
      'Email: '    + d.get('email')    + '\n\n' +
      d.get('project');

    window.location.href = 'mailto:laurenttsautos@gmail.com'
      + '?subject=' + encodeURIComponent('Website project: ' + d.get('business'))
      + '&body='    + encodeURIComponent(body);

    form.classList.add('done');
  });
})();

