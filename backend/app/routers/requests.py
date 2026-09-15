from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, schemas
from ..database import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", response_model=schemas.Request)
def create_request(request: schemas.RequestCreate, db: Session = Depends(get_db)):
    person = crud.get_authorized_person_by_national_code(db, request.national_code)
    if not person:
        raise HTTPException(
            status_code=404,
            detail="کد ملی شما در سامانه ثبت نشده است، برای حل مشکل به امور مالی اداره مراجعه نمایید"
        )

    existing = crud.get_request_by_national_code(db, request.national_code)
    if existing:
        raise HTTPException(status_code=400, detail="برای این کدملی قبلاً درخواستی ثبت شده است")

    return crud.create_request(db, request.national_code, request.phone_number, request.items, person)

@router.get("/exists/{national_code}")
def check_request_exists(national_code: str, db: Session = Depends(get_db)):
    """
    بررسی سبک‌وزن و بدون افشای اطلاعات حساس: فقط مشخص می‌کند آیا از قبل درخواستی
    برای این کدملی ثبت شده یا نه؛ برای تصمیم‌گیری بین «ثبت جدید» و «نیاز به تأیید هویت برای ویرایش».
    """
    existing = crud.get_request_by_national_code(db, national_code)
    return {"exists": existing is not None}

@router.post("/verify-edit", response_model=schemas.Request)
def verify_edit(payload: schemas.RequestVerifyEdit, db: Session = Depends(get_db)):
    """
    برای ویرایش یک درخواست قبلی، کاربر باید علاوه بر کدملی، شماره تلفنی که قبلاً با آن
    ثبت‌نام کرده را هم وارد کند تا هویتش تأیید شود. فقط در صورت تطابق، اطلاعات کامل درخواست برگردانده می‌شود.
    """
    db_request = crud.get_request_by_national_code(db, payload.national_code)
    if not db_request:
        raise HTTPException(status_code=404, detail="درخواستی با این کدملی یافت نشد")

    if not db_request.phone_number or db_request.phone_number != payload.phone_number:
        raise HTTPException(status_code=403, detail="شماره تلفن واردشده با شماره ثبت‌شده در سیستم مطابقت ندارد")

    return db_request

@router.put("/{national_code}", response_model=schemas.Request)
def update_request(national_code: str, request: schemas.RequestUpdate, db: Session = Depends(get_db)):
    db_request = crud.get_request_by_national_code(db, national_code)
    if not db_request:
        raise HTTPException(status_code=404, detail="درخواستی با این کدملی یافت نشد")

    if not db_request.phone_number or db_request.phone_number != request.current_phone_number:
        raise HTTPException(status_code=403, detail="شماره تلفن واردشده با شماره ثبت‌شده در سیستم مطابقت ندارد")

    person = crud.get_authorized_person_by_national_code(db, national_code)

    updated = crud.update_request_by_national_code(db, national_code, request.phone_number, request.items, person)
    if updated is None:
        raise HTTPException(status_code=403, detail="امکان ویرایش این درخواست وجود ندارد (مهلت ویرایش به پایان رسیده است)")
    return updated

@router.delete("/{national_code}")
def delete_request(national_code: str, phone_number: str, db: Session = Depends(get_db)):
    db_request = crud.get_request_by_national_code(db, national_code)
    if not db_request:
        raise HTTPException(status_code=404, detail="درخواستی با این کدملی یافت نشد")

    if not db_request.phone_number or db_request.phone_number != phone_number:
        raise HTTPException(status_code=403, detail="شماره تلفن واردشده با شماره ثبت‌شده در سیستم مطابقت ندارد")

    crud.delete_request_by_national_code(db, national_code)
    return {"message": "درخواست با موفقیت حذف شد"}
