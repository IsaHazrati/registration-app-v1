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

# ====== روت تست برای اطمینان از بارگذاری فایل ======
@router.get("/test")
def test_products_router():
    return {"message": "Products router is working!"}

# ========== روت‌های عمومی ==========
@router.get("/public", response_model=List[schemas.Product])
def get_public_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_products(db, skip=skip, limit=limit)

# ========== روت‌های مدیریت ==========
@router.post("", response_model=schemas.Product)
def create_product(
    product: schemas.ProductCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(verify_admin)
):
    return crud.create_product(db, product)

@router.put("/{product_id}", response_model=schemas.Product)
def update_product(
    product_id: int,
    product: schemas.ProductCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(verify_admin)
):
    db_product = crud.update_product(db, product_id, product)
    if not db_product:
        raise HTTPException(status_code=404, detail="محصول یافت نشد")
    return db_product

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: str = Depends(verify_admin)
):
    db_product = crud.delete_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="محصول یافت نشد")
    return {"message": "محصول با موفقیت حذف شد"}