"""Login y protección de las rutas de administración."""

from __future__ import annotations

from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD


def test_login_valido_devuelve_token(client):
    r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_login_invalido_es_generico(client):
    r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": "incorrecta"})
    assert r.status_code == 401
    # El mensaje no revela si falló el correo o la contraseña.
    assert "contraseña" in r.json()["detail"].lower()


def test_admin_sin_token_rechazado(client):
    r = client.get("/api/admin/articulos")
    assert r.status_code == 401


def test_admin_con_token_invalido_rechazado(client):
    r = client.get("/api/admin/articulos", headers={"Authorization": "Bearer basura"})
    assert r.status_code == 401
