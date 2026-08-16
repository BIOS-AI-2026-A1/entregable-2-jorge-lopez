"""Fixtures de test: SQLite en memoria, sin Postgres ni migración pgvector."""

from __future__ import annotations

import os

# Configuración de test, fijada ANTES de importar `app.*`: `jwt_secret` y
# `admin_password` ya no tienen valor por defecto, y la variable de entorno tiene
# prioridad sobre el .env. Así los tests no dependen del .env de cada máquina.
# El secreto pasa de 32 bytes: por debajo, PyJWT avisa en cada firma (RFC 7518 §3.2).
os.environ.setdefault("JWT_SECRET", "secreto-de-pruebas-largo-y-sin-ningun-valor-real")
os.environ.setdefault("ADMIN_PASSWORD", "contrasena-solo-para-los-tests")

# Clave de cifrado válida (Fernet) para los tests de configuración de IA. Se genera
# al vuelo: no es un secreto real y cada corrida usa una distinta.
from cryptography.fernet import Fernet  # noqa: E402

os.environ.setdefault("CLAVE_CIFRADO_IA", Fernet.generate_key().decode())

from datetime import date  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, event  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app import models  # noqa: F401,E402  (registra las tablas en Base.metadata)
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import (  # noqa: E402
    AdminUser,
    Ajustes,
    Categoria,
    CategoriaTraduccion,
    Conversacion,
    Metrica,
    NivelAcceso,
    PreguntaSinResolver,
)
from app.security import hash_password  # noqa: E402
from app.servicios import AJUSTES_ID  # noqa: E402

# El administrador principal es Administrador (como el que siembra el seed): puede todo.
ADMIN_EMAIL = "admin@test.local"
ADMIN_PASSWORD = "secreto-de-prueba"

# Un segundo usuario, de Nivel 2 (Editor), para las pruebas de autorización.
EDITOR_EMAIL = "editor@test.local"
EDITOR_PASSWORD = "secreto-de-prueba-2"

EMPRESA_INICIAL = "Acme"


def _sembrar_minimo(db) -> None:
    db.add(Categoria(id="cuenta", icono="usuario", fondo="bg-indigo-50", texto="text-indigo-700", orden=0))
    db.add(CategoriaTraduccion(categoria_id="cuenta", idioma="es", slug="cuenta", nombre="Cuenta"))
    db.add(CategoriaTraduccion(categoria_id="cuenta", idioma="pt", slug="conta", nombre="Conta"))
    db.add(
        AdminUser(
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            nivel=NivelAcceso.ADMINISTRADOR.value,
            activo=True,
        )
    )
    db.add(
        AdminUser(
            email=EDITOR_EMAIL,
            password_hash=hash_password(EDITOR_PASSWORD),
            nivel=NivelAcceso.EDITOR.value,
            activo=True,
        )
    )
    db.add(Ajustes(id=AJUSTES_ID, empresa=EMPRESA_INICIAL))
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

    # SQLite no aplica las claves foráneas salvo que se active por conexión. Se
    # enciende para que el cascade y las FK diferibles se comporten como en
    # PostgreSQL (la base real), y los tests de integridad sean fieles.
    @event.listens_for(engine, "connect")
    def _activar_fk(dbapi_conn, _record):  # noqa: ANN001
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

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


@pytest.fixture
def editor_token(client) -> str:
    r = client.post("/api/auth/login", json={"email": EDITOR_EMAIL, "password": EDITOR_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def editor_auth(editor_token) -> dict:
    return {"Authorization": f"Bearer {editor_token}"}


def categoria_valida(categoria_id: str = "facturacion") -> dict:
    """Payload de categoría bilingüe completo para los tests."""
    return {
        "id": categoria_id,
        "icono": "recibo",
        "fondo": "bg-emerald-50",
        "texto": "text-emerald-700",
        "orden": 3,
        "es": {"slug": "facturacion", "nombre": "Facturación"},
        "pt": {"slug": "faturacao", "nombre": "Faturação"},
    }


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
