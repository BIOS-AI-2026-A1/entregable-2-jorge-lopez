"""Modelos SQLAlchemy. Patrón bilingüe: entidad estable + traducciones por idioma.

Los campos anidados (`parrafos`, `how_to`, `faq`, `mensajes`) usan un tipo JSON portable:
JSONB en PostgreSQL (producción) y JSON en SQLite (tests en memoria).
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# JSONB en Postgres, JSON en el resto (permite testear en SQLite sin pgvector).
JsonType = JSON().with_variant(JSONB(), "postgresql")


class Categoria(Base):
    __tablename__ = "categorias"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    icono: Mapped[str] = mapped_column(String)
    fondo: Mapped[str] = mapped_column(String)
    texto: Mapped[str] = mapped_column(String)
    orden: Mapped[int] = mapped_column(Integer, default=0)

    traducciones: Mapped[list[CategoriaTraduccion]] = relationship(
        back_populates="categoria", cascade="all, delete-orphan"
    )


class CategoriaTraduccion(Base):
    __tablename__ = "categoria_traducciones"

    categoria_id: Mapped[str] = mapped_column(
        ForeignKey("categorias.id", ondelete="CASCADE"), primary_key=True
    )
    idioma: Mapped[str] = mapped_column(String, primary_key=True)
    slug: Mapped[str] = mapped_column(String)
    nombre: Mapped[str] = mapped_column(String)

    categoria: Mapped[Categoria] = relationship(back_populates="traducciones")


class Articulo(Base):
    __tablename__ = "articulos"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    categoria_id: Mapped[str] = mapped_column(ForeignKey("categorias.id"))
    actualizado: Mapped[date] = mapped_column(Date)
    minutos_lectura: Mapped[int] = mapped_column(Integer)
    destacado: Mapped[bool] = mapped_column(Boolean, default=False)
    orden: Mapped[int] = mapped_column(Integer, default=0)

    traducciones: Mapped[list[ArticuloTraduccion]] = relationship(
        back_populates="articulo", cascade="all, delete-orphan"
    )
    relacionados: Mapped[list[ArticuloRelacionado]] = relationship(
        back_populates="articulo",
        cascade="all, delete-orphan",
        order_by="ArticuloRelacionado.orden",
    )


class ArticuloTraduccion(Base):
    __tablename__ = "articulo_traducciones"

    articulo_id: Mapped[str] = mapped_column(
        ForeignKey("articulos.id", ondelete="CASCADE"), primary_key=True
    )
    idioma: Mapped[str] = mapped_column(String, primary_key=True)
    slug: Mapped[str] = mapped_column(String)
    titulo: Mapped[str] = mapped_column(String)
    parrafos: Mapped[list] = mapped_column(JsonType)
    how_to: Mapped[dict] = mapped_column(JsonType)
    nota: Mapped[str | None] = mapped_column(String, nullable=True)
    faq: Mapped[list] = mapped_column(JsonType)

    articulo: Mapped[Articulo] = relationship(back_populates="traducciones")


class ArticuloRelacionado(Base):
    __tablename__ = "articulo_relacionados"

    articulo_id: Mapped[str] = mapped_column(
        ForeignKey("articulos.id", ondelete="CASCADE"), primary_key=True
    )
    relacionado_id: Mapped[str] = mapped_column(String, primary_key=True)
    orden: Mapped[int] = mapped_column(Integer, default=0)

    articulo: Mapped[Articulo] = relationship(back_populates="relacionados")


class PreguntaSinResolver(Base):
    __tablename__ = "preguntas_sin_resolver"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    idioma: Mapped[str] = mapped_column(String)
    pregunta: Mapped[str] = mapped_column(String)
    veces: Mapped[int] = mapped_column(Integer)
    similitud: Mapped[float] = mapped_column(Float)
    fecha: Mapped[date] = mapped_column(Date)
    estado: Mapped[str] = mapped_column(String)
    orden: Mapped[int] = mapped_column(Integer, default=0)


class Conversacion(Base):
    __tablename__ = "conversaciones"

    idioma: Mapped[str] = mapped_column(String, primary_key=True)
    mensajes: Mapped[list] = mapped_column(JsonType)


class Metrica(Base):
    __tablename__ = "metricas"

    idioma: Mapped[str] = mapped_column(String, primary_key=True)
    clave: Mapped[str] = mapped_column(String, primary_key=True)
    valor: Mapped[str] = mapped_column(String)
    orden: Mapped[int] = mapped_column(Integer, default=0)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
