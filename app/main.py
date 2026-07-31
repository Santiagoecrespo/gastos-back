"""
SplitWise — API entrypoint.

Boots the FastAPI application and creates database tables on startup.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine

# Import all models so Base.metadata knows about them
import app.models  # noqa: F401

# Routers
from app.api.auth import router as auth_router
from app.api.expenses import router as expenses_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup (temporary — will be replaced by Alembic migrations)."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="SplitWise API",
    description="Backend for a group expense-splitting application.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://gastos-back-production-e3ec.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ─────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(expenses_router, prefix="/api")


@app.get("/health", tags=["ops"])
async def health_check():
    """Lightweight health probe."""
    return {"status": "ok"}


# ── Dev entrypoint ────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
