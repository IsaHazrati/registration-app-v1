import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# دریافت آدرس اتصال از متغیر محیطی
DATABASE_URL = os.getenv("DATABASE_URL")

# اگر متغیر محیطی وجود نداشت، از آدرس پیش‌فرض برای محیط محلی استفاده کن
if not DATABASE_URL:
    DATABASE_URL = "postgresql://admin:123456@db/registration_db"

# تبدیل postgres:// به postgresql:// برای سازگاری با SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()