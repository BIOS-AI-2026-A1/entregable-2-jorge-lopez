"""Detección del tipo real de imagen por *magic bytes*, para la subida del logotipo.

Solo se admiten **PNG e ICO**. El tipo se decide por el contenido, nunca por la
extensión ni por el `Content-Type` que declara el cliente (ambos falsificables). Se
descarta SVG a propósito: al no aceptar vectores no hay superficie de SVG-con-script.
"""

from __future__ import annotations

# Tamaño máximo del logo. Es un singleton en la base (no crece con el contenido); el
# límite corta subidas desmesuradas.
MAX_LOGO_BYTES = 512 * 1024  # 512 KB

# Firmas de archivo (primeros bytes).
_PNG = b"\x89PNG\r\n\x1a\n"
# ICO: reservado=0x0000, tipo=0x0001 (0x0002 sería CUR, que no admitimos).
_ICO = b"\x00\x00\x01\x00"

MIME_PNG = "image/png"
MIME_ICO = "image/x-icon"


def detectar_mime_logo(datos: bytes) -> str | None:
    """Devuelve el MIME real (`image/png` o `image/x-icon`) o `None` si no es PNG/ICO."""
    if datos.startswith(_PNG):
        return MIME_PNG
    if datos.startswith(_ICO):
        return MIME_ICO
    return None
