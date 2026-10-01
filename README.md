# ALVSolutions

The company site for **ALVSolutions** (https://alvsolutions.co): professional
websites built around how a business gets customers. Eleventy for the pages,
esbuild for the TypeScript and CSS, GSAP for the homepage opening and reel. No
UI framework. The design system is **Screen Light**: a dark room, ALVSolutions'
white key light, and a glowing blue bar for selection and progress. The
identity is the ALV symbol plus an Archivo "ALVSolutions" wordmark, in neutral
ink with no accent colour (`components/identity.njk`, `styles/identity.css`);
the site's own type is Bricolage Grotesque and Instrument Sans.

## Branches

`main` is the live site and stays untouched until the one approved cutover.
Rebrand work lives on the long-lived `rebrand` branch. Do not commit, push,
merge or deploy to `main` without explicit approval.

## Working on it

```bash
npm install            # once, after cloning
npm run build          # one-off build into _site/ (esbuild bundles first)
npm run serve          # Eleventy dev server with watching
npm run typecheck      # tsc --noEmit
node serve.mjs         # plain static server for _site/ (no rebuilds)
node check-site.mjs    # every internal link + the PLACEHOLDER count
```

`serve.mjs` and `npm run serve` both use port 3000. **Check whether one is
already running before starting another.** An old server on the port serves
stale files and every new route 404s, which looks exactly like a build failure.

Eleventy does not empty `_site/` or `src/assets/dist/`, so a file you delete
from `src/` can linger in the output. Delete both folders (they are git-ignored)
for a truthful build.

## Where things are

```
src/
  index.html                 home (opening, held work reel, offer, prices, close)
  about.html contact.html work.html pricing.html policies.html connect.html
  builds/                    index.html (compares the four builds) + build.njk
                             (one page each, /builds/<slug>/, from bundles.json)
  packages/                  index.html, add-ons.html, and for-your-business.html
                             (a stub that points at /builds/; see Not done yet)
  services/                  index.html + service.njk (one page per service)
  legal/                     privacy.html, terms.html
  _data/                     site, packages, careplans, bundles, addons,
                             standalone, policies, services, process, work
  _includes/layouts/         base.njk (every page), interior.njk (every page but home)
  _includes/components/      nav, footer, identity, icon-sprite, founders-special,
                             sv-card, contact-next, quote-form
  _includes/home/            the homepage's sections; prepaint.njk runs before paint
  _includes/work/            prepaint.njk for /work/
  styles/                    site.css (every page), home.css, interior.css (imports
                             the per-page files: pricing, services, service, work,
                             builds, offer, about, contact, doc, connect, process ...)
  scripts/                   one entry per page (home, about, contact, doc, ...);
                             site.ts is on every page
  home/                      opening.ts, reel.ts, reel-geometry.ts, picker.ts ...
  interior/                  spot.ts (the gliding spotlight), point-rail.ts
  light/  motion/  identity/ the light room, the text "deal", the signature motions
  forms/quote-wizard.ts      the intake wizard (Formspree)
  assets/                    images, fonts, showcase and work screens
Demo Restaurant/  Demo Detailer/   standalone fictional sites, copied verbatim
                                   to /demo-restaurant/ and /demo-detailer/
```

Every page uses `layouts/base.njk`; every page except home uses
`layouts/interior.njk` (a short lit header band, the page, a closing band). A
page names its script with `pageJs` and its styles with `pageCss` in front
matter. There is no legacy stylesheet any more.

The primary nav is `primaryNav` in `site.json`: Work (`/work/`, the portfolio
of concept builds), What I build (`/builds/`, the industry builds), Services,
Pricing, then Start a project. The logo is the Home link; Packages and About are
reached from the footer and in-page links. **Work** and **What I build** are
different things and must not share a label.

## The offer, in one paragraph

A build is a **one-time** price and a care plan is a **separate, required
monthly** one. The figures live in `_data` and are read by every template; this
is a snapshot, so trust the data files over this paragraph.

- **Packages:** Foundation $650 (up to 3 pages, 1 revision round), Standard
  $1,050 (up to 5, 2 rounds, 3 page picks and 1 power feature), Complete $1,450
  (up to 7, 3 rounds, 5 page picks and 2 power features, plus booking
  integration and a business card design with print-ready files, no printing). **Page limits are totals**: page
  picks fit inside them.
- **Care plans:** Host $45/mo, Grow $95/mo. 3-month minimum, then 30 days' notice.
- **Picks:** eight page add-ons at $125, six power features at $225, one small
  enhancement at $50 (delivery links).
- **Four trade builds** (`bundles.json`): Detailer, Home Service Pro and Salon are
  the Standard package with the picks already made ($1,050). The Restaurant
  ($1,450) is its own fixed, curated build. It does not inherit anything from
  Complete. `/builds/` compares them and each has its own page at
  `/builds/<slug>/`, generated from `bundles.json`.
- **Standalone services** (a site you already have) are priced separately and
  intentionally differ from the same thing chosen inside a package.

The picks share one vocabulary across the packages, add-ons and trade-build
pages: a **hairline square** is a page add-on and a **short lit bar** is a power
feature.

## Content lives in JSON, not in markup

Prices, service copy and nav links are data. Change `packages.json` and the
package pages, the comparison chart, the price list and the homepage all change
together. Adding a service is one object in `services.json`; it appears in the
hub, the footer and the related lists on its own.

## Placeholders

An unsupplied value is `null` in the data, never a guess and never an empty
string. The `price` filter renders it as a visible `$—` marked `PLACEHOLDER`, so
it reads as unfinished rather than as free. **There are currently zero
placeholders.** The `money` filter also handles shapes a flat number cannot
express, and none of them is a placeholder:

| data | renders |
|---|---|
| `150` | `$150` |
| `{ "plus": 150 }` | `+$150` (a surcharge on something else) |
| `{ "from": 400 }` | `From $400` (a floor under a quote) |
| `{ "from": 100, "to": 175 }` | `$100 – $175` |
| `{ "soon": true }` | a `Coming soon` tag |
| `null` | `PLACEHOLDER` |

Shirt design is `{ "soon": true }` on purpose: the pricing is not settled, and a
marked "coming soon" is honest where an invented number is not.

## Motion

Text and information enter through one system, `src/motion/deal.ts`. Motion
respects the OS reduced-motion setting and the site's own switch
(`no-motion` on `<html>`); with either, nothing hides and nothing moves. The
homepage opening yields to the visitor: the first scroll or scrolling key
(latched in `home/prepaint.njk` before the script loads) skips it, and it never
waits on fonts for someone who has already moved on.

## Demo builds

`Demo Restaurant/` and `Demo Detailer/` are fictional concept sites with their
own brand and CSS. Each carries the disclosure "Fictional concept website
created by ALVSolutions for portfolio demonstration", a `noindex` meta tag, and a
small persistent badge. They are not pages of this site.

## Deployment

Live at **https://alvsolutions.co**, repo `Jxk0917/AlvSolutions-Main-Site`,
public.

Every push to `main` triggers `.github/workflows/deploy.yml`: Eleventy build →
`upload-pages-artifact` → `deploy-pages`. About 30 seconds end to end. There is
nothing to run by hand. (`rebrand` does not deploy.)

**CI installs with `npm ci --omit=dev`, and that flag is load-bearing.**
`canvas`, `puppeteer` and `typescript` are devDependencies used only for local
tooling (the `shot-*.mjs` capture scripts and `npm run typecheck`). A plain
`npm ci` makes CI compile canvas from source and download a Chromium build on
every deploy. Anything the production build itself needs at runtime (esbuild,
gsap) lives in `dependencies`, not `devDependencies`, precisely because
`--omit=dev` would strip it otherwise.

**The repo is public because it has to be.** GitHub's free plan refuses to serve
Pages from a private repo. A future *client* site that must stay closed-source
needs Cloudflare Pages or Netlify instead.

### Custom domain

The canonical domain is **https://alvsolutions.co**, already live. `PATH_PREFIX`
is `"/"` in `.github/workflows/deploy.yml`, and the custom domain is registered
in the repo's GitHub Pages settings (`cname: alvsolutions.co`, `build_type:
workflow`) rather than via a `src/CNAME` file, which is how a domain binds for
an Actions-based Pages deploy. DNS (apex A records to GitHub Pages, `www` CNAME
to `jxk0917.github.io`) and the HTTPS certificate are both live.

For a project-subpath preview instead, build with
`PATH_PREFIX=Repo-Name npx @11ty/eleventy` (bare, no slashes: a leading slash
makes Git Bash rewrite it into a Windows path).

## Not done yet

- The business-card showcase images (`src/assets/showcase`) are due a redesign.
- `src/packages/for-your-business.html` is a stub that points at `/builds/`. It
  stays because that route is live on `main`; at cutover it becomes a real
  redirect (with `#detailer`, `#home-service-pro`, `#salon` and `#restaurant`
  landing on `/builds/<slug>/`).
- The social share image (`src/assets/brand/og-image.png`, from
  `Brand_Assets/tools/build-og.mjs`) still uses the earlier blue identity.
