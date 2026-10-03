"""Converte fotos para o padrão de imagens do Hookah Drive (ver IMAGENS.md).

Padrão: a imagem é centralizada num quadrado (sem cortar nem distorcer) e salva
em WebP SIZE x SIZE. Transparência é preservada; sem transparência, o espaço
extra é preenchido de branco. Ideal para foto de produto em fundo liso.

--crop: recorta um quadrado da foto (sem bordas). Ideal para fotos de cena.
        --focus 0..1 escolhe a posição horizontal do recorte (0.5 = centro).
--size: lado em pixels (padrão 800; categorias e marcas usam 512).

Uso (em frontend/; precisa `pip install pillow`):
    python design/optimize_photo.py foto.png public/images/products/bebidas/agua.webp
    python design/optimize_photo.py cena.jpg public/images/products/bebidas/coca.webp --crop --focus 0.4
    python design/optimize_photo.py pasta-de-fotos/ public/images/essencias/ziggy/
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageOps

SIZE = 800
QUALITY = 82
RASTER_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".jfif"}


def optimize(source: Path, target: Path, size: int = SIZE, crop: bool = False, focus: float = 0.5) -> Path:
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        has_alpha = image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)
        image = image.convert("RGBA" if has_alpha else "RGB")

        if crop:
            side = min(image.size)
            left = round((image.width - side) * min(max(focus, 0.0), 1.0))
            top = (image.height - side) // 2
            canvas = image.crop((left, top, left + side, top + side)).resize((size, size), Image.Resampling.LANCZOS)
        else:
            scale = size / max(image.size)
            image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
            background = (0, 0, 0, 0) if has_alpha else (255, 255, 255)
            canvas = Image.new(image.mode, (size, size), background)
            canvas.paste(image, ((size - image.width) // 2, (size - image.height) // 2))

    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, "WEBP", quality=QUALITY, method=6)
    return target


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    parser.add_argument("--size", type=int, default=SIZE)
    parser.add_argument("--crop", action="store_true", help="recorta um quadrado em vez de adicionar bordas")
    parser.add_argument("--focus", type=float, default=0.5, help="posição horizontal do recorte (0 a 1)")
    args = parser.parse_args(argv)

    if args.source.is_dir():
        files = sorted(p for p in args.source.iterdir() if p.suffix.lower() in RASTER_EXTS)
        pairs = [(f, args.target / f"{f.stem.lower()}.webp") for f in files]
    else:
        pairs = [(args.source, args.target)]
    for src, dst in pairs:
        optimize(src, dst, size=args.size, crop=args.crop, focus=args.focus)
        print(f"{src} -> {dst} ({dst.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
