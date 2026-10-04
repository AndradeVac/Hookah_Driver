import base64
import binascii
from io import BytesIO

from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field, field_validator

MAX_IMAGE_BYTES = 256 * 1024
MAX_IMAGE_DIMENSION = 1200


class ProductImageInput(BaseModel):
    image_base64: str | None = Field(default=None, max_length=349528)

    @field_validator("image_base64")
    @classmethod
    def validate_image(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            content = base64.b64decode(value, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError("Foto inválida. Selecione a imagem novamente.") from exc
        if not content or len(content) > MAX_IMAGE_BYTES:
            raise ValueError("A foto otimizada deve ter no máximo 256 KB.")
        try:
            with Image.open(BytesIO(content)) as image:
                if image.format != "WEBP" or image.is_animated:
                    raise ValueError("Envie uma foto WebP estática.")
                if max(image.size) > MAX_IMAGE_DIMENSION:
                    raise ValueError("A foto deve ter no máximo 1200 pixels por lado.")
                image.load()
                output = BytesIO()
                image.convert("RGB").save(output, format="WEBP", quality=80, method=4)
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
            raise ValueError("Não foi possível ler a foto. Selecione outra imagem.") from exc
        sanitized = output.getvalue()
        if len(sanitized) > MAX_IMAGE_BYTES:
            raise ValueError("A foto otimizada deve ter no máximo 256 KB.")
        return base64.b64encode(sanitized).decode("ascii")
