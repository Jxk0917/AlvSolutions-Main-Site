# ALVSolutions launch carousel

Six Instagram carousel slides, 1080 x 1350 PNG, in the Screen Light system.

- `png/` : the six slides, in posting order (upload these)
- `preview/contact-sheet.png` : all six together
- `preview/phone-size-390.png` : all six at 390 px wide, roughly phone size
- `source/carousel.html` : the one source file for every slide

## Rebuild

From the repo root: `node Brand_Assets/tools/build-launch-carousel.mjs`

The build renders the slides and the previews. It fails if a font or image does not load, or if any text or image leaves the safe margins (96 px sides, 96 px top, 100 px bottom).

## Assets used (referenced in place, never copied or modified)

- Logo: `Brand_Assets/ALVSolutions_Master_Logo/svg/alvsolutions-horizontal-light.svg`
- Fonts: Bricolage Grotesque and Instrument Sans, from `src/assets/fonts/`
- Screens: `src/assets/work/hacienda-grill-desktop.jpg` and `lucid-detailing-desktop.jpg`, cropped to the hero. Both are labelled "Concept Build".
- Lit bar and glow: the recipe in `src/styles/tokens.css`. The bar doubles as the slide progress (n of 6).

Because sources are referenced by relative path, rebuild from inside the repo. The PNGs themselves are self-contained.
