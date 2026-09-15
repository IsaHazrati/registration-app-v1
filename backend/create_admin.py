import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Admin
from app.routers import utils

def create_admin():
    db = SessionLocal()
    username = "admin"
    password = "admin123"
    
    existing = db.query(Admin).filter(Admin.username == username).first()
    if existing:
        print("ادمین قبلاً وجود دارد")
        return
    
    hashed = utils.hash_password(password)
    admin = Admin(username=username, hashed_password=hashed)
    db.add(admin)
    db.commit()
    print(f"ادمین با نام کاربری '{username}' و رمز '{password}' ایجاد شد")
    db.close()

if __name__ == "__main__":
    create_admin()