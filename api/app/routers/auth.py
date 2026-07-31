"""Autenticación del administrador: login (JWT) y logout."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import admin_actual
from app.models import AdminUser
from app.schemas import LoginIn, TokenOut
from app.security import crear_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(datos: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    admin = db.query(AdminUser).filter(AdminUser.email == datos.email).first()
    # Mensaje genérico: no revela si falló el correo o la contraseña.
    if admin is None or not verify_password(admin.password_hash, datos.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos")
    return TokenOut(access_token=crear_token(admin.email))


@router.post("/logout")
def logout(_: AdminUser = Depends(admin_actual)) -> dict:
    # JWT en cliente: el logout lo realiza el cliente descartando el token.
    # El endpoint existe por simetría y para poder revocar en el futuro.
    return {"detail": "Sesión cerrada"}
