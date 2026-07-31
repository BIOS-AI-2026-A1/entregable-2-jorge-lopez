"""Lógica de ensamblado del contenido y escritura de artículos, compartida por los routers."""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.models import (
    Articulo,
    ArticuloRelacionado,
    ArticuloTraduccion,
    Categoria,
    Conversacion,
    Metrica,
    PreguntaSinResolver,
)

IDIOMAS = ("es", "pt")


def _traduccion(entidad, idioma: str):
    return next((t for t in entidad.traducciones if t.idioma == idioma), None)


def ensamblar_contenido(db: Session, idioma: str) -> dict:
    """Devuelve un `ContenidoIdioma` para el idioma, espejo de `obtenerContenido(idioma)`."""
    categorias = []
    for c in db.query(Categoria).order_by(Categoria.orden).all():
        tr = _traduccion(c, idioma)
        if tr is None:
            continue
        categorias.append(
            {"id": c.id, "slug": tr.slug, "nombre": tr.nombre, "icono": c.icono, "fondo": c.fondo, "texto": c.texto}
        )

    articulos = []
    for a in db.query(Articulo).order_by(Articulo.orden).all():
        tr = _traduccion(a, idioma)
        if tr is None:
            continue
        articulos.append(
            {
                "id": a.id,
                "slug": tr.slug,
                "titulo": tr.titulo,
                "categoria": a.categoria_id,
                "actualizado": a.actualizado.isoformat(),
                "minutosLectura": a.minutos_lectura,
                "destacado": a.destacado,
                "parrafos": tr.parrafos,
                "howTo": tr.how_to,
                "nota": tr.nota,
                "faq": tr.faq,
                "relacionados": [r.relacionado_id for r in a.relacionados],
            }
        )

    conv = db.query(Conversacion).filter(Conversacion.idioma == idioma).first()
    conversacion = conv.mensajes if conv else []

    metricas = [
        {"clave": m.clave, "valor": m.valor}
        for m in db.query(Metrica).filter(Metrica.idioma == idioma).order_by(Metrica.orden).all()
    ]

    # `preguntasSinResolver` NO viaja aquí: es el texto literal de lo que escriben
    # las personas usuarias y puede contener datos personales. Se sirve solo por
    # `/api/admin/preguntas-sin-resolver`, tras `Depends(admin_actual)`.
    return {
        "categorias": categorias,
        "articulos": articulos,
        "conversacion": conversacion,
        "metricas": metricas,
    }


def articulo_a_admin_dict(a: Articulo) -> dict:
    """Serializa un artículo con sus dos idiomas para editarlo en el panel."""

    def trad_dict(idioma: str) -> dict:
        t = _traduccion(a, idioma)
        return {
            "slug": t.slug,
            "titulo": t.titulo,
            "parrafos": t.parrafos,
            "howTo": t.how_to,
            "nota": t.nota,
            "faq": t.faq,
        }

    return {
        "id": a.id,
        "categoria": a.categoria_id,
        "actualizado": a.actualizado.isoformat(),
        "minutosLectura": a.minutos_lectura,
        "destacado": a.destacado,
        "relacionados": [r.relacionado_id for r in a.relacionados],
        "es": trad_dict("es"),
        "pt": trad_dict("pt"),
    }


def pregunta_a_dict(p: PreguntaSinResolver) -> dict:
    """Serializa una pregunta sin resolver para el panel interno."""
    return {
        "id": p.id,
        "idioma": p.idioma,
        "pregunta": p.pregunta,
        "veces": p.veces,
        "similitud": p.similitud,
        # ISO, para el atributo `datetime` de `<time>` en el panel.
        "fecha": p.fecha.isoformat(),
        "estado": p.estado,
    }


def aplicar_datos_articulo(a: Articulo, datos, *, incluir_id: bool) -> None:
    """Vuelca los campos de un `ArticuloIn`/`ArticuloUpdateIn` en la entidad ORM."""
    if incluir_id:
        a.id = datos.id
    a.categoria_id = datos.categoria
    a.actualizado = date.fromisoformat(datos.actualizado)
    a.minutos_lectura = datos.minutosLectura
    a.destacado = datos.destacado

    a.relacionados = [
        ArticuloRelacionado(relacionado_id=rid, orden=i) for i, rid in enumerate(datos.relacionados)
    ]

    a.traducciones = []
    for idioma in IDIOMAS:
        t = getattr(datos, idioma)
        a.traducciones.append(
            ArticuloTraduccion(
                idioma=idioma,
                slug=t.slug,
                titulo=t.titulo,
                parrafos=t.parrafos,
                how_to=t.howTo.model_dump(),
                nota=t.nota,
                faq=[f.model_dump() for f in t.faq],
            )
        )
