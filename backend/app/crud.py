from sqlalchemy.orm import Session, joinedload
from . import models, schemas
from datetime import datetime
from typing import List, Optional

# ========== Product CRUD ==========
def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_products(db: Session, skip: int = 0, limit: int = 100):
    """همه‌ی محصولات (فعال و غیرفعال) — برای پنل مدیریت"""
    return db.query(models.Product).offset(skip).limit(limit).all()

def get_active_products(db: Session, skip: int = 0, limit: int = 100):
    """فقط محصولات فعال — برای نمایش در فرم عمومی"""
    return db.query(models.Product).filter(models.Product.is_active == True).offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate):
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product: schemas.ProductCreate):
    db_product = get_product(db, product_id)
    if db_product:
        for key, value in product.dict().items():
            setattr(db_product, key, value)
        db.commit()
        db.refresh(db_product)
    return db_product

def toggle_product_active(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if db_product:
        db_product.is_active = not db_product.is_active
        db.commit()
        db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if db_product:
        db.delete(db_product)
        db.commit()
    return db_product

# ========== Service Location CRUD (← فیلد جدید: محل خدمت) ==========
def get_service_location(db: Session, service_location_id: int):
    return db.query(models.ServiceLocation).filter(models.ServiceLocation.id == service_location_id).first()

def get_service_locations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.ServiceLocation).order_by(models.ServiceLocation.name).offset(skip).limit(limit).all()

def create_service_location(db: Session, service_location: schemas.ServiceLocationCreate):
    db_obj = models.ServiceLocation(**service_location.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_service_location(db: Session, service_location_id: int, service_location: schemas.ServiceLocationCreate):
    db_obj = get_service_location(db, service_location_id)
    if db_obj:
        for key, value in service_location.dict().items():
            setattr(db_obj, key, value)
        db.commit()
        db.refresh(db_obj)
    return db_obj

def delete_service_location(db: Session, service_location_id: int):
    db_obj = get_service_location(db, service_location_id)
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# ========== Authorized Person CRUD (← فیلد جدید: افراد مجاز به ثبت درخواست) ==========
def get_authorized_person(db: Session, person_id: int):
    return db.query(models.AuthorizedPerson).filter(models.AuthorizedPerson.id == person_id).first()

def get_authorized_person_by_national_code(db: Session, national_code: str):
    return db.query(models.AuthorizedPerson).filter(models.AuthorizedPerson.national_code == national_code).first()

def get_authorized_person_by_personnel_code(db: Session, personnel_code: str):
    return db.query(models.AuthorizedPerson).filter(models.AuthorizedPerson.personnel_code == personnel_code).first()

def get_authorized_persons(db: Session, skip: int = 0, limit: int = 2000):
    return db.query(models.AuthorizedPerson).order_by(models.AuthorizedPerson.first_name).offset(skip).limit(limit).all()

def create_authorized_person(db: Session, person: schemas.AuthorizedPersonCreate):
    db_obj = models.AuthorizedPerson(**person.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_authorized_person(db: Session, person_id: int, person: schemas.AuthorizedPersonUpdate):
    db_obj = get_authorized_person(db, person_id)
    if db_obj:
        for key, value in person.dict(exclude_unset=True).items():
            setattr(db_obj, key, value)
        db.commit()
        db.refresh(db_obj)
    return db_obj

def delete_authorized_person(db: Session, person_id: int):
    db_obj = get_authorized_person(db, person_id)
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

def clear_all_authorized_persons(db: Session):
    count = db.query(models.AuthorizedPerson).delete()
    db.commit()
    return count

def bulk_upsert_authorized_persons(db: Session, rows: List[dict]):
    """
    برای هر ردیف بر اساس کدملی: اگر از قبل وجود داشت، تمام فیلدهایش جایگزین (آپدیت) می‌شود؛
    در غیر این صورت رکورد جدید ایجاد می‌شود. کل عملیات با یک commit در انتها انجام می‌شود
    تا آپلود فایل‌های بزرگ هم سریع باشد.
    برمی‌گرداند: (created_count, updated_count)
    """
    created, updated = 0, 0
    national_codes = [r["national_code"] for r in rows]
    existing_map = {
        p.national_code: p
        for p in db.query(models.AuthorizedPerson)
        .filter(models.AuthorizedPerson.national_code.in_(national_codes))
        .all()
    }
    for r in rows:
        existing = existing_map.get(r["national_code"])
        if existing:
            existing.personnel_code = r.get("personnel_code")
            existing.first_name = r["first_name"]
            existing.last_name = r["last_name"]
            existing.service_location = r.get("service_location")
            existing.service_status = r.get("service_status")
            updated += 1
        else:
            db_obj = models.AuthorizedPerson(**r)
            db.add(db_obj)
            existing_map[r["national_code"]] = db_obj  # اگر همین کدملی دوباره در فایل تکرار شد، آخرین مقدار برنده باشد
            created += 1
    db.commit()
    return created, updated

# ========== Request CRUD ==========
def get_request_by_employee_code(db: Session, employee_code: str):
    return db.query(models.Request).filter(models.Request.employee_code == employee_code).first()

def get_request_by_national_code(db: Session, national_code: str):
    return db.query(models.Request).options(
        joinedload(models.Request.items).joinedload(models.RequestItem.product),
        joinedload(models.Request.service_location)
    ).filter(models.Request.national_code == national_code).first()

def get_requests(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Request).options(
        joinedload(models.Request.items).joinedload(models.RequestItem.product),
        joinedload(models.Request.service_location)  # ← فیلد جدید: محل خدمت
    ).offset(skip).limit(limit).all()

def get_all_requests_with_items(db: Session):
    return db.query(models.Request).options(
        joinedload(models.Request.items).joinedload(models.RequestItem.product),
        joinedload(models.Request.service_location)  # ← فیلد جدید: محل خدمت
    ).all()

def create_request(db: Session, national_code: str, phone_number: str, items: List, person: models.AuthorizedPerson):
    """
    درخواست جدید را بر اساس اطلاعات واکشی‌شده از جدول «افراد مجاز» (نه ورودی کاربر) ایجاد می‌کند
    تا فیلدهای هویتی قابل دستکاری توسط کاربر نباشند.
    """
    full_name = f"{person.first_name} {person.last_name}".strip()
    employee_code = person.personnel_code or person.national_code

    db_request = models.Request(
        national_code=national_code,
        employee_code=employee_code,
        full_name=full_name,
        phone_number=phone_number,
        employment_status=person.service_status or "",
        service_location_text=person.service_location,
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)

    for item in items:
        db_item = models.RequestItem(
            request_id=db_request.id,
            product_id=item.product_id,
            quantity=item.quantity
        )
        db.add(db_item)
    db.commit()
    db.refresh(db_request)
    return db_request

def update_request_by_national_code(db: Session, national_code: str, phone_number: str, items: List, person: Optional[models.AuthorizedPerson]):
    db_request = db.query(models.Request).filter(models.Request.national_code == national_code).first()
    if not db_request:
        return None

    if not db_request.is_editable:
        return None

    setting = db.query(models.Setting).first()
    if setting and setting.edit_deadline:
        if datetime.now() > setting.edit_deadline:
            return None

    db_request.phone_number = phone_number

    # اطلاعات هویتی همیشه از آخرین نسخه‌ی لیست افراد مجاز به‌روزرسانی می‌شود
    # (مثلاً اگر مدیر بعداً محل خدمت فرد را تغییر داده باشد)
    if person:
        db_request.full_name = f"{person.first_name} {person.last_name}".strip()
        db_request.employee_code = person.personnel_code or person.national_code
        db_request.employment_status = person.service_status or ""
        db_request.service_location_text = person.service_location

    db.query(models.RequestItem).filter(models.RequestItem.request_id == db_request.id).delete()
    for item in items:
        db_item = models.RequestItem(
            request_id=db_request.id,
            product_id=item.product_id,
            quantity=item.quantity
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_request)
    return db_request

def delete_request_by_national_code(db: Session, national_code: str):
    db_request = db.query(models.Request).filter(models.Request.national_code == national_code).first()
    if db_request:
        db.delete(db_request)
        db.commit()
    return db_request

def delete_request(db: Session, request_id: int):
    db_request = db.query(models.Request).filter(models.Request.id == request_id).first()
    if db_request:
        db.delete(db_request)
        db.commit()
    return db_request

def clear_all_requests(db: Session):
    count = db.query(models.RequestItem).delete()
    count = db.query(models.Request).delete()
    db.commit()
    return count

def toggle_request_editable(db: Session, request_id: int, is_editable: bool):
    db_request = db.query(models.Request).filter(models.Request.id == request_id).first()
    if db_request:
        db_request.is_editable = is_editable
        db.commit()
        db.refresh(db_request)
    return db_request

def update_admin_description(db: Session, request_id: int, description: str):
    db_request = db.query(models.Request).filter(models.Request.id == request_id).first()
    if db_request:
        db_request.admin_description = description
        db.commit()
        db.refresh(db_request)
    return db_request