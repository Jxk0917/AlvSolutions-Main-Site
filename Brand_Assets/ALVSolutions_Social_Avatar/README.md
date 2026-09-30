# ALVSolutions social avatar

The official ALVSolutions profile image. **One master for every platform** (Facebook, Instagram, Google Business Profile, LinkedIn and any other circular or square profile slot). There are no per-platform variants.

This is a social profile image treatment. It is separate from the transparent standalone-symbol logo exports in `../ALVSolutions_Master_Logo/`, which remain the symbol master and are not replaced by this.

## Construction

| | |
| --- | --- |
| Field | flat `#0B0B0B`, full square |
| Symbol | the locked ALV symbol, flat `#F2F1EE` |
| Symbol size | visible symbol width is **56%** of the square (560 of 1000 units) |
| Placement | centred: the symbol's ink box is centred on the canvas |
| Content | symbol only, no wordmark |
| Effects | none: no gradient, shadow, glow, border or lighting; no recolouring |

## Circular-crop safe

The farthest corner of the symbol sits at **78% of a circular crop's radius**, inside the 80% safe circle. The clearance between the symbol and the circle's edge is 22% of the radius (11% of the image width). Any platform's circular crop leaves the symbol whole. Checked clean at 128, 64, 40 and 32 px.

## Files

```
png/alvsolutions-avatar-2000.png   Master, 2000 x 2000
png/alvsolutions-avatar-1000.png
png/alvsolutions-avatar-512.png
png/alvsolutions-avatar-400.png
png/alvsolutions-avatar-320.png
svg/alvsolutions-avatar.svg        Vector source of the composition
```

The PNGs are opaque squares (no transparency), so every platform shows the same near-black field. Upload the largest size the platform accepts (the 1000 px or 2000 px file is fine for most); use the smaller sizes where a platform asks for an exact dimension.

## Never

- Do not add the wordmark, a border, a ring, a gradient, a glow or a shadow.
- Do not recolour the symbol or the field, and do not use client or project colours.
- Do not rescale the symbol or re-crop the image; upload the file as supplied and let the platform apply its circle.
- Do not stretch, rotate or skew it.

## Rebuild

`node Brand_Assets/tools/build-social-avatar.mjs` from the repo root. It reads the symbol from the locked master logo SVG (never editing its shapes) and regenerates `svg/` and `png/`, leaving this README alone.
