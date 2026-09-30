# ALVSolutions social banners

Finished cover and header images for the ALVSolutions social profiles, plus one platform-independent master. Copy this whole folder to Google Drive; nothing here needs a font or a build tool (those live in `Brand_Assets/tools/`).

Pair every banner with the social avatar in `../ALVSolutions_Social_Avatar/`. Instagram has no profile cover, so there is no Instagram banner.

## Which file goes where

| Platform | Upload this | Size | Fallback / notes |
| --- | --- | --- | --- |
| Facebook Page cover | `facebook/alvsolutions-facebook-cover-1702x630.png` | 1702 x 630 | `...-851x315.png` is Meta's exact recommended size (69 KB) |
| LinkedIn Page cover | `linkedin/alvsolutions-linkedin-cover-3024x512.png` | 3024 x 512 | `...-1512x256.png` is LinkedIn's recommended size |
| X (Twitter) header | `x/alvsolutions-x-header-3000x1000.png` | 3000 x 1000 | `...-1500x500.png` is X's recommended size |
| YouTube channel banner | `youtube/alvsolutions-youtube-banner-2560x1440.png` | 2560 x 1440 | one size covers TV, desktop, tablet and mobile |
| Any other use, or re-cutting | `master/alvsolutions-banner-master-6400x2400.png` | 6400 x 2400 | 3200 x 1200 also supplied. Not for direct upload |

The larger Facebook, LinkedIn and X files are the same image at 2x for sharp display; each platform scales it down. All are opaque PNGs (PNG keeps the logo and text crisp) and under each platform's file-size limit.

## Art direction (locked: Option A, placement A1)

A quiet, precise dark room in the Screen Light system. One row of identity, with one lit bar beneath it:

- the locked horizontal ALVSolutions lockup, a thin vertical divider, and the line **"Built around your business."**
- a single light-blue bar directly beneath the row, the same width as the row, as the lit foundation
- a faint wall wash, and one dim horizon line with a faint floor below it
- nothing else: no extra copy, prices, services, URLs or decoration

The logo and the headline stay neutral (`#F2F1EE` logo, the headline lit from `#F2F1EE` to a slightly darker neutral). The blue belongs to the environmental light, never to the identity or the type. Field: `#0B0B0B`.

## The Screen Light bar (the website's own recipe)

Reused unchanged from the website's `src/styles/tokens.css`:

- colour `--sl-bar`: `oklch(0.97 0.03 245)`
- glow `--sl-bar-glow`: `0 0 6px oklch(0.92 0.08 245 / 0.85), 0 0 18px 1px oklch(0.8 0.15 245 / 0.42), 0 0 44px 4px oklch(0.74 0.15 245 / 0.14)`
- drawn 2 px tall with a 2 px radius, as the website's progress bar (`.wiz-fill`) is

Every length in the recipe is multiplied by the same scale factor (3 x the composition scale), so the bar's colour, glow layers and proportions never change; only its size follows the artwork. Do not intensify, recolour or add bars.

## Assets used

- Logo: `Brand_Assets/ALVSolutions_Master_Logo/svg/alvsolutions-horizontal-light.svg` (the locked master, used as is)
- Headline: Bricolage Grotesque, weight 620, optical size fixed at 92, -0.04em tracking (the website's headline face and treatment)

## How each platform version is made

The composition is defined once and re-composed for each platform: it is scaled and centred in that platform's conservative safe area, not stretched. The logo, divider, headline and bar keep exactly the same proportions to each other everywhere. The row uses 84% of the safe width, and the composition sits centred in the safe area, so any crop keeps it balanced.

| Platform | Base canvas | Safe area used (base px) | Kept clear |
| --- | --- | --- | --- |
| Facebook | 851 x 315 | 559 x 275, centred (x 146 to 705) | bottom left, for the profile picture |
| LinkedIn | 1512 x 256 | 1000 x 176, centred | bottom left, for the logo |
| X | 1500 x 500 | 1000 x 360, centred | left 20% and the lower left, for the profile picture |
| YouTube | 2560 x 1440 | 1546 x 423, centred | (the avatar sits below the banner) |
| Master | 3200 x 1200 | 2000 x 640, centred | bottom left |

## Where the dimensions come from

- **Facebook:** 851 x 315, sRGB, under 100 KB, PNG better for logos and text, about 40 px profile overlap on mobile: Facebook Help ("Page cover photo"). Display crops of about 820 x 312 (desktop) and 640 x 360 (mobile), and the resulting central 559-wide safe strip, come from third-party size guides.
- **LinkedIn:** cover 1512 x 256, 3 MB maximum, PNG or JPEG, keep key details centred and away from the edges (especially the lower right): LinkedIn Help, "Image specifications for your LinkedIn Pages and Career Pages". Older guides quote 1128 x 191; that is superseded.
- **X:** 1500 x 500 (PNG, JPG or GIF): X Help Center, "How to customize your profile". The central 1260 x 420 area and the bottom-left avatar overlap come from third-party guides.
- **YouTube:** recommended at least 2560 x 1440, 6 MB maximum, safe area for text and logos 1235 x 338 at the 2048 x 1152 minimum (1544 x 423 at 2560 x 1440, the widely quoted 1546 x 423): YouTube Help, channel banner guidance.

Platforms change these numbers from time to time. Re-check before a redesign.

## Crop notes

- **Facebook:** desktop shows about 820 x 312; mobile shows a narrower centre crop, so the row sits in the central 559 px. The profile picture overlaps the lower left.
- **LinkedIn:** the cover is a very wide, short strip and may be trimmed horizontally or vertically. The row sits in the middle band and survives centre crops as tight as about 4:1; the logo overlaps the lower left.
- **X:** about 60 px can be trimmed top and bottom on some displays; the profile picture covers the lower left.
- **YouTube:** TV shows the whole 16:9 image; desktop shows a wide strip, tablet a narrower one, mobile only the centre 1546 x 423. The whole composition sits in that centre area, so all devices show it. Above and below the strip is deliberately quiet room.

## Never

- Do not stretch, re-crop or re-scale the image to another shape; upload the matching file.
- Do not recolour the logo or headline, change the blue, intensify its glow, or add bars, copy or decoration.
- Do not recolour with client or project colours.

## Rebuild

`node Brand_Assets/tools/build-social-banners.mjs` from the repo root regenerates `master/`, `facebook/`, `linkedin/`, `x/` and `youtube/` (and leaves this README alone). The build is deterministic: repeated runs give byte-identical files.
