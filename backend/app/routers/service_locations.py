from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..database import SessionLocal
from .admin import verify_admin

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ========== روت‌های عمومی ==========
@router.get("/public", response_model=List[schemas.ServiceLocation])
def get_public_service_locations(db: Session = Depends(get_db)):
    return crud.get_service_locations(db, limit=1000)

# ========== روت‌های مدیریت ==========
@router.post("", response_model=schemas.ServiceLocation)
def create_service_location(
    service_location: schemas.ServiceLocationCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(verify_admin)
):
    return crud.create_service_location(db, service_location)

@router.put("/{service_location_id}", response_model=schemas.ServiceLocation)
def update_service_location(
    service_location_id: int,
    service_location: schemas.ServiceLocationCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(verify_admin)
):
    db_obj = crud.update_service_location(db, service_location_id, service_location)
    if not db_obj:
        raise HTTPException(status_code=404, detail="محل خدمت یافت نشد")
    return db_obj

@router.delete("/{service_location_id}")
def delete_service_location(
    service_location_id: int,
    db: Session = Depends(get_db),
    admin: str = Depends(verify_admin)
):
    db_obj = crud.delete_service_location(db, service_location_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="محل خدمت یافت نشد")
    return {"message": "محل خدمت با موفقیت حذف شد"}
