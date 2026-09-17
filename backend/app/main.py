from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text
from . import models
from .database import SessionLocal, engine
from .models import Admin
from .routers import utils
import os

# ====== ایجاد جدول‌های دیتابیس ======
models.Base.metadata.create_all(bind=engine)

# ====== مهاجرت ساده: افزودن ستون محل خدمت به جدول requests در صورت نبود ======
# (چون از Alembic استفاده نشده، create_all جدول‌های موجود را تغییر نمی‌دهد)
try:
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE requests ADD COLUMN IF NOT EXISTS service_location_id INTEGER REFERENCES service_locations(id)"
        ))
        conn.commit()
    print("✅ ستون service_location_id بررسی/اضافه شد")
except Exception as e:
    print(f"⚠️ خطا در مهاجرت ستون service_location_id: {e}")

# ====== مهاجرت: افزودن فیلد قیمت به محصولات (ریال) ======
try:
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 0"
        ))
        conn.commit()
    print("✅ ستون price بررسی/اضافه شد")
except Exception as e:
    print(f"⚠️ خطا در مهاجرت ستون price: {e}")

# ====== مهاجرت: افزودن واحد اندازه‌گیری و اندازه‌ی بسته به محصولات ======
try:
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_name VARCHAR(50) NOT NULL DEFAULT 'عدد'"
        ))
        conn.execute(text(
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS package_size DOUBLE PRECISION NOT NULL DEFAULT 1"
        ))
        conn.execute(text(
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"
        ))
        conn.commit()
    print("✅ ستون‌های unit_name و package_size بررسی/اضافه شدند")
except Exception as e:
    print(f"⚠️ خطا در مهاجرت ستون‌های unit_name/package_size: {e}")

# ====== مهاجرت: افزودن کدملی (شناسه‌ی جدید درخواست) و محل خدمتِ متنی به جدول requests ======
try:
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE requests ADD COLUMN IF NOT EXISTS national_code VARCHAR(10)"
        ))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_requests_national_code ON requests (national_code)"
        ))
        conn.execute(text(
            "ALTER TABLE requests ADD COLUMN IF NOT EXISTS service_location_text VARCHAR(255)"
        ))
        conn.commit()
    print("✅ ستون‌های national_code و service_location_text بررسی/اضافه شدند")
except Exception as e:
    print(f"⚠️ خطا در مهاجرت ستون‌های national_code/service_location_text: {e}")

app = FastAPI(title="Registration System", version="1.0.0")

# ====== CORS ======
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====== ایجاد ادمین در زمان startup ======
@app.on_event("startup")
def create_default_admin():
    try:
        db = SessionLocal()
        username = "admin"
        password = "admin123"
        
        existing = db.query(Admin).filter(Admin.username == username).first()
        if not existing:
            hashed = utils.hash_password(password)
            admin = Admin(username=username, hashed_password=hashed)
            db.add(admin)
            db.commit()
            print(f"✅ ادمین با نام کاربری '{username}' و رمز '{password}' ایجاد شد")
        else:
            print("ℹ️ ادمین قبلاً وجود دارد")
        db.close()
    except Exception as e:
        print(f"⚠️ خطا در ایجاد ادمین: {e}")

# ================================================
# ====== مسیرهای API ======
# ================================================
from .routers import products, requests, admin, settings, service_locations, authorized_persons

app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(service_locations.router, prefix="/api/service-locations", tags=["service-locations"])  # ← فیلد جدید: محل خدمت
app.include_router(authorized_persons.router, prefix="/api/authorized-persons", tags=["authorized-persons"])  # ← فیلد جدید: افراد مجاز

# ================================================
# ====== مسیر موقت برای ایجاد ادمین ======
# ================================================
@app.get("/create-admin")
async def create_admin_via_browser():
    db = SessionLocal()
    username = "admin"
    password = "admin123"
    
    existing = db.query(Admin).filter(Admin.username == username).first()
    if existing:
        db.close()
        return {"message": "ادمین قبلاً وجود دارد", "username": username}
    
    hashed = utils.hash_password(password)
    admin = Admin(username=username, hashed_password=hashed)
    db.add(admin)
    db.commit()
    db.close()
    
    return {
        "message": f"ادمین با نام کاربری '{username}' و رمز '{password}' ایجاد شد",
        "username": username,
        "password": password
    }

# ================================================
# ====== سرویس‌دهی فایل‌های استاتیک (فرانت‌اند) ======
# ================================================
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    
    css_dir = os.path.join(STATIC_DIR, "css")
    js_dir = os.path.join(STATIC_DIR, "js")
    
    if os.path.exists(css_dir):
        app.mount("/css", StaticFiles(directory=css_dir), name="css")
    if os.path.exists(js_dir):
        app.mount("/js", StaticFiles(directory=js_dir), name="js")
    
    print(f"✅ پوشه‌ی static در مسیر {STATIC_DIR} پیدا شد")
else:
    print(f"❌ پوشه‌ی static در مسیر {STATIC_DIR} پیدا نشد!")

# ================================================
# ====== مسیرهای SPA ======
# ================================================
@app.get("/")
@app.get("/admin/login")
@app.get("/admin/dashboard")
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}

# ====== Fallback برای سایر مسیرها ======
@app.get("/{path:path}")
async def serve_spa(path: str):
    if path.startswith("api/") or path.startswith("admin/"):
        raise HTTPException(status_code=404, detail="Not found")
    
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found"}

# ================================================
# ====== دیباگ: لیست تمام روت‌ها ======
# ================================================
@app.get("/routes")
def list_routes():
    routes = []
    for route in app.routes:
        routes.append({
            "path": route.path,
            "methods": list(route.methods) if hasattr(route, "methods") else []
        })
    return routes