from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLALCHEMY_DATABASE_URL = "sqlite:///./restaurant.db"
# mysql+pymysql://user:password@host:port/db_name
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://zooh:123456%40Br123%40%23@localhost/zooh"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
