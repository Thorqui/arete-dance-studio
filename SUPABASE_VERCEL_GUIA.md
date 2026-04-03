# 🚀 Guía de Producción: Base de Datos Supabase y Despliegue en Vercel

## 1. Migración a Supabase (PostgreSQL)

Actualmente Arete usa `SQLite` (`cms.db`) para el desarrollo rápido local. Supabase utiliza **PostgreSQL**. A continuación tienes el script SQL exacto que mapea la estructura de Python (SQLAlchemy) a Supabase.

### 🛠️ Pasos en Supabase:
1. Crea un proyecto nuevo en Supabase.
2. Ve al **SQL Editor** (menú izquierdo).
3. Pega este código completo y dale a **RUN**:

```sql
-- 1. Tabla de Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'student',
    name VARCHAR NOT NULL
);

-- 2. Tabla del CMS (Textos, Hero, Configuración)
CREATE TABLE cms_sections (
    id SERIAL PRIMARY KEY,
    slug VARCHAR UNIQUE NOT NULL,
    content JSONB NOT NULL
);

-- 3. Citas / Clases Puntuales
CREATE TABLE class_sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_spots INTEGER DEFAULT 20,
    available_spots INTEGER DEFAULT 20,
    target_role VARCHAR DEFAULT 'general'
);

-- 4. Reservas de las Clases Puntuales
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    class_session_id INTEGER REFERENCES class_sessions(id) ON DELETE CASCADE,
    status VARCHAR DEFAULT 'active'
);

-- 5. Grupos Regulares Fijos (Fase 5)
CREATE TABLE class_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    schedule_description VARCHAR NOT NULL,
    max_students INTEGER DEFAULT 20
);

-- 6. Matrículas a los Grupos (Enrollments)
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES class_groups(id) ON DELETE CASCADE
);

-- 7. Chat Bidireccional (Fase 6)
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 🔌 Conectar Python a Supabase
Una vez creado, en Supabase ve a **Project Settings -> Database**, coge tu URI de conexión (Connection String).
En el archivo `database.py` de tu FastAPI, cambiaremos el motor a Postgres instalando su driver (`pip install psycopg2-binary`):
```python
import os
from sqlalchemy import create_engine

# Leerá la variable si está en Vercel, sino usará SQLite en local
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cms.db")

# Postgres no usa check_same_thread
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Para psycopg2 / Postgres en Vercel -> Supabase
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
```

---

## 2. Despliegue de la API FastAPI en Vercel

Vercel está diseñado mágicamente para Frontend (tu Angular PWA), pero permite usar un Backend en Python gracias a las "Serverless Functions" si se lo configuramos bien.

### ¿Qué necesitas tener listo en tu carpeta `arete-api`?

1. **`requirements.txt` completo**:
   Asegúrate de ejecutar en consola:
   ```bash
   pip freeze > requirements.txt
   ```
   *Debe incluir `fastapi`, `uvicorn`, `sqlalchemy`, y crucialmente `psycopg2-binary` para leer Supabase.*

2. **Crear archivo `vercel.json`**:
   Debes crear un archivo llamado `vercel.json` en la raíz de tu backend (`arete-api/vercel.json`) con este contenido. Esto le dice a Vercel que tu Python no es una web estática, sino una API que ejecuta `main.py`:
   ```json
   {
     "builds": [
       {
         "src": "main.py",
         "use": "@vercel/python"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "main.py"
       }
     ]
   }
   ```

3. **Subir a GitHub y conectar Vercel**:
   - Sube tu repositorio `arete-api` a GitHub.
   - Entra en Vercel, pincha en **Add New -> Project**, y elige tu repo de GitHub.
   - En la sección **Environment Variables** (variables de entorno), tienes que añadir tu `DATABASE_URL` pegando el enlace de conexión de Supabase (el que empieza por `postgresql://...`).
   - Pincha **Deploy**.

¡Y listo! Vercel leerá tu `vercel.json`, instalará las dependencias en una nube aislada de Python, leerá el enlace a tu base de datos de Supabase e iluminará el proyecto. Cuando Vercel te dé tu dominio mágico (ej: `https://arete-api.vercel.app`), lo cambiaremos en las llamadas HTTP de tu Frontend de Angular.
