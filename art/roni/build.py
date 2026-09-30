"""Builds Ronit's illustrations (hero, avatar, entry scene) from roni.svg.

Usage: python3 art/roni/build.py   # writes public/illustrations/roni-*.svg
"""
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / "public" / "illustrations"

src = (HERE / "roni.svg").read_text()
defs = src[src.index("<defs>"): src.index("</defs>") + len("</defs>")]
body_start = src.index('<g filter="url(#drop)">')
inner = src[body_start + len('<g filter="url(#drop)">'): src.rindex("</g>")]

def section(name_start, name_end=None):
    a = inner.index(f"<!-- {name_start}")
    b = inner.index(f"<!-- {name_end}") if name_end else len(inner)
    return inner[a:b]

hair_back = section("hair, back", "body")
body = section("body", "neck")
from_neck = section("neck")

NOTE = '''<g transform="translate({x} {y}) rotate({r}) scale({s})">
  <path d="M8 -30 L28 -36 L28 -4" fill="none" stroke="{c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="2" cy="-2" rx="8" ry="6.5" transform="rotate(-20 2 -2)" fill="{c}"/>
  <ellipse cx="22" cy="-6" rx="8" ry="6.5" transform="rotate(-20 22 -6)" fill="{c}"/>
  <ellipse cx="0" cy="-5" rx="3" ry="1.8" transform="rotate(-20 0 -5)" fill="#fff" opacity=".55"/>
</g>'''

SPARKLE = '<path transform="translate({x} {y}) scale({s})" d="M0 -12 C2 -3 3 -2 12 0 C3 2 2 3 0 12 C-2 3 -3 2 -12 0 C-3 -2 -2 -3 0 -12Z" fill="{c}"/>'


def svg(view_box, content, extra_defs=""):
    x, y, w, h = view_box
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" width="{w}" height="{h}">\n'
        f"  {defs.replace('</defs>', extra_defs + '</defs>')}\n{content}\n</svg>\n"
    )


def character(body_part):
    return f'  <g filter="url(#drop)">\n    {hair_back}{body_part}{from_neck}  </g>'


# ---------- hero: listening, with floating notes ----------
notes = "\n".join([
    NOTE.format(x=50, y=150, r=-12, s=1.1, c="#e98a6f"),
    NOTE.format(x=330, y=120, r=10, s=0.9, c="#8dbb9a"),
    SPARKLE.format(x=78, y=92, s=0.9, c="#ffd479"),
    SPARKLE.format(x=350, y=210, s=0.7, c="#ffffff"),
])
hero = svg((20, 44, 360, 376), character(body) + "\n" + notes)

# ---------- avatar: head and shoulders ----------
avatar = svg((82, 54, 236, 236), character(body))

# ---------- entry scene: arms folded on the card edge, lavender cardigan ----------
lavender = {
    "#b9d8c0": "#dccbf4", "#8dbb9a": "#b9a0e6", "#6c9c7b": "#9479cf", "#7fae8d": "#a98bdc",
}
scene_defs = defs
for old, new in lavender.items():
    scene_defs = scene_defs.replace(old, new)

arms = '''<!-- arms resting on the card -->
    <g>
      <path d="M40 420 C44 360 84 322 152 314 L248 314 C316 322 356 360 360 420Z" fill="url(#cardigan)"/>
      <path d="M162 314 L238 314 L222 370 C212 384 188 384 178 370Z" fill="url(#top)"/>
      <rect x="30" y="378" width="186" height="46" rx="23" fill="url(#cardigan)"/>
      <rect x="184" y="378" width="186" height="46" rx="23" fill="url(#cardigan)"/>
      <path d="M52 386 C110 380 160 380 206 386" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M194 386 C240 380 290 380 348 386" stroke="#fff" stroke-opacity=".35" stroke-width="5" stroke-linecap="round" fill="none"/>
      <ellipse cx="172" cy="398" rx="30" ry="19" fill="url(#skin)"/>
      <ellipse cx="228" cy="400" rx="30" ry="19" fill="url(#skin)"/>
      <path d="M158 394 h24 M160 402 h22 M218 396 h24 M220 404 h22" stroke="#d6906f" stroke-width="2" stroke-linecap="round" opacity=".6"/>
      <circle cx="238" cy="392" r="5" fill="url(#gold)" opacity=".95"/>
    </g>
    '''

def bubble(x, y, s, fill, glyph):
    return (f'<g transform="translate({x} {y}) scale({s})" filter="url(#drop)">'
            f'<rect x="-34" y="-34" width="68" height="68" rx="22" fill="{fill}"/>'
            f'<rect x="-26" y="-30" width="40" height="14" rx="7" fill="#fff" opacity=".35"/>{glyph}</g>')

lock = ('<path d="M-12 -4 v-8 a12 12 0 0 1 24 0 v8" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>'
        '<rect x="-17" y="-4" width="34" height="26" rx="8" fill="#fff"/><circle cx="0" cy="8" r="4" fill="#b9a0e6"/>')
heart = '<path d="M0 16 C-24 0 -20 -18 -8 -18 C-3 -18 0 -14 0 -11 C0 -14 3 -18 8 -18 C20 -18 24 0 0 16Z" fill="#fff"/>'
note_glyph = ('<path d="M-6 12 V-14 L14 -18 V8" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>'
              '<circle cx="-11" cy="12" r="7" fill="#fff"/><circle cx="9" cy="8" r="7" fill="#fff"/>')
decor = "\n".join([
    bubble(-40, 150, 1.0, "#c9b2f0", lock),
    bubble(440, 130, 0.95, "#f5a9c4", heart),
    bubble(-20, 300, 0.8, "#f7c0a8", note_glyph),
    SPARKLE.format(x=40, y=70, s=1.1, c="#fff3c4"),
    SPARKLE.format(x=380, y=260, s=0.9, c="#fff3c4"),
    SPARKLE.format(x=470, y=40, s=0.6, c="#ffffff"),
])
scene_char = f'  <g filter="url(#drop)">\n    {hair_back}{arms}{from_neck}  </g>'
scene = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-110 20 620 404" width="620" height="404">\n'
    f"  {scene_defs}\n{decor}\n{scene_char}\n</svg>\n"
)

for name, content in {"roni-hero.svg": hero, "roni-avatar.svg": avatar, "roni-gate.svg": scene}.items():
    (OUT / name).write_text(re.sub(r"\n\s*\n", "\n", content))
