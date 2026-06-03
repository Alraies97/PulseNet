from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env from app/ or project root
_env_dir = Path(__file__).resolve().parent
_root_dir = _env_dir.parent


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    SECRET_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=(_env_dir / ".env", _root_dir / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
