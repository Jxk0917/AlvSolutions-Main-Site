# ALVSolutions master logo

The finished logo files. Copy this whole folder to Google Drive; nothing here needs a font, a build tool or the website. The build tooling lives outside it, in `Brand_Assets/tools/`.

The identity is the ALV symbol plus the ALVSolutions wordmark, in neutral ink only. It is never orange, never blue, never a client colour.

## Which file do I use?

**Primary logo: the horizontal lockup, in the Screen Light inks.** Use it by default.

| Where it sits | Logo ink | File |
| --- | --- | --- |
| On a dark background | Light `#F2F1EE` | `svg/alvsolutions-horizontal-light.svg` |
| On a light background | Dark `#0B0B0B` | `svg/alvsolutions-horizontal-dark.svg` |

"Light" and "dark" name the **logo's own ink**, not the background. Light logo goes on dark; dark logo goes on light.

| Version | Use it for | Files |
| --- | --- | --- |
| Horizontal lockup (primary) | Headers, documents, email signatures, invoices, decks, anywhere it fits | `alvsolutions-horizontal-*` |
| Stacked lockup | Square or narrow spaces where the horizontal lockup would be too small to read | `alvsolutions-stacked-*` |
| Symbol alone | Avatars, app and profile icons, stamps, embroidery, small marks. Use a full lockup wherever the company should be named. | `alvsolutions-symbol-*` |

The stacked lockup keeps the wordmark whole and puts the symbol above it, centred, at about 34% of the wordmark's width.

## Production monochrome (utility files, not a palette)

Pure white `#FFFFFF` and pure black `#000000` versions, in the `production` folders and named `...-production-white` / `...-production-black`.

They exist only for print and vendor compatibility, embroidery and sign production, one-colour reproduction, and places where the exact Screen Light inks are impractical. They are **not** a second brand palette and never replace the primary Screen Light files. If you can use a primary file, use it.

## Folders

```
svg/                       Vector masters, primary (Screen Light) inks
svg/production/            Vector masters, pure white and pure black
png/<version>/             Transparent PNGs, primary inks
png/production/<version>/  Transparent PNGs, pure white and pure black
                           <version> = horizontal | stacked | symbol
                           Horizontal and stacked: 500 / 1000 / 2000 px wide.
                           Symbol: square, 500 / 1000 / 2000 px.
```

Files are named `alvsolutions-<version>-<light|dark|production-white|production-black>[-<width>].<ext>`. Prefer the SVG whenever the software accepts it (print, signage, large formats, editing). Use the PNG closest to, and not smaller than, the size it will appear.

## File bounds and padding

**SVG masters** are trimmed to the artwork: the horizontal and stacked SVGs have no margin (just 0.1 unit so edge antialiasing is never cut). Place them and they measure and align exactly as drawn. The standalone symbol SVG deliberately keeps a square canvas (128 units around a 100-unit drawing), so it drops into square slots such as avatars and app icons without being re-centred.

**PNG exports** include a modest transparent margin so nothing clips when placed or cropped:

| PNG | Margin on each side |
| --- | --- |
| Horizontal lockup | 0.4 em of the lockup's type size, about 4.4% of the width (22 px on the 500 px PNG) |
| Stacked lockup | the same 0.4 em, about 5.9% of the width (29 px on the 500 px PNG) |
| Symbol | square canvas: about 15% of the width left and right, and 16% top and bottom (73 px and 78 px on the 500 px PNG) |

**This padding is file padding. It is not the required clear space.** Keep clear space around the artwork yourself (below). A placed PNG sits slightly inside the edge you align it to; compensate when precise alignment matters.

## Clear space

Keep an empty margin around the logo of at least **one third of the ALV symbol's height** on every side. Nothing else (text, image edges, other logos) enters it. The height is that of the symbol as drawn in the lockup you are using.

## Minimum size

| Version | Digital | Print (practical guidance) |
| --- | --- | --- |
| Standalone symbol | 20 px tall | about 5 mm tall |
| Horizontal lockup | 132 px wide | about 35 mm wide |
| Stacked lockup | 90 px wide | about 25 mm wide |

The 20 px and 132 px digital minimums are the original Dark Precision rules. The stacked minimum was set when the stacked lockup was approved, and the print sizes are approximate conversions at 96 px per inch, offered as practical guidance rather than specified rules. Sizes are of the visible artwork, not the PNG canvas.

Below these sizes, use the symbol alone. (The website favicon is a separate, tighter-cropped version of the symbol made for 16 px tabs.)

## Never

- **Do not stretch or squash.** Scale proportionally only (hold Shift, or lock the aspect ratio).
- **Do not recolor.** Use one of the supplied inks. No gradients, no tints, no brand or accent colours.
- **Client and project colours must never recolor the ALVSolutions identity.** A client's palette belongs to the client's work; the logo stays neutral on it.
- **Do not rotate or skew it.**
- **Do not add glow, shadow, outline, bevel or any other effect.**
- Do not retype the wordmark in another font, and do not separate or rearrange the symbol and wordmark. Use the supplied lockups.
- Do not put the logo where it loses contrast: light on light, dark on dark, or over busy photography. Use a plain area, or the other ink.

## Notes

- The wordmark is Archivo, weight 640, converted to outlines, so it looks identical everywhere. Archivo is used for the logo only; it is not a website or document font.
- The symbol and horizontal lockup were checked pixel by pixel against the website's live identity when these files were built.
- To rebuild: `node Brand_Assets/tools/build-logo-system.mjs` from the repo root. It regenerates `svg/` and `png/` (and leaves this README alone) and fails if the outlines stop matching the live identity.
