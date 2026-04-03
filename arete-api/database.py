import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Carga el .env en local (en Vercel las variables ya están inyectadas, no hace nada)
load_dotenv()

# En local usa SQLite; en Vercel/producción lee DATABASE_URL (Supabase PostgreSQL)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cms.db")

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # SQLite necesita check_same_thread=False para FastAPI
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL (Supabase) — sin parámetros extra
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
