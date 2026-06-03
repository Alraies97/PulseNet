from fastapi import FastAPI
from contextlib import asynccontextmanager
from sqlmodel import SQLModel
from app.database import engine
from app.routers import users, posts, roles, likes
from scalar_fastapi import get_scalar_api_reference,Theme
from fastapi.middleware.cors import CORSMiddleware 



@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    yield

app = FastAPI(lifespan=lifespan,docs_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://pulse-net-snowy.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
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
