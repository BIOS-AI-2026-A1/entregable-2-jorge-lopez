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
    # Vida del refresh token opaco (cookie httpOnly) con el que el BFF renueva el
    # access token en silencio. Rota en cada uso; se revoca en logout y ante
    # reutilización. Ver `app.sesiones`.
    refresh_expire_days: int = 14

    # Administrador inicial que crea el seed. La contraseña, por el mismo motivo
    # que el secreto, es obligatoria y no tiene valor por defecto. El seed lo crea
    # como Administrador (nivel 3): es el primer usuario y quien gestiona a los demás.
    admin_email: str = "admin@centro-ayuda.local"
    admin_password: str

    # SuperAdmin inicial (nivel 4, transversal a los portales). Opcional a propósito:
    # sin `superadmin_password` el seed no lo crea (ni crea el portal de plataforma), y
    # el entorno de desarrollo single-portal sigue funcionando igual. Cuando se define,
    # el seed provisiona el/los SuperAdmin. Es un secreto: no tiene valor por defecto.
    superadmin_email: str = "superadmin@centro-ayuda.local"
    superadmin_password: str | None = None

    # Valor inicial del campo [Empresa] (nombre de marca global). Editable después
    # desde el panel por un usuario Administrador; el seed solo lo usa para la primera fila.
    empresa_inicial: str = "[Empresa]"

    # Dominio base de los subdominios de portal (`<slug>.tuapp.com`). Solo se usa para
    # extraer el slug cuando el host ES un subdominio suyo; los dominios propios y el
    # desarrollo (`localhost`) se resuelven por coincidencia exacta en la tabla
    # `dominios`. Configurable por entorno para no fijar el dominio de producción aquí.
    base_domain: str = "tuapp.com"

    # Clave simétrica (Fernet) con la que se cifran en reposo las claves de API de
    # los proveedores de IA que introduce el Administrador. Opcional a propósito: sin ella la
    # API arranca igual y todo funciona salvo guardar/usar claves de IA (traducción),
    # que avisa de que falta configurarla. Generar una propia:
    #   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    clave_cifrado_ia: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
