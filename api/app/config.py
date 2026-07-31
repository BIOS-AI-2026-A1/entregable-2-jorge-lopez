"""Configuración leída del entorno. Los secretos nunca viven en el repo."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://helpcenter:helpcenter@localhost:5432/helpcenter"

    jwt_secret: str = "inseguro-solo-para-desarrollo"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # Administrador inicial que crea el seed.
    admin_email: str = "admin@centro-ayuda.local"
    admin_password: str = "cambia-esta-contrasena"


@lru_cache
def get_settings() -> Settings:
    return Settings()
