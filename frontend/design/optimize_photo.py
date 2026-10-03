"""Converte fotos para o padrão de imagens do Hookah Drive (ver IMAGENS.md).

A imagem é centralizada num quadrado (sem cortar nem distorcer), redimensionada
para SIZE x SIZE e salva em WebP. Transparência é preservada; sem transparência,
o espaço extra é preenchido de branco.

Uso (em frontend/; precisa `pip install pillow`):
    python design/optimize_photo.py foto.png public/images/products/bebidas/agua.webp
    python design/optimize_photo.py pasta-de-fotos/ public/images/essencias/ziggy/
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageOps

SIZE = 800
QUALITY = 82
RASTER_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".jfif"}


def optimize(source: Path, target: Path, size: int = SIZE) -> Path:
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        has_alpha = image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)
        image = image.convert("RGBA" if has_alpha else "RGB")
        image.thumbnail((size, size), Image.Resampling.LANCZOS)

        background = (0, 0, 0, 0) if has_alpha else (255, 255, 255)
        canvas = Image.new(image.mode, (size, size), background)
        canvas.paste(image, ((size - image.width) // 2, (size - image.height) // 2))

    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, "WEBP", quality=QUALITY, method=6)
    return target


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 1
    source, target = Path(argv[0]), Path(argv[1])
    if source.is_dir():
        files = sorted(p for p in source.iterdir() if p.suffix.lower() in RASTER_EXTS)
        pairs = [(f, target / f"{f.stem.lower()}.webp") for f in files]
    else:
        pairs = [(source, target)]
    for src, dst in pairs:
        optimize(src, dst)
        print(f"{src} -> {dst} ({dst.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
