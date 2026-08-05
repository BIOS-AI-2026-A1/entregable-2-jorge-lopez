"""Dependencias de FastAPI.

`admin_actual` exige una sesión válida de un usuario activo (Nivel 2 o superior).
`requiere_nivel(minimo)` la envuelve para exigir además un nivel mínimo, aplicando
la jerarquía de acceso en el servidor.
"""

from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdminUser, NivelAcceso
from app.security import decodificar_token

_bearer = HTTPBearer(auto_error=False)


def admin_actual(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> AdminUser:
    if cred is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No autenticado")
    email = decodificar_token(cred.credentials)
    if email is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada")
    admin = db.query(AdminUser).filter(AdminUser.email == email).first()
    if admin is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida")
    # Un usuario desactivado tiene el mismo acceso que uno sin sesión: la
    # comprobación se hace en cada petición (no en el token), así revocar el
    # acceso surte efecto de inmediato aunque el JWT siga sin expirar.
    if not admin.activo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida")
    return admin


def requiere_nivel(minimo: NivelAcceso) -> Callable[..., AdminUser]:
    """Fábrica de dependencias: exige que la sesión tenga al menos `minimo`.

    La jerarquía es un entero ordenado, así que Root (3) satisface cualquier
    requisito de Standard (2). Nivel insuficiente responde 403 (autenticado pero
    sin permiso), distinto del 401 de `admin_actual` (sin sesión válida).
    """

    def dependencia(admin: AdminUser = Depends(admin_actual)) -> AdminUser:
        if admin.nivel < minimo:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado para este recurso")
        return admin

    return dependencia
