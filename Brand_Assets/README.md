# AlvSolutions brand kit

> **Superseded for the website.** The site now runs on the master identity: the
> Dark Precision ALV symbol plus an Archivo "ALVSolutions" wordmark, in Screen
> Light neutrals (see `src/_includes/components/identity.njk` and
> `src/styles/identity.css`). Its favicon set is built by `tools/build-favicons.mjs`.
> Everything below documents the earlier blue kit, kept for reference and for
> the launch email, which still points at `alv-mark.png`.

Revised September 2026. Replaces `Brand Guidelines.png`, which is kept for reference only.
Share `brand/alvsolutions-brand-guidelines.png`.

## Files

```
brand/
  alvsolutions-brand-guidelines.png   The sheet (1600 wide; @2x at 3200). Share this one.
  brand-guidelines.html               Source for the sheet. Pulls live logo, icon and button files.
  alv-buttons.css                     Button styles (primary, gold, ghost, text; 3 sizes; all states).
logo/
  svg/
    alv-mark.svg            Primary. Navy blade + gradient arrow. Light backgrounds.
    alv-mark-reverse.svg    Mist blade + gradient arrow. Dark backgrounds (the website).
    alv-mark-navy.svg       One colour, Logo Navy. Print, embroidery, stamps.
    alv-mark-white.svg      One colour, Mist. On Deep Blue or photography.
    alv-badge.svg           App icon and social avatar. Reverse mark on an Ink tile.
    alv-favicon.svg         White mark on Deep Blue. Use below 32 px.
  png/                      Every SVG at 1024 / 512 / 256 / 128 / 64 / 32, plus horizontal and
                            stacked lockups (dark and light) at 2000 / 1000 / 500 wide.
icons/svg/{mono,blue,gold,navy}/   Tabler outline icons, one folder per colour. mono uses currentColor.
tools/
  build-logo.mjs            Traces the official mark from derived/alv-mark.png and writes the SVGs.
  export-png.mjs            Renders logo SVGs and lockups to PNG.
  build-icons.mjs           Writes the icon set.
  build-guidelines.mjs      Renders the sheet; fails on missing fonts/images or overflowing labels.
```

Regenerate from the repo root, in this order:

```
node Brand_Assets/tools/build-logo.mjs
node Brand_Assets/tools/export-png.mjs
node Brand_Assets/tools/build-icons.mjs
node Brand_Assets/tools/build-guidelines.mjs
```

## What the audit found in the old sheet

| Area | Problem | Fix |
| --- | --- | --- |
| Colours | Hex labels were on the wrong swatches (`#F3F4F6` printed on a blue chip), two swatches had no hex at all, and several codes were garbled. Gold was `#FFC641` on the sheet but `#FFC811` on the site. `#151515` appears nowhere in the product and is a warm grey against a blue-tinted palette. | Palette rebuilt from the values the site actually ships, with logo colours sampled from the real mark. |
| Logo on dark | The navy blade is 1.33:1 against Ink. On the website the mark reads as an arrow with a missing stroke. The old "dark" variant swapped in a grey mark instead of solving it. | New reverse mark: Mist blade, gradient arrow. |
| Logo files | Raster only, with soft edges and a glow in the source file. No flat versions, no favicon (the site uses a 429x278 PNG as its favicon). | Vector SVGs traced from the official PNG, so the shapes are unchanged. Flat, badge and favicon versions added. |
| Wordmark | The raster wordmark is not set in Manrope, so it didn't match the site nav. | Wordmark is live Manrope ExtraBold everywhere. |
| Gold variation | Blue mark on yellow, roughly 2:1. | Removed. Gold is never a logo background. |
| Clear space | Diagram with no rule stated. | x = half the mark's height, on every side. Minimum sizes set. |
| Typography | Listed twice, with one empty heading. No sizes. | One section: families, weights and the real type scale. |
| Icons | Glossy, filled, multi-colour clip art. Nothing like the site's outline icons. | Tabler outline, 1.75 stroke, the set the site already uses. |
| Buttons | Gradient fill, and a dark outline button for a light theme the site doesn't use. | Specified from the site, with every state shown. |

## Palette

| Name | Hex | Use |
| --- | --- | --- |
| Alv Blue | `#3DA8F8` | Accents, links, icons, "Solutions" on dark. 7.6:1 on Ink |
| Deep Blue | `#1A72C6` | Primary buttons (white label 4.92:1), "Solutions" on light, favicon tile |
| Logo Gradient | `#005CC5` to `#0BA2E4` | The mark only |
| Logo Navy | `#072753` | Mark blade and "Alv" on light. 14.8:1 on white |
| Gold | `#FFC811` | Hover, focus, prices, the one recommended pick. Ink label 12.6:1 |
| Ink | `#070C14` | Page background |
| Surface | `#0E1826` | Cards and panels (Raised `#14202F` one step above) |
| Mist | `#EDF2F8` | Headings on dark, reverse blade. 17.4:1 on Ink |
| Cloud | `#B4C2D2` | Body text on dark |
| Slate | `#8698AC` | Captions and meta. 6.6:1 on Ink |

## Rules

- **Blue carries the page; Gold moves.** Gold appears on highlight (hover, focus), on prices, and on the one recommended item in a set. Never as a large fill or a logo background.
- **Dark backgrounds use the reverse mark.** The primary mark is for white and Mist only.
- **Clear space** is half the mark's height on every side. **Minimum size**: lockup 130 px wide, mark 24 px tall, favicon below that.
- **Do not** redraw the wordmark in another face, recolour the arrow and wedge separately, add glows or shadows, or stretch the mark.
- **Type**: Manrope 800/700 for headings and the wordmark; Geist for everything else. Sentence case. Body lines under 60 characters.
- **Icons**: Tabler outline only, 1.75 stroke, round caps. One colour per icon. No filled or multi-colour icons, no emoji.
- **Radii**: 16 px cards and panels, 10 px buttons and inputs, 6 px small chrome, pills only for tags.

## Website

Applied to the site on 2026-09-15. `node Brand_Assets/tools/build-og.mjs` copies the logo
files the site uses into `src/assets/brand/` and renders its share image, so re-run it
after any logo change.

- Nav and footer use `alv-mark-reverse.svg`; favicon is `alv-favicon.svg` (PNG fallback),
  apple-touch icon is the badge, `og-image.png` replaces the old raster lockup.
- Buttons follow `alv-buttons.css`: 38 / 46 / 54 heights, gold fill on hover with no glow,
  1px press, no decorative trailing arrows (kept only for new tab, step forward, back).
- Every focus ring is Gold. Control borders use `--line-ui` (3:1 or better); the old .24
  alpha measured 1.5:1.
- Gold removed from decoration (premium tiles, the support card, the print service icons,
  the dearer price bracket, fee card stripes, pop-tier checkmarks). It stays on prices,
  the recommended package, hover and focus.
- Eyebrow labels removed (breadcrumbs already locate each page); tracked uppercase labels
  are sentence case; body copy on cards moved from Slate to Cloud; em dashes removed from copy.

Still using the old logo: the business card mockup photos in `src/assets/showcase/`
and the email templates in this folder. Those are artwork, not code.
