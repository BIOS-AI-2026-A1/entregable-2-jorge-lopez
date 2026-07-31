"""Fixtures de test: SQLite en memoria, sin Postgres ni migración pgvector."""

from __future__ import annotations

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401  (registra las tablas en Base.metadata)
from app.database import Base, get_db
from app.main import app
from app.models import (
    AdminUser,
    Categoria,
    CategoriaTraduccion,
    Conversacion,
    Metrica,
    PreguntaSinResolver,
)
from app.security import hash_password

ADMIN_EMAIL = "admin@test.local"
ADMIN_PASSWORD = "secreto-de-prueba"


def _sembrar_minimo(db) -> None:
    db.add(Categoria(id="cuenta", icono="usuario", fondo="bg-indigo-50", texto="text-indigo-700", orden=0))
    db.add(CategoriaTraduccion(categoria_id="cuenta", idioma="es", slug="cuenta", nombre="Cuenta"))
    db.add(CategoriaTraduccion(categoria_id="cuenta", idioma="pt", slug="conta", nombre="Conta"))
    db.add(AdminUser(email=ADMIN_EMAIL, password_hash=hash_password(ADMIN_PASSWORD)))
    db.add(
        PreguntaSinResolver(
            idioma="es", pregunta="¿Cómo cambio mi contraseña?", veces=10,
            similitud=0.5, fecha=date(2026, 7, 20), estado="nueva", orden=0,
        )
    )
    for idioma in ("es", "pt"):
        db.add(Conversacion(idioma=idioma, mensajes=[{"autor": "usuario", "texto": "hola"}]))
        db.add(Metrica(idioma=idioma, clave="sinResolver", valor="34", orden=0))
    db.commit()


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = TestingSessionLocal()
    _sembrar_minimo(db)
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(engine)


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def token(client) -> str:
    r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def auth(token) -> dict:
    return {"Authorization": f"Bearer {token}"}


def articulo_valido(articulo_id: str = "nuevo-articulo") -> dict:
    """Payload de artículo bilingüe completo para los tests."""
    trad = lambda slug, titulo: {
        "slug": slug,
        "titulo": titulo,
        "parrafos": ["Un párrafo."],
        "howTo": {"titulo": "Pasos", "pasos": [{"titulo": "Paso 1", "descripcion": "Hazlo."}]},
        "nota": None,
        "faq": [{"pregunta": "¿Y?", "respuesta": "Pues eso."}],
    }
    return {
        "id": articulo_id,
        "categoria": "cuenta",
        "actualizado": "2026-07-25",
        "minutosLectura": 2,
        "destacado": True,
        "relacionados": [],
        "es": trad("nuevo-articulo", "Nuevo artículo"),
        "pt": trad("novo-artigo", "Novo artigo"),
    }
