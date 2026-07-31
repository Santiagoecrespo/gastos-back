"""
SplitWise — API entrypoint.

Boots the FastAPI application and creates database tables on startup.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy import inspect as sa_inspect

from app.core.database import Base, engine

# Import all models so Base.metadata knows about them
import app.models  # noqa: F401

# Routers
from app.api.auth import router as auth_router
from app.api.expenses import router as expenses_router
from app.api.invite import router as invite_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup and run lightweight column migrations."""
    Base.metadata.create_all(bind=engine)
    # Migration: add invite_token to groups if missing (safe to re-run)
    with engine.connect() as conn:
        inspector = sa_inspect(engine)
        existing_cols = [c["name"] for c in inspector.get_columns("groups")]
        if "invite_token" not in existing_cols:
            conn.execute(text(
                "ALTER TABLE groups ADD COLUMN invite_token VARCHAR(32) DEFAULT ''"
            ))
            import secrets as _sec
            rows = conn.execute(text("SELECT id FROM groups")).fetchall()
            for (gid,) in rows:
                conn.execute(
                    text("UPDATE groups SET invite_token = :tok WHERE id = :gid"),
                    {"tok": _sec.token_urlsafe(16), "gid": gid},
                )
            conn.commit()
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
app.include_router(expenses_router, prefix="/api")app.include_router(invite_router)  # /join/{token} — no /api prefix

@app.get("/health", tags=["ops"])
async def health_check():
    """Lightweight health probe."""
    return {"status": "ok"}


# ── Dev entrypoint ────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
