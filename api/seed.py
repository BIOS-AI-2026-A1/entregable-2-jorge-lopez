"""Carga el contenido exportado (`api/seed_data/{es,pt}.json`) en la base de datos
y siembra el administrador inicial.

Requiere el esquema ya migrado (`alembic upgrade head`) y el JSON ya exportado
(`node app/scripts/exportar-datos.mjs`). Es idempotente: vacía las tablas de
contenido y las vuelve a poblar; el administrador se crea solo si no existe.

Uso desde `api/`:  python seed.py
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from app.config import get_settings
from app.database import SessionLocal
from app.models import (
    AdminUser,
    Articulo,
    ArticuloRelacionado,
    ArticuloTraduccion,
    Categoria,
    CategoriaTraduccion,
    Conversacion,
    Metrica,
    PreguntaSinResolver,
)
from app.security import hash_password
from app.servicios import IDIOMAS

SEED_DIR = Path(__file__).parent / "seed_data"


def _cargar_idiomas() -> dict[str, dict]:
    datos = {}
    for idioma in IDIOMAS:
        ruta = SEED_DIR / f"{idioma}.json"
        if not ruta.exists():
            raise SystemExit(
                f"Falta {ruta}. Ejecuta primero: node app/scripts/exportar-datos.mjs"
            )
        datos[idioma] = json.loads(ruta.read_text(encoding="utf-8"))
    return datos


def _por_id(datos: dict[str, dict], clave: str) -> dict[str, dict]:
    """Indexa por id la lista `clave` de cada idioma: `{idioma: {id: item}}`.

    El JSON llega como listas paralelas por idioma. El español marca el orden y
    el conjunto de ids; el resto se busca por id, que es lo único estable entre
    idiomas (slug, título y textos cambian).
    """
    return {idioma: {item["id"]: item for item in datos[idioma][clave]} for idioma in IDIOMAS}


def _vaciar(db) -> None:
    for modelo in (
        ArticuloRelacionado,
        ArticuloTraduccion,
        Articulo,
        CategoriaTraduccion,
        Categoria,
        PreguntaSinResolver,
        Conversacion,
        Metrica,
    ):
        db.query(modelo).delete()


def _sembrar_categorias(db, datos: dict[str, dict]) -> None:
    base = datos["es"]["categorias"]
    por_id = _por_id(datos, "categorias")
    for orden, cat in enumerate(base):
        db.add(Categoria(id=cat["id"], icono=cat["icono"], fondo=cat["fondo"], texto=cat["texto"], orden=orden))
        for idioma in IDIOMAS:
            t = por_id[idioma][cat["id"]]
            db.add(CategoriaTraduccion(categoria_id=cat["id"], idioma=idioma, slug=t["slug"], nombre=t["nombre"]))


def _sembrar_articulos(db, datos: dict[str, dict]) -> None:
    base = datos["es"]["articulos"]
    por_id = _por_id(datos, "articulos")
    for orden, art in enumerate(base):
        db.add(
            Articulo(
                id=art["id"],
                categoria_id=art["categoria"],
                actualizado=date.fromisoformat(art["actualizado"]),
                minutos_lectura=art["minutosLectura"],
                destacado=art["destacado"],
                orden=orden,
            )
        )
        for i, rid in enumerate(art.get("relacionados", [])):
            db.add(ArticuloRelacionado(articulo_id=art["id"], relacionado_id=rid, orden=i))
        for idioma in IDIOMAS:
            t = por_id[idioma][art["id"]]
            db.add(
                ArticuloTraduccion(
                    articulo_id=art["id"],
                    idioma=idioma,
                    slug=t["slug"],
                    titulo=t["titulo"],
                    parrafos=t["parrafos"],
                    how_to=t["howTo"],
                    nota=t.get("nota"),
                    faq=t["faq"],
                )
            )


def _sembrar_panel(db, datos: dict[str, dict]) -> None:
    for idioma in IDIOMAS:
        contenido = datos[idioma]
        for orden, p in enumerate(contenido["preguntasSinResolver"]):
            db.add(
                PreguntaSinResolver(
                    idioma=idioma,
                    pregunta=p["pregunta"],
                    veces=p["veces"],
                    similitud=p["similitud"],
                    fecha=date.fromisoformat(p["fecha"]),
                    estado=p["estado"],
                    orden=orden,
                )
            )
        db.add(Conversacion(idioma=idioma, mensajes=contenido["conversacion"]))
        for orden, m in enumerate(contenido["metricas"]):
            db.add(Metrica(idioma=idioma, clave=m["clave"], valor=m["valor"], orden=orden))


LONGITUD_MINIMA_CONTRASENA = 12
CONTRASENAS_PROHIBIDAS = {"admin", "password", "cambia-esta-contrasena", "contrasena"}


def _sembrar_admin(db) -> None:
    s = get_settings()

    # El seed es la única vía por la que entra la contraseña del administrador:
    # si aquí pasa una trivial, queda para siempre en la base.
    if s.admin_password.lower() in CONTRASENAS_PROHIBIDAS or len(s.admin_password) < LONGITUD_MINIMA_CONTRASENA:
        raise SystemExit(
            f"ADMIN_PASSWORD es demasiado débil (mínimo {LONGITUD_MINIMA_CONTRASENA} caracteres, "
            'sin valores obvios). Generar una:  python -c "import secrets; print(secrets.token_urlsafe(32))"'
        )

    if db.query(AdminUser).filter(AdminUser.email == s.admin_email).first() is not None:
        # Ojo: no se recrea. Para rotar la contraseña hay que borrar la fila antes.
        print(f"Administrador {s.admin_email} ya existe; no se recrea.")
        return
    db.add(AdminUser(email=s.admin_email, password_hash=hash_password(s.admin_password)))
    print(f"Administrador {s.admin_email} creado.")


def main() -> None:
    datos = _cargar_idiomas()
    db = SessionLocal()
    try:
        _vaciar(db)
        _sembrar_categorias(db, datos)
        # Fuerza el INSERT de categorías antes que el de artículos: no hay relación ORM
        # entre `Articulo` y `Categoria`, así que sin este flush el orden de volcado no
        # está garantizado y PostgreSQL rechaza la FK `articulos.categoria_id`.
        db.flush()
        _sembrar_articulos(db, datos)
        _sembrar_panel(db, datos)
        _sembrar_admin(db)
        db.commit()
        n = len(datos["es"]["articulos"])
        print(f"Seed completado: {n} artículos en {', '.join(IDIOMAS)}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
