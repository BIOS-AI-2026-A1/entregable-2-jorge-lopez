"""Hash de contraseñas (argon2) y emisión/verificación de JWT."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.config import get_settings

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def crear_token(subject: str) -> str:
    s = get_settings()
    payload = {
        "sub": subject,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=s.jwt_expire_minutes),
    }
    return jwt.encode(payload, s.jwt_secret, algorithm=s.jwt_algorithm)


def decodificar_token(token: str) -> str | None:
    s = get_settings()
    try:
        payload = jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except jwt.PyJWTError:
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None


# --- Refresh tokens opacos -------------------------------------------------
#
# El refresh token NO es un JWT: es un valor aleatorio opaco. Se entrega en claro
# al cliente (cookie httpOnly) pero en la base solo se guarda su hash SHA-256, de
# modo que una fuga de la base no permite reutilizar sesiones. Al ser de un solo
# uso (rota en cada renovación), no necesita el coste de argon2.


def generar_refresh_token() -> str:
    """Devuelve un refresh token opaco de 256 bits, seguro para URL/cookie."""
    return secrets.token_urlsafe(32)


def hash_refresh(token: str) -> str:
    """Hash con el que se busca y almacena el refresh token (nunca el valor en claro)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
