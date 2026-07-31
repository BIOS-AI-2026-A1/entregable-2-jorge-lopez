"""Configuración leída del entorno. Los secretos nunca viven en el repo."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Ruta absoluta al .env: una ruta relativa dependería del directorio desde el que
# se arranque el proceso, y un .env no encontrado degradaría la configuración en
# silencio en lugar de fallar.
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    # 127.0.0.1 y no localhost: el contenedor publica solo en IPv4 (ver
    # docker-compose.yml) y en Windows `localhost` resuelve antes a ::1, lo que
    # añade más de dos minutos de espera por cada conexión antes de reintentar.
    database_url: str = "postgresql+psycopg://helpcenter:helpcenter@127.0.0.1:5432/helpcenter"

    # Sin valor por defecto a propósito. Un secreto de firma embebido en el código
    # permitiría a cualquiera que lea el repositorio forjar un token de
    # administrador válido: si falta la variable, la aplicación no debe arrancar.
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # Administrador inicial que crea el seed. La contraseña, por el mismo motivo
    # que el secreto, es obligatoria y no tiene valor por defecto.
    admin_email: str = "admin@centro-ayuda.local"
    admin_password: str


@lru_cache
def get_settings() -> Settings:
    return Settings()
