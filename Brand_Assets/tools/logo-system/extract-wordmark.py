"""Turns the live logo face into outlines for the master SVGs.

  python Brand_Assets/tools/logo-system/extract-wordmark.py

Reads the exact file the website loads (src/assets/fonts/Archivo-Variable.woff2,
weight axis only), pins it to weight 640, and writes the outline of each letter
in "ALVSolutions" to wordmark-outline.json (font units, y up, 1000 per em).
Needs: pip install fonttools brotli. The build script places the letters using
the positions Chrome gives the live text, so kerning is the browser's own.
"""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FONT = ROOT / "src/assets/fonts/Archivo-Variable.woff2"
WORD = "ALVSolutions"
WGHT = 640

font = instantiateVariableFont(TTFont(FONT), {"wght": WGHT})
cmap = font.getBestCmap()
gs = font.getGlyphSet()
out = {"unitsPerEm": font["head"].unitsPerEm, "weight": WGHT, "word": WORD,
       "ascent": font["hhea"].ascent, "descent": font["hhea"].descent,
       "capHeight": font["OS/2"].sCapHeight, "glyphs": {}}
for ch in sorted(set(WORD)):
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
    gs[name].draw(pen)
    out["glyphs"][ch] = {"glyph": name, "advance": gs[name].width, "d": pen.getCommands()}
(HERE / "wordmark-outline.json").write_text(json.dumps(out, indent=1))
print("wrote wordmark-outline.json", out["unitsPerEm"], "upm, cap", out["capHeight"])
