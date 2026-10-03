"""Hookah Drive - conjunto de icones (linha branca + amarelo da marca sobre preto).

Gera os WebP de categorias e produtos sem foto real. Cada arquivo leva o slug do
nome do produto, para o scripts/backfill_images.py vincular ao banco sozinho."""
import os, cairosvg
from PIL import Image
import io

BG, W, Y, G = "#141414", "#F4F1EA", "#FFD21F", "#4a4640"
SW = 11  # visual stroke width in final 512px space

# ---- primitives, local coords roughly -50..50 -------------------------------
P = {}
P["bowl"] = f'''
<path d="M-32 -26 H32 C32 12 18 24 0 24 C-18 24 -32 12 -32 -26 Z" fill="{Y}"/>
<path d="M-38 -26 H38"/>
<circle cx="-12" cy="-8" r="2.6" fill="{BG}" stroke="none"/><circle cx="12" cy="-8" r="2.6" fill="{BG}" stroke="none"/><circle cx="0" cy="6" r="2.6" fill="{BG}" stroke="none"/>
<path d="M0 24 V40 M-16 42 H16"/>'''
P["can"] = f'''
<rect x="-18" y="-40" width="36" height="80" rx="7"/>
<path d="M-18 -30 H18 M-18 30 H18"/>
<rect x="-18" y="-12" width="36" height="26" fill="{Y}" stroke="none"/>'''
P["bottle"] = f'''
<path d="M-6 -46 H6 V-36 C6 -30 20 -26 20 -10 V36 Q20 44 12 44 H-12 Q-20 44 -20 36 V-10 C-20 -26 -6 -30 -6 -36 Z"/>
<path d="M-6 -40 H6"/>
<rect x="-20" y="-6" width="40" height="24" fill="{Y}" stroke="none"/>'''
P["claws"] = f'''
<rect x="-18" y="-40" width="36" height="80" rx="7"/>
<path d="M-18 -30 H18 M-18 30 H18"/>
<path d="M-9 -22 L-5 4 L-10 24 M0 -22 L4 4 L-1 24 M9 -22 L13 4 L8 24" stroke="{Y}" stroke-width="5"/>'''
P["bolt"] = f'''
<rect x="-18" y="-40" width="36" height="80" rx="7"/>
<path d="M-18 -30 H18 M-18 30 H18"/>
<path d="M4 -20 L-8 4 H2 L-4 22 L10 -4 H0 Z" fill="{Y}" stroke="none"/>'''
P["box"] = f'''
<rect x="-30" y="-36" width="60" height="72" rx="5"/>
<path d="M-30 -20 H30"/>
<path d="M-10 6 H10 M0 -6 V18" stroke="{Y}" stroke-width="6"/>
<circle cx="0" cy="6" r="14" stroke="{Y}" stroke-width="4"/>'''
P["foil"] = f'''
<path d="M-30 -22 H24 M-30 22 H24"/>
<ellipse cx="24" cy="0" rx="12" ry="22"/>
<path d="M-30 -22 C-42 -22 -42 22 -30 22"/>
<path d="M-16 -8 H12 M-16 8 H12" stroke="{Y}" stroke-width="5"/>
<path d="M-8 22 C-8 34 4 36 14 42 H40" stroke="{Y}" stroke-width="5"/>'''
P["coal"] = f'''
<rect x="-34" y="-2" width="32" height="32" rx="6" fill="{G}"/>
<rect x="2" y="-2" width="32" height="32" rx="6" fill="{G}"/>
<rect x="-16" y="-34" width="32" height="32" rx="6" fill="{G}"/>
<path d="M-26 8 l8 -4 M10 8 l8 -4" stroke="{Y}" stroke-width="4"/>
<path d="M-34 -30 l-6 -6 M34 -30 l6 -6 M0 -44 V-50" stroke="{Y}" stroke-width="4"/>'''
P["flame"] = f'''
<path d="M2 -46 C22 -22 30 -8 30 6 C30 24 16 34 0 34 C-16 34 -30 24 -30 6 C-30 -6 -22 -14 -14 -24 C-12 -12 -6 -8 -2 -8 C-8 -24 -4 -36 2 -46 Z" fill="{Y}" stroke="none"/>'''
P["tongs"] = f'''
<path d="M-14 -44 L-2 4 L-26 44"/><path d="M14 -44 L2 4 L26 44"/>
<path d="M-14 -44 H-2 M14 -44 H2"/>
<circle cx="0" cy="4" r="6" fill="{Y}" stroke="none"/>'''
P["pipe"] = f'''
<g transform="rotate(-32)"><rect x="-44" y="-13" width="88" height="26" rx="13"/>
<rect x="14" y="-13" width="14" height="26" fill="{Y}" stroke="none"/><path d="M-44 0 H-60" /></g>'''
P["spark"] = f'''<path d="M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4 Z" fill="{Y}" stroke="none"/>'''
P["snow"] = f'''<path d="M0 -14 V14 M-12 -7 L12 7 M-12 7 L12 -7" stroke="{Y}" stroke-width="5"/>'''
P["plate"] = f'''
<path d="M-42 -6 L-32 -32 L-16 -12 L0 -36 L16 -12 L32 -32 L42 -6 C42 24 -42 24 -42 -6 Z"/>
<ellipse cx="0" cy="2" rx="16" ry="6" fill="{Y}" stroke="none"/>
<path d="M-24 28 H24"/>'''
P["vase"] = f'''
<path d="M-12 -44 H12 V-26 C34 -20 44 -6 44 14 C44 32 26 42 0 42 C-26 42 -44 32 -44 14 C-44 -6 -34 -20 -12 -26 Z"/>
<path d="M-40 16 C-28 8 -20 24 -8 16 C4 8 14 24 26 16 C32 12 38 14 40 16 V22 C40 34 24 40 0 40 C-24 40 -40 34 -40 22 Z" fill="{Y}" stroke="none"/>'''
P["cover"] = f'''
<path d="M-28 42 V-4 C-28 -34 -14 -42 0 -42 C14 -42 28 -34 28 -4 V42 Z"/>
<circle cx="-10" cy="-8" r="3" fill="{Y}" stroke="none"/><circle cx="10" cy="-8" r="3" fill="{Y}" stroke="none"/><circle cx="0" cy="6" r="3" fill="{Y}" stroke="none"/>
<path d="M28 -14 H40 Q48 -14 48 -6 V16 Q48 24 40 24 H28"/>
<path d="M-34 42 H34"/>'''
P["hose"] = f'''
<path d="M-42 26 C-42 -18 -6 -26 -6 4 C-6 36 30 34 34 -6"/>
<g transform="translate(36 -16) rotate(-70)"><rect x="-6" y="-12" width="12" height="30" rx="6" fill="{Y}" stroke="none"/></g>'''
P["plus"] = f'''
<circle cx="0" cy="0" r="40"/>
<path d="M0 -18 V18 M-18 0 H18" stroke="{Y}" stroke-width="9"/>'''
P["hookah"] = f'''
<path d="M-16 -46 H16 L10 -32 H-10 Z"/><path d="M-26 -32 H26"/>
<path d="M0 -32 V28"/><circle cx="0" cy="-6" r="6" fill="{Y}" stroke="none"/>
<path d="M-12 8 C-36 16 -38 34 -30 44 C-18 50 18 50 30 44 C38 34 36 16 12 8 Z"/>
<path d="M-33 30 C-20 24 -12 38 0 32 C12 26 20 38 33 30 L30 44 C18 50 -18 50 -30 44 Z" fill="{Y}" stroke="none"/>
<path d="M12 -14 C48 -16 54 14 42 30"/>
<g transform="translate(42 34) rotate(20)"><rect x="-5" y="0" width="10" height="16" rx="5" fill="{Y}" stroke="none"/></g>'''


def place(name, x, y, s):
    return f'<g transform="translate({x} {y}) scale({s})" stroke-width="{SW/s:.2f}">{P[name]}</g>'

def svg(body, bg=True):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'
            f'<rect width="512" height="512" fill="{BG}"/>'
            f'<g fill="none" stroke="{W}" stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>')

def one(name, s=3.1, dx=0, dy=0):
    return svg(place(name, 256+dx, 256+dy, s))

def many(items):
    return svg("".join(place(*i) for i in items))

C = 256
ICONS = {
 # categorias (512 px)
 "categorias/acessorios": one("hookah", 3.3),
 "categorias/adicionais": one("plus", 3.3),
 "categorias/bebidas": many([("bottle", 190, 262, 2.8), ("can", 330, 262, 2.8)]),
 "categorias/combos": many([("bowl", 160, 262, 1.9), ("can", 258, 258, 2.3), ("bottle", 354, 258, 2.3)]),
 "categorias/kits": many([("box", 160, 262, 2.6), ("coal", 350, 330, 1.7), ("foil", 340, 170, 1.7)]),
 # produtos (800 px) - nome do arquivo = slug do nome do produto
 "products/acessorios/aluminio": one("foil", 3.6),
 "products/acessorios/carvao": one("coal", 3.3, 0, 20),
 "products/acessorios/essencia": one("box"),
 "products/acessorios/kit-mangueira": one("hose", 4.0, 0, 10),
 "products/acessorios/pegador": one("tongs"),
 "products/acessorios/piteira-higienica": many([("pipe", 256, 270, 3.0), ("spark", 380, 150, 2.4)]),
 "products/acessorios/rosh-peca": one("bowl", 3.3),
 "products/acessorios/vaso": one("vase", 3.3),
 "products/adicionais/acender-carvao": many([("coal", 230, 300, 2.3), ("flame", 360, 190, 1.9)]),
 "products/adicionais/carvao": one("coal", 3.3, 0, 20),
 "products/adicionais/piteira-hydra-gelo": many([("pipe", 246, 290, 2.8), ("snow", 372, 150, 3.0)]),
 "products/bebidas/agua": one("bottle", 3.2),
 "products/bebidas/intake": one("bolt", 3.2),
 "products/bebidas/monster": one("claws", 3.2),
 "products/combos/combo-1": many([("bowl", 180, 262, 2.8), ("can", 340, 262, 2.8)]),
 "products/combos/combo-2": many([("bowl", 118, 270, 1.9), ("bowl", 256, 270, 1.9), ("bowl", 394, 270, 1.9)]),
 "products/combos/combo-3": many([("can", 118, 262, 2.1), ("can", 256, 262, 2.1), ("can", 394, 262, 2.1)]),
 "products/combos/combo-4": many([("bottle", 118, 262, 2.1), ("bottle", 256, 262, 2.1), ("bottle", 394, 262, 2.1)]),
 "products/kits/kit-o-basico": many([("box", 160, 262, 2.6), ("coal", 350, 330, 1.7), ("foil", 340, 170, 1.7)]),
 "products/kits/kit-o-completo": many([("box", 112, 190, 1.6), ("box", 256, 190, 1.6), ("box", 400, 190, 1.6),
                                      ("coal", 112, 370, 1.4), ("foil", 256, 380, 1.4), ("coal", 400, 370, 1.4)]),
}

if __name__ == "__main__":
    # Uso (a partir de frontend/):  python design/generate_icons.py public/images
    # Requer: pip install cairosvg pillow
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "public/images"
    for rel, svg_src in ICONS.items():
        px = 512 if rel.startswith("categorias/") else 800
        dst = os.path.join(out, rel + ".webp")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        png = cairosvg.svg2png(bytestring=svg_src.encode(), output_width=px, output_height=px)
        Image.open(io.BytesIO(png)).convert("RGB").save(dst, quality=88, method=6)
    print(len(ICONS), "icones gerados em", out)
