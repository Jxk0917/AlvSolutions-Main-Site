# AlvSolutions

The company site. Eleventy, no framework, no CSS build step — the same setup as
the Sherpa site.

## Working on it

```bash
npx @11ty/eleventy          # one-off build into _site/
npm run serve               # Eleventy dev server with watching
node serve.mjs              # plain static server for _site/ (no rebuilds)
node check-site.mjs         # every internal link + the PLACEHOLDER count
node compare-build.mjs      # regression check against the pre-Eleventy page
```

`serve.mjs` and `npm run serve` both use port 3000. **Check whether one is
already running before starting another** — an old server on the port serves
stale files and every new route 404s, which looks exactly like a build failure.

## Where things are

```
src/
  index.html              home
  packages/               index.html (tiers, chart, fees) + add-ons.html
  services/               index.html (hub) + service.njk → 8 pages
  work.html about.html contact.html
  stub.njk                → the legal pages
  _data/                  site · packages · addons · fees · services · stubs
  _includes/layouts       base.njk
  _includes/components    nav, footer, pagehead, cta-band, process-steps,
                          contact-section, price-matrix, tier-cards,
                          addon-block, fee-list, service-card, icon-sprite
  assets/                 styles.css, pages.css, main.js, shader.js, images
```

`Demo Restaurant/` and `Demo Detailer/` are standalone sites with their own
brand and CSS. They live outside `src/`, are copied verbatim into the build, and
are not pages of this site.

## Content lives in JSON, not in markup

Prices, service copy and nav links are data. Change `packages.json` and the tier
cards, the comparison chart, every "included in Pro" line and the home page all
change together. Adding a service is one object in `services.json`; it appears
in the nav, footer, hub and related lists on its own.

## Placeholders

An unsupplied value is `null` in the data, never a guess and never an empty
string. The `price` filter renders it as a visible `$—` marked
`PLACEHOLDER`, so it reads as unfinished rather than as free.

`node check-site.mjs` counts them. **Seven blanks are outstanding**: business
card basic and premium, T-shirt basic and premium, onboarding, extra revision
round, rush delivery.

## Deployment

Live at **https://jxk0917.github.io/AlvSolutions-Main-Site/** — repo
`Jxk0917/AlvSolutions-Main-Site`, public.

Every push to `main` triggers `.github/workflows/deploy.yml`: Eleventy build →
`upload-pages-artifact` → `deploy-pages`. About 30 seconds end to end. There is
nothing to run by hand.

**CI installs with `npm ci --omit=dev`, and that flag is load-bearing.**
`canvas` and `puppeteer` are devDependencies used only by the local `shot-*.mjs`
capture tooling. A plain `npm ci` makes CI compile canvas from source and
download a Chromium build on every deploy.

**The repo is public because it has to be.** GitHub's free plan refuses to serve
Pages from a private repo. A future *client* site that must stay closed-source
needs Cloudflare Pages or Netlify instead.

### Switching to alvsolutions.com

The site currently builds with `PATH_PREFIX: AlvSolutions-Main-Site` so it
renders at the github.io project subpath. `HtmlBasePlugin` rewrites every
root-absolute link, so nothing is hardcoded and the switch is two edits:

1. Set `PATH_PREFIX: "/"` in `.github/workflows/deploy.yml`.
2. Add `src/CNAME` containing `alvsolutions.com`, and register it with
   `gh api -X PUT repos/Jxk0917/AlvSolutions-Main-Site/pages -f cname=alvsolutions.com`.
   The CNAME file alone does **not** set the Pages domain on an Actions deploy.

Do both only after DNS resolves, or Pages serves the domain before the
certificate exists.

## Not done yet

- **Home page rewiring.** The home page is unchanged from before the migration
  apart from the nav and footer. Its service cards still scroll to `#services`
  instead of linking to the eight service pages, and its icons are still inlined
  rather than using the sprite. That work needs sign-off first.
- **`index.html` in the project root** is the pre-Eleventy original, kept as the
  baseline for `compare-build.mjs`. Delete it when the home rewiring lands.
- **The contact form still opens a mailto.** It is one shared component now, so
  switching to a form endpoint means editing `contact-section.njk` and the
  handler at the bottom of `assets/main.js` — two places, once.
- **`PATH_PREFIX`** is wired for GitHub Pages but unset. For a project subpath,
  build with `PATH_PREFIX=Repo-Name npx @11ty/eleventy` (bare, no slashes — a
  leading slash makes Git Bash rewrite it into a Windows path).
