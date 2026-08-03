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
    """Schema migration + table creation on startup."""
    with engine.connect() as conn:
        inspector = sa_inspect(engine)
        tables = inspector.get_table_names()

        # Drop tables with old User-based FK schema so create_all can recreate them
        if "expense_shares" in tables:
            old_cols = [c["name"] for c in inspector.get_columns("expense_shares")]
            if "participant_id" not in old_cols:
                conn.execute(text("DROP TABLE IF EXISTS expense_shares"))
                conn.execute(text("DROP TABLE IF EXISTS expenses"))
                conn.execute(text("DROP TABLE IF EXISTS user_groups"))
                conn.commit()

        # Add invite_token to groups if missing (pre-Participant era tables)
        if "groups" in tables:
            g_cols = [c["name"] for c in inspector.get_columns("groups")]
            if "invite_token" not in g_cols:
                conn.execute(text(
                    "ALTER TABLE groups ADD COLUMN invite_token VARCHAR(32) DEFAULT ''"
                ))
                import secrets as _sec
                rows = conn.execute(text("SELECT id FROM groups")).fetchall()
                for (gid,) in rows:
                    conn.execute(
                        text("UPDATE groups SET invite_token = :tok WHERE id = :gid"),
                        {"tok": _sec.token_urlsafe(12), "gid": gid},
                    )
                conn.commit()

        # Add mp_alias to users if missing
        if "users" in tables:
            u_cols = [c["name"] for c in inspector.get_columns("users")]
            if "mp_alias" not in u_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN mp_alias VARCHAR(100)"))
                conn.commit()

        # Add mp_alias to participants if missing
        if "participants" in tables:
            p_cols = [c["name"] for c in inspector.get_columns("participants")]
            if "mp_alias" not in p_cols:
                conn.execute(text("ALTER TABLE participants ADD COLUMN mp_alias VARCHAR(100)"))
                conn.commit()

        # Add contribution to expense_shares if missing
        if "expense_shares" in tables:
            es_cols = [c["name"] for c in inspector.get_columns("expense_shares")]
            if "contribution" not in es_cols:
                conn.execute(text("ALTER TABLE expense_shares ADD COLUMN contribution FLOAT NOT NULL DEFAULT 0"))
                conn.commit()

        # Add pending_contribution to participants if missing
        if "participants" in tables:
            pc_cols = [c["name"] for c in inspector.get_columns("participants")]
            if "pending_contribution" not in pc_cols:
                conn.execute(text("ALTER TABLE participants ADD COLUMN pending_contribution FLOAT NOT NULL DEFAULT 0"))
                conn.commit()

        # Add host_participant_id to groups if missing
        if "groups" in tables:
            g2_cols = [c["name"] for c in inspector.get_columns("groups")]
            if "host_participant_id" not in g2_cols:
                conn.execute(text("ALTER TABLE groups ADD COLUMN host_participant_id VARCHAR(36)"))
                conn.commit()

    # Create all tables (new ones + recreated ones)
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
        "https://gastos-back-o4ug.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ─────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(expenses_router, prefix="/api")
app.include_router(invite_router)  # already has /api prefix built-in

@app.get("/health", tags=["ops"])
async def health_check():
    """Lightweight health probe."""
    return {"status": "ok"}


# ── Dev entrypoint ────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
