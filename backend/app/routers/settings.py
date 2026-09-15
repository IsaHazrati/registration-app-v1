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

@router.get("/deadline")
def get_deadline(db: Session = Depends(get_db)):
    setting = db.query(crud.models.Setting).first()
    if setting:
        return {"edit_deadline": setting.edit_deadline}
    return {"edit_deadline": None}

@router.put("/deadline")
def update_deadline(deadline: schemas.SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(crud.models.Setting).first()
    if not setting:
        setting = crud.models.Setting()
        db.add(setting)
    
    setting.edit_deadline = deadline.edit_deadline
    db.commit()
    db.refresh(setting)
    return {"message": "تاریخ ویرایش با موفقیت به‌روزرسانی شد", "edit_deadline": setting.edit_deadline}
