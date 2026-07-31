"""Autenticación del administrador: login (JWT) y logout."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import admin_actual
from app.models import AdminUser
from app.schemas import LoginIn, TokenOut
from app.security import crear_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Hash de descarte para igualar el tiempo de respuesta cuando el correo no existe.
# Sin esto, argon2 solo se ejecuta con correos válidos y la diferencia de latencia
# (decenas de milisegundos frente a menos de uno) delata qué correos son de
# administrador, anulando el mensaje genérico de más abajo.
_HASH_DESCARTE = hash_password("comparacion-de-descarte")


@router.post("/login", response_model=TokenOut)
def login(datos: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    admin = db.query(AdminUser).filter(AdminUser.email == datos.email).first()
    hash_a_verificar = admin.password_hash if admin is not None else _HASH_DESCARTE
    correcta = verify_password(hash_a_verificar, datos.password)

    # Mensaje genérico: no revela si falló el correo o la contraseña.
    if admin is None or not correcta:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos")
    return TokenOut(access_token=crear_token(admin.email))


@router.post("/logout")
def logout(_: AdminUser = Depends(admin_actual)) -> dict:
    # JWT en cliente: el logout lo realiza el cliente descartando el token.
    # El endpoint existe por simetría y para poder revocar en el futuro.
    return {"detail": "Sesión cerrada"}
