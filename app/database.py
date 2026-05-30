from sqlmodel import create_engine, Session
from app.config import settings

# Use Neon PostgreSQL in production; falls back via DATABASE_URL in .env
engine = create_engine(settings.DATABASE_URL, echo=False)


def get_session():
    with Session(engine) as session:
        yield session
