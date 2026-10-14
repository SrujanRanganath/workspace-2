from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_db_schema():
    """Ensure database schema has non-breaking column updates."""
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            res = conn.execute(text("PRAGMA table_info(test_results)")).fetchall()
            cols = [row[1] for row in res]
            if cols and "verification_type" not in cols:
                conn.execute(text("ALTER TABLE test_results ADD COLUMN verification_type VARCHAR(50) DEFAULT 'Docker Runtime'"))
                conn.commit()
        except Exception:
            pass

