from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import csv
from fastapi.responses import StreamingResponse
from io import StringIO, BytesIO
from .. import crud, schemas, utils
from ..database import SessionLocal
import os
from openpyxl import Workbook

router = APIRouter()
security = HTTPBearer()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_admin(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    username = utils.verify_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="توکن نامعتبر است")
    
    db = SessionLocal()
    admin = db.query(crud.models.Admin).filter(crud.models.Admin.username == username).first()
    db.close()
    if not admin:
        raise HTTPException(status_code=401, detail="ادمین یافت نشد")
    return username

@router.delete("/reset-data")
def reset_data(db: Session = Depends(get_db), admin: str = Depends(verify_admin)):
    """
    پاک‌سازی کامل «لیست افراد مجاز» و «درخواست‌های ثبت‌شده» (بدون دست زدن به محصولات،
    محل‌های خدمت، تنظیمات یا حساب ادمین) — برای شروع دوباره با یک فایل اکسل جدید.
    """
    requests_count = crud.clear_all_requests(db)
    persons_count = crud.clear_all_authorized_persons(db)
    return {
        "message": "دیتابیس با موفقیت پاک‌سازی شد",
        "deleted_requests": requests_count,
        "deleted_persons": persons_count
    }

@router.post("/login", response_model=schemas.AdminToken)
def admin_login(login: schemas.AdminLogin, db: Session = Depends(get_db)):
    admin = db.query(crud.models.Admin).filter(crud.models.Admin.username == login.username).first()
    if not admin:
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور اشتباه است")
    
    if not utils.verify_password(login.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور اشتباه است")
    
    token = utils.create_token(admin.username)
    return {"access_token": token, "token_type": "bearer"}

@router.get("/requests", response_model=List[schemas.Request])
def get_all_requests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), admin: str = Depends(verify_admin)):
    return crud.get_requests(db, skip=skip, limit=limit)

@router.get("/requests/export/csv")
def export_requests_csv(db: Session = Depends(get_db), admin: str = Depends(verify_admin)):
    all_products = crud.get_products(db)
    product_names = [p.name for p in all_products]
    requests = crud.get_all_requests_with_items(db)
    
    output = StringIO()
    writer = csv.writer(output)
    
    headers = ["کدملی", "کد پرسنلی", "نام و نام خانوادگی", "شماره تماس", "وضعیت خدمت", "محل خدمت", "تاریخ ثبت", "توضیحات ادمین"] + product_names + ["مجموع مبلغ (ریال)"]
    writer.writerow(headers)
    
    for req in requests:
        items_dict = {item.product_id: item.quantity for item in req.items}
        total_price = int(round(sum((item.quantity or 0) * (item.product.package_size or 1) * (item.product.price or 0) for item in req.items if item.product)))
        row = [
            req.national_code or "",
            req.employee_code,
            req.full_name,
            req.phone_number or "",
            req.employment_status,
            req.service_location_text or (req.service_location.name if req.service_location else ""),  # ← فیلد جدید: محل خدمت
            req.submitted_at.strftime("%Y-%m-%d %H:%M"),
            req.admin_description or ""
        ]
        for product in all_products:
            row.append(items_dict.get(product.id, 0))
        row.append(total_price)
        writer.writerow(row)
    
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=requests.csv"}
    )
    return response

@router.get("/requests/export/excel")
def export_requests_excel(db: Session = Depends(get_db), admin: str = Depends(verify_admin)):
    all_products = crud.get_products(db)
    product_names = [p.name for p in all_products]
    requests = crud.get_all_requests_with_items(db)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "درخواست‌ها"
    
    headers = ["کدملی", "کد پرسنلی", "نام و نام خانوادگی", "شماره تماس", "وضعیت خدمت", "محل خدمت", "تاریخ ثبت", "توضیحات ادمین"] + product_names + ["مجموع مبلغ (ریال)"]
    ws.append(headers)
    
    for req in requests:
        items_dict = {item.product_id: item.quantity for item in req.items}
        total_price = int(round(sum((item.quantity or 0) * (item.product.package_size or 1) * (item.product.price or 0) for item in req.items if item.product)))
        row = [
            req.national_code or "",
            req.employee_code,
            req.full_name,
            req.phone_number or "",
            req.employment_status,
            req.service_location_text or (req.service_location.name if req.service_location else ""),  # ← فیلد جدید: محل خدمت
            req.submitted_at.strftime("%Y-%m-%d %H:%M"),
            req.admin_description or ""
        ]
        for product in all_products:
            row.append(items_dict.get(product.id, 0))
        row.append(total_price)
        ws.append(row)
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    response = StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=requests.xlsx"}
    )
    return response

@router.delete("/requests/clear-all")
def clear_all_requests(db: Session = Depends(get_db), admin: str = Depends(verify_admin)):
    """
    پاک‌سازی کامل همه‌ی درخواست‌های ثبت‌شده (بدون دست زدن به لیست افراد مجاز،
    محصولات، محل‌های خدمت یا تنظیمات).
    """
    count = crud.clear_all_requests(db)
    return {"message": "همه‌ی درخواست‌ها با موفقیت حذف شدند", "deleted_requests": count}

@router.delete("/requests/{request_id}")
def delete_request(request_id: int, db: Session = Depends(get_db), admin: str = Depends(verify_admin)):
    db_request = crud.delete_request(db, request_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="درخواست یافت نشد")
    return {"message": "درخواست با موفقیت حذف شد"}

@router.put("/requests/{request_id}/toggle-edit")
def toggle_edit(request_id: int, is_editable: bool, db: Session = Depends(get_db), admin: str = Depends(verify_admin)):
    db_request = crud.toggle_request_editable(db, request_id, is_editable)
    if not db_request:
        raise HTTPException(status_code=404, detail="درخواست یافت نشد")
    return {"message": "وضعیت ویرایش به‌روزرسانی شد"}

@router.put("/requests/{request_id}/description")
def update_request_description(
    request_id: int,
    description: str,
    db: Session = Depends(get_db),
    admin: str = Depends(verify_admin)
):
    db_request = crud.update_admin_description(db, request_id, description)
    if not db_request:
        raise HTTPException(status_code=404, detail="درخواست یافت نشد")
    return {
        "message": "توضیحات با موفقیت به‌روزرسانی شد",
        "admin_description": db_request.admin_description
    }