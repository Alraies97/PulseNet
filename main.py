from fastapi import FastAPI
from contextlib import asynccontextmanager
from sqlmodel import SQLModel
from app.database import engine
from app.routers import users, posts, roles, likes
from scalar_fastapi import get_scalar_api_reference,Theme
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostsMiddleware 



@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    yield

app = FastAPI(lifespan=lifespan,docs_url=None)

# Define the explicit frontend production domain and local domains
origins = [
    "https://pulse-net-snowy.vercel.app",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex="https://.*\\.vercel\\.app", # Supports all Vercel previews dynamically
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trust proxy headers for Railway reverse proxy
app.add_middleware(
    TrustedHostsMiddleware,
    allowed_hosts=["*"]  # Allow all hosts since Railway handles SSL termination
)

app.include_router(users.router)
app.include_router(posts.router)
app.include_router(roles.router)
app.include_router(likes.router)


@app.get("/docs", include_in_schema=False)
async def scalar_api_reference():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title=app.title,
        theme=Theme.PURPLE
    )

@app.get("/")
def root():
    return {"message": "Welcome to my API"}
