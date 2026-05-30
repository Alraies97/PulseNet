# Project0 Backend API

A **production-ready RESTful API** built with **FastAPI**, designed for scalable user management, content publishing, role-based access, and social interactions. The backend follows modern Python backend practices with typed schemas, JWT authentication, versioned migrations, and cloud-native database deployment.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [FastAPI](https://fastapi.tiangolo.com/) |
| **ORM / Models** | [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic) |
| **Database (Production)** | [PostgreSQL](https://www.postgresql.org/) hosted on [Neon](https://neon.tech/) |
| **Database (Local Dev)** | SQLite (via Alembic configuration) |
| **Migrations** | [Alembic](https://alembic.sqlalchemy.org/) |
| **Configuration** | [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) |
| **Authentication** | JWT (PyJWT) + OAuth2 Password Bearer |
| **Password Hashing** | bcrypt / Passlib |
| **API Docs UI** | [Scalar](https://github.com/scalar/scalar) via `scalar-fastapi` |
| **ASGI Server** | [Uvicorn](https://www.uvicorn.org/) |
| **Deployment** | [Railway](https://railway.app/) |

---

## Key Features

- **JWT Authentication** — Secure login flow with Bearer token support for protected routes
- **Full CRUD Operations** — Users, roles, and posts with validation via Pydantic/SQLModel schemas
- **Role Management** — Many-to-many relationship between users and roles
- **Post Engagement** — Authenticated post creation and like/unlike toggle endpoints
- **Database Migrations** — Alembic-managed schema evolution (e.g. adding `views` to posts)
- **Dynamic Configuration** — Environment-driven settings via `pydantic-settings`
- **Environment Variable Insulation** — Secrets and database URLs loaded from `.env`, never hardcoded in source
- **CORS Enabled** — Cross-origin requests supported for frontend integration
- **Interactive API Documentation** — Beautiful Scalar docs served at `/docs`

---

## Architecture & Project Structure

```
PPython9.1/
├── main.py                          # FastAPI application entry point & CORS setup
├── requirements.txt                 # Python dependencies
├── alembic.ini                      # Alembic configuration (local SQLite URL)
├── README.md
│
├── alembic/                         # Database migration environment
│   ├── env.py                       # Alembic runtime config & metadata binding
│   ├── script.py.mako               # Migration file template
│   └── versions/
│       ├── 9f064a3f3d6b_initial_migration_create_tables.py
│       └── 637eeb97e799_add_views_tp_post.py
│
└── app/
    ├── config.py                    # Pydantic Settings (DATABASE_URL, SECRET_KEY)
    ├── database.py                  # SQLModel engine & session dependency
    ├── dependcies.py                # JWT auth & get_current_user dependency
    ├── models.py                    # SQLModel table & schema definitions
    ├── utils.py                     # Password hashing & JWT token utilities
    ├── .env                         # Local environment variables (not committed)
    └── routers/
        ├── users.py                 # User CRUD + login
        ├── posts.py                 # Post creation & listing
        ├── roles.py                 # Role management
        └── likes.py                 # Post like/unlike toggle
```

### Application Layers

```
┌─────────────────────────────────────────────────────┐
│                   Client (Web / Mobile)             │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP + JWT Bearer Token
┌──────────────────────▼──────────────────────────────┐
│  FastAPI Routers  (users, posts, roles, likes)      │
├─────────────────────────────────────────────────────┤
│  Dependencies     (get_session, get_current_user)   │
├─────────────────────────────────────────────────────┤
│  Services         (hash_password, create_access_token)│
├─────────────────────────────────────────────────────┤
│  SQLModel ORM     (User, Post, Role, PostLike)      │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
   SQLite (local)              PostgreSQL (Neon)
   via Alembic                  via DATABASE_URL
```

---

## Database Architecture

The project supports a **seamless transition from local development to cloud production**:

| Environment | Database | Configuration |
|-------------|----------|---------------|
| **Local Development** | SQLite (`database.db`) | Defined in `alembic.ini` → `sqlalchemy.url = sqlite:///database.db` |
| **Production** | PostgreSQL on **Neon** | Injected via `DATABASE_URL` in environment variables |

### Entity Relationship Overview

- **User** ↔ **Role** — Many-to-many through `UserRoleLink`
- **User** → **Post** — One-to-many (each post belongs to one user)
- **PostLike** — Composite primary key (`user_id`, `post_id`) for unique likes per user/post pair
- **Post** — Includes a `views` counter (added via Alembic migration)

### Migration Workflow

Alembic tracks schema changes independently of the application runtime:

```bash
# Generate a new migration after model changes
alembic revision --autogenerate -m "describe your change"

# Apply all pending migrations
alembic upgrade head

# Roll back one revision
alembic downgrade -1
```

In production, point Alembic and the application at the same Neon PostgreSQL connection string via `DATABASE_URL`.

---

## Installation & Setup

### Prerequisites

- Python 3.11+ (tested on 3.13)
- `pip` and `venv`
- A [Neon](https://neon.tech/) PostgreSQL database (for production)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Alraies97/Project0-backend.git
cd Project0-backend
```

### 2. Create & Activate Virtual Environment

```bash
python -m venv .venv

# Linux / macOS
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file inside the `app/` directory:

```env
DATABASE_URL=postgresql://<user>:<password>@<neon-host>/<dbname>?sslmode=require
SECRET_KEY=<your-strong-random-secret-key>
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string from your Neon dashboard |
| `SECRET_KEY` | Secret used to sign JWT access tokens — use a long, random value in production |

> **Security note:** Never commit `.env` to version control. Ensure `.env` is listed in `.gitignore`.

### 5. Run Database Migrations

For **local SQLite** development:

```bash
alembic upgrade head
```

For **Neon PostgreSQL**, set `DATABASE_URL` in your environment (or update `alembic.ini`) before running migrations:

```bash
export DATABASE_URL="postgresql://<user>:<password>@<neon-host>/<dbname>?sslmode=require"
alembic upgrade head
```

### 6. Start the Development Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- **Root:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **API Docs (Scalar):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **OpenAPI JSON:** [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)

---

## API Documentation

Interactive API documentation is powered by **Scalar** and replaces the default Swagger UI.

| Environment | Documentation URL |
|-------------|-------------------|
| **Local** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |
| **Production (Railway)** | [https://project0-backend-production.up.railway.app/docs](https://project0-backend-production.up.railway.app/docs) |

Use the docs to explore endpoints, inspect request/response schemas, and test authenticated routes with a Bearer token obtained from the login endpoint.

---

## API Endpoints Overview

### Users — `/api/v1/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/users` | No | List all users |
| `POST` | `/api/v1/users` | No | Register a new user |
| `GET` | `/api/v1/users/{user_id}` | No | Get user by ID |
| `PUT` | `/api/v1/users/{user_id}` | No | Update user |
| `DELETE` | `/api/v1/users/{user_id}` | No | Delete user |
| `POST` | `/api/v1/users/login` | No | Login & receive JWT token |

### Posts — `/api/v1/posts`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/posts` | **Yes** | Create a post (authenticated user) |
| `GET` | `/api/v1/posts` | No | List all posts |

### Roles — `/api/v1/roles`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/roles` | No | Create a role |
| `GET` | `/api/v1/roles` | No | List all roles |

### Likes — `/api/v1/likes`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/likes/{post_id}` | **Yes** | Toggle like on a post |

---

## Authentication Flow

1. **Register** a user via `POST /api/v1/users`
2. **Login** via `POST /api/v1/users/login` with form data:
   - `username` → user's `first_name`
   - `password` → user's password
3. Copy the `access_token` from the response
4. Send it as a header on protected routes:

```
Authorization: Bearer <access_token>
```

Protected routes include post creation and the like toggle endpoint.

---

## Deployment (Railway + Neon)

1. Create a **Neon** PostgreSQL project and copy the connection string
2. Deploy the repository to **Railway**
3. Set environment variables in Railway:
   - `DATABASE_URL` → Neon PostgreSQL URL
   - `SECRET_KEY` → strong random secret
4. Run migrations against the production database:

```bash
alembic upgrade head
```

5. Start command for Railway:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Live production URLs:**

- **API:** [https://project0-backend-production.up.railway.app](https://project0-backend-production.up.railway.app)
- **Docs:** [https://project0-backend-production.up.railway.app/docs](https://project0-backend-production.up.railway.app/docs)

---

## License

This project is part of the **Project0** backend initiative. All rights reserved.
